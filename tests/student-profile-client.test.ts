import { test } from "node:test"
import assert from "node:assert/strict"
import { saveProfile } from "../src/components/student/save-profile"
import { studentProfileSchema } from "../src/lib/student-profile"

test("the client returns the saved profile from a successful response", async (t) => {
  const profile = studentProfileSchema.parse({ completed: true, focus: "build" })
  t.mock.method(globalThis, "fetch", async () => Response.json({ success: true, data: profile }))
  assert.deepEqual(await saveProfile({ intent: "focus", focus: "build" }), profile)
})

test("the client keeps actionable server errors", async (t) => {
  t.mock.method(globalThis, "fetch", async () =>
    Response.json({ success: false, error: "Please sign in again." }, { status: 401 }),
  )
  await assert.rejects(saveProfile({ intent: "focus", focus: "build" }), /Please sign in again/)
})

test("the client rejects malformed responses without leaking parsing errors", async (t) => {
  for (const response of [
    new Response("Service unavailable", { status: 503 }),
    Response.json(null),
    Response.json({ success: true, data: { focus: "invalid" } }),
    Response.json({ success: false, error: { internal: "private detail" } }),
  ]) {
    const mock = t.mock.method(globalThis, "fetch", async () => response)
    await assert.rejects(saveProfile({ intent: "focus", focus: "build" }), /Please try again/)
    mock.mock.restore()
  }
})

test("the client gives a retry message when the connection fails", async (t) => {
  t.mock.method(globalThis, "fetch", async () => {
    throw new TypeError("Failed to fetch")
  })
  await assert.rejects(saveProfile({ intent: "focus", focus: null }), /Please try again/)
})
