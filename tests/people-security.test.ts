/**
 * Attacks on Community → People and the AI cache.
 *
 * Threat model: any signed-in student holds a Supabase JWT and the public
 * publishable key, so they can skip every API route and talk to the tables
 * directly. These tests run the real migration SQL in an in-memory Postgres
 * (PGlite) with Supabase's roles, and act as two students and a stranger.
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { after, before, describe, test } from "node:test"
import { PGlite } from "@electric-sql/pglite"
import { pickCard, publicCardSchema, sharingSchema, cardSource } from "../src/lib/community/public-card"
import { getResumeObject } from "../src/app/api/parse/resumeSchema"

const MIGRATIONS = [
  "supabase/migrations/20261106120000_ai_response_cache.sql",
  "supabase/migrations/20261118120000_public_profiles.sql",
]

// What Supabase provides: the API roles and auth.jwt() from the request's token.
const SUPABASE_STUB = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema auth;
  create function auth.jwt() returns jsonb language sql stable as
    $$ select nullif(current_setting('request.jwt.claims', true), '')::jsonb $$;
  grant usage on schema auth to anon, authenticated, service_role;
  grant usage on schema public to anon, authenticated, service_role;
`

let db: PGlite
type Who = "alice" | "bob" | "anon" | "tokenless" | "server"

/** Run SQL as a signed-in student, a caller with no token, or the server's secret key. */
async function as<T = Record<string, unknown>>(who: Who, sql: string, params: unknown[] = []) {
  await db.exec("reset role")
  const claims = who === "alice" || who === "bob" ? JSON.stringify({ sub: who, role: "authenticated" }) : ""
  await db.query("select set_config('request.jwt.claims', $1, false)", [claims])
  const role = { alice: "authenticated", bob: "authenticated", tokenless: "authenticated", anon: "anon", server: "service_role" }[who]
  await db.exec(`set role ${role}`)
  try {
    return await db.query<T>(sql, params)
  } finally {
    await db.exec("reset role")
  }
}

async function rejects(promise: Promise<unknown>, pattern: RegExp) {
  await assert.rejects(promise, (error: Error) => pattern.test(error.message))
}

before(async () => {
  db = await PGlite.create()
  await db.exec(SUPABASE_STUB)
  for (const file of MIGRATIONS) await db.exec(readFileSync(file, "utf8"))

  // Cards are written by the server only, as saveMySharing does.
  await as("server", `insert into public_profiles (clerk_user_id, listed, card) values ('alice', true, '{"name":"Alice","verified":"ufl.edu"}')`)
  await as("server", `insert into public_profiles (clerk_user_id, listed, card, sharing) values ('bob', false, '{"name":"Bob","email":"bob@ufl.edu"}', '{"headline":"secret"}')`)
  await as("alice", `insert into ai_cache (clerk_user_id, cache_key, feature, result, expires_at) values ('alice', repeat('a', 64), 'bullets', '{"rewrites":["alice private"]}', now() + interval '1 day')`)
})

after(async () => {
  await db?.close()
})

describe("public_profiles: nobody but the server writes", () => {
  test("a student can't create a card, not even their own", async () => {
    await rejects(as("alice", `insert into public_profiles (clerk_user_id, card) values ('alice', '{"name":"Alice"}')`), /permission denied/)
    await rejects(as("alice", `insert into public_profiles (clerk_user_id, card) values ('carol', '{"name":"Carol"}')`), /permission denied/)
  })

  test("a student can't forge their own card (name, badge, listing)", async () => {
    await rejects(as("alice", `update public_profiles set card = '{"name":"The Dean","verified":"ufl.edu"}' where clerk_user_id = 'alice'`), /permission denied/)
    await rejects(as("bob", "update public_profiles set listed = true where clerk_user_id = 'bob'"), /permission denied/)
    await rejects(
      as("bob", `insert into public_profiles (clerk_user_id, card) values ('bob', '{"name":"x"}') on conflict (clerk_user_id) do update set card = excluded.card`),
      /permission denied/,
    )
  })

  test("a student can't touch another student's card", async () => {
    await rejects(as("bob", `update public_profiles set card = '{"name":"pwned"}' where clerk_user_id = 'alice'`), /permission denied/)
    const remove = await as("bob", "delete from public_profiles where clerk_user_id = 'alice'")
    assert.equal(remove.affectedRows, 0)
    const alice = await as("server", "select card from public_profiles where clerk_user_id = 'alice'")
    assert.deepEqual(alice.rows, [{ card: { name: "Alice", verified: "ufl.edu" } }])
  })

  test("a student can delete their own card (unlist, account deletion)", async () => {
    const mine = await as("bob", "delete from public_profiles where clerk_user_id = 'bob'")
    assert.equal(mine.affectedRows, 1)
    await as("server", `insert into public_profiles (clerk_user_id, listed, card, sharing) values ('bob', false, '{"name":"Bob","email":"bob@ufl.edu"}', '{"headline":"secret"}')`)
  })

  test("the table refuses non-object card or sharing values, even from the server", async () => {
    await rejects(as("server", `update public_profiles set card = '"<script>"' where clerk_user_id = 'alice'`), /check constraint/)
    await rejects(as("server", `update public_profiles set sharing = '[]' where clerk_user_id = 'alice'`), /check constraint/)
  })
})

describe("public_profiles: what other students can read", () => {
  test("nobody reads the table for anyone else's row, listed or not", async () => {
    for (const target of ["alice", "bob"]) {
      const rows = await as(target === "alice" ? "bob" : "alice", "select * from public_profiles where clerk_user_id = $1", [target])
      assert.equal(rows.rows.length, 0, `read ${target}'s row`)
    }
    const all = await as("bob", "select clerk_user_id from public_profiles")
    assert.deepEqual(all.rows, [{ clerk_user_id: "bob" }])
  })

  test("the directory returns listed cards with no Clerk id and no sharing choices", async () => {
    const rows = await as<Record<string, unknown>>("bob", "select * from list_people(300)")
    assert.equal(rows.rows.length, 1)
    assert.deepEqual(Object.keys(rows.rows[0]).sort(), ["card", "id", "updated_at"])
    assert.deepEqual(rows.rows[0].card, { name: "Alice", verified: "ufl.edu" })
  })

  test("the directory never shows a hidden card", async () => {
    const rows = await as("alice", "select card from list_people(300)")
    assert.ok(!JSON.stringify(rows.rows).includes("Bob"))
  })

  test("the directory is closed to callers without a token", async () => {
    await rejects(as("anon", "select * from list_people(300)"), /permission denied/)
    await rejects(as("anon", "select * from public_profiles"), /permission denied/)
    const tokenless = await as("tokenless", "select * from list_people(300)")
    assert.equal(tokenless.rows.length, 0)
  })

  test("a huge limit is clamped", async () => {
    const rows = await as("bob", "select * from list_people(2147483647)")
    assert.ok(rows.rows.length <= 500)
  })

  test("unlisting hides a card at once", async () => {
    await as("server", "update public_profiles set listed = false where clerk_user_id = 'alice'")
    assert.equal((await as("bob", "select * from list_people(300)")).rows.length, 0)
    await as("server", "update public_profiles set listed = true where clerk_user_id = 'alice'")
  })
})

describe("ai_cache RLS", () => {
  test("another student can't read your cached AI answers", async () => {
    const rows = await as("bob", "select result from ai_cache")
    assert.equal(rows.rows.length, 0)
  })

  test("another student can't poison your cache", async () => {
    await rejects(
      as("bob", `insert into ai_cache (clerk_user_id, cache_key, feature, result, expires_at) values ('alice', repeat('b', 64), 'bullets', '{}', now() + interval '1 day')`),
      /row-level security/,
    )
    const overwrite = await as("bob", `update ai_cache set result = '{"rewrites":["evil"]}' where clerk_user_id = 'alice'`)
    assert.equal(overwrite.affectedRows, 0)
  })

  test("a stranger can't touch the cache", async () => {
    await rejects(as("anon", "select * from ai_cache"), /permission denied/)
  })
})

describe("hostile cards written straight to the table", () => {
  // A student can store any JSON in their own `card`. Every read runs it
  // through publicCardSchema, so these must all be refused there.
  const hostile: [string, unknown][] = [
    ["javascript: link", { name: "x", links: { github: "javascript:alert(document.cookie)" } }],
    ["data: link", { name: "x", links: { portfolio: "data:text/html,<script>alert(1)</script>" } }],
    ["link with no host", { name: "x", links: { linkedin: "https://localhost/" } }],
    ["tracking-pixel photo", { name: "x", photo: "https://evil.example/pixel.gif" }],
    ["http photo on the right host", { name: "x", photo: "http://img.clerk.com/a.png" }],
    ["lookalike photo host", { name: "x", photo: "https://img.clerk.com.evil.example/a.png" }],
    ["mailto with a payload", { name: "x", email: "a@b.co?subject=hi&body=click" }],
    ["mailto with a second address", { name: "x", email: "a@b.co,victim@b.co" }],
    ["huge name", { name: "x".repeat(10_000) }],
    ["empty name", { name: "" }],
    ["too many skills", { name: "x", skills: Array.from({ length: 500 }, (_, i) => `s${i}`) }],
    ["not an object", "<img src=x onerror=alert(1)>"],
  ]
  for (const [label, card] of hostile) {
    test(`refuses ${label}`, () => {
      assert.equal(publicCardSchema.safeParse(card).success, false)
    })
  }

  test("drops fields the card doesn't have, like a phone number", () => {
    const parsed = publicCardSchema.parse({ name: "x", phone: "352-555-0100", gpa: 4, clerk_user_id: "bob" })
    assert.deepEqual(parsed, { name: "x" })
  })

  test("keeps a real account photo and real links", () => {
    const card = { name: "x", photo: "https://img.clerk.com/abc.png", links: { github: "https://github.com/x" }, email: "x@ufl.edu" }
    assert.equal(publicCardSchema.safeParse(card).success, true)
  })
})

describe("the sharing API's input", () => {
  test("can't smuggle a card or another user's id through PUT", () => {
    const base = { listed: true, nameStyle: "full", headline: "", fields: [] }
    assert.equal(sharingSchema.safeParse({ ...base, card: { name: "pwned" } }).success, false)
    assert.equal(sharingSchema.safeParse({ ...base, clerk_user_id: "bob" }).success, false)
    assert.equal(sharingSchema.safeParse({ ...base, fields: ["phone"] }).success, false)
    assert.equal(sharingSchema.safeParse({ ...base, headline: "x".repeat(141) }).success, false)
  })

  test("a hostile profile can't push a bad link or photo onto the card", () => {
    const resume = getResumeObject()
    resume.basics = { ...resume.basics, name: "Eve", github: "javascript:alert(1)", portfolio: "data:text/html,x", email: "e@x.co?bcc=all@x.co" }
    const source = cardSource(resume, null, { imageUrl: "https://evil.example/p.gif", hasImage: true })
    const card = pickCard(source, { listed: true, nameStyle: "full", headline: "", fields: ["links", "photo", "email"] })
    assert.deepEqual(card, { name: "Eve" })
  })
})
