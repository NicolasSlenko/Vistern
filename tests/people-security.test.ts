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

// What Supabase provides: the two API roles and auth.jwt() from the request's token.
const SUPABASE_STUB = `
  create role anon nologin;
  create role authenticated nologin;
  create schema auth;
  create function auth.jwt() returns jsonb language sql stable as
    $$ select nullif(current_setting('request.jwt.claims', true), '')::jsonb $$;
  grant usage on schema auth to anon, authenticated;
  grant usage on schema public to anon, authenticated;
`

let db: PGlite

/** Run SQL as a signed-in student (or as `anon` with no token). */
async function as<T = Record<string, unknown>>(who: "alice" | "bob" | "anon", sql: string, params: unknown[] = []) {
  await db.exec("reset role")
  await db.query("select set_config('request.jwt.claims', $1, false)", [who === "anon" ? "" : JSON.stringify({ sub: who, role: "authenticated" })])
  await db.exec(`set role ${who === "anon" ? "anon" : "authenticated"}`)
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

  await as("alice", `insert into public_profiles (clerk_user_id, listed, card) values ('alice', true, '{"name":"Alice"}')`)
  await as("bob", `insert into public_profiles (clerk_user_id, listed, card, sharing) values ('bob', false, '{"name":"Bob","email":"bob@ufl.edu"}', '{"headline":"secret"}')`)
  await as("alice", `insert into ai_cache (clerk_user_id, cache_key, feature, result, expires_at) values ('alice', repeat('a', 64), 'bullets', '{"rewrites":["alice private"]}', now() + interval '1 day')`)
})

after(async () => {
  await db?.close()
})

describe("public_profiles RLS", () => {
  test("a stranger without a token reads nothing", async () => {
    await rejects(as("anon", "select * from public_profiles"), /permission denied/)
  })

  test("a hidden card is invisible to everyone but its owner", async () => {
    const seenByAlice = await as("alice", "select clerk_user_id from public_profiles where clerk_user_id = 'bob'")
    assert.equal(seenByAlice.rows.length, 0)
    const seenByBob = await as("bob", "select clerk_user_id from public_profiles where clerk_user_id = 'bob'")
    assert.equal(seenByBob.rows.length, 1)
  })

  test("a listed card is readable by other signed-in students", async () => {
    const rows = await as("bob", "select card from public_profiles where listed")
    assert.deepEqual(rows.rows, [{ card: { name: "Alice" } }])
  })

  test("filters can't widen what's readable (no listed=false leak)", async () => {
    const rows = await as("alice", "select clerk_user_id from public_profiles where listed = false or true")
    assert.deepEqual(rows.rows.map((row) => row.clerk_user_id), ["alice"])
  })

  test("you can't create a card in someone else's name", async () => {
    await rejects(
      as("alice", `insert into public_profiles (clerk_user_id, listed, card) values ('mallory-victim', true, '{"name":"Fake"}')`),
      /row-level security/,
    )
  })

  test("you can't edit, list, hijack or delete another student's card", async () => {
    const update = await as("alice", "update public_profiles set listed = true where clerk_user_id = 'bob'")
    assert.equal(update.affectedRows, 0)
    const listedUpdate = await as("bob", `update public_profiles set card = '{"name":"pwned"}' where clerk_user_id = 'alice'`)
    assert.equal(listedUpdate.affectedRows, 0)
    const remove = await as("bob", "delete from public_profiles where clerk_user_id = 'alice'")
    assert.equal(remove.affectedRows, 0)
    const upsert = as("bob", `insert into public_profiles (clerk_user_id, card) values ('alice', '{"name":"pwned"}') on conflict (clerk_user_id) do update set card = excluded.card`)
    await rejects(upsert, /row-level security/)
    const alice = await as("alice", "select card from public_profiles where clerk_user_id = 'alice'")
    assert.deepEqual(alice.rows, [{ card: { name: "Alice" } }])
  })

  test("you can't hand your row to someone else", async () => {
    await rejects(as("alice", "update public_profiles set clerk_user_id = 'bob' where clerk_user_id = 'alice'"), /row-level security|duplicate key/)
    await rejects(as("alice", "update public_profiles set clerk_user_id = 'carol' where clerk_user_id = 'alice'"), /row-level security/)
  })

  test("unlisting hides a card at once", async () => {
    await as("alice", "update public_profiles set listed = false where clerk_user_id = 'alice'")
    const rows = await as("bob", "select 1 from public_profiles where clerk_user_id = 'alice'")
    assert.equal(rows.rows.length, 0)
    await as("alice", "update public_profiles set listed = true where clerk_user_id = 'alice'")
  })

  test("non-object card or sharing values are refused by the table", async () => {
    await rejects(as("alice", `update public_profiles set card = '"<script>"' where clerk_user_id = 'alice'`), /check constraint/)
    await rejects(as("alice", `update public_profiles set sharing = '[]' where clerk_user_id = 'alice'`), /check constraint/)
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
