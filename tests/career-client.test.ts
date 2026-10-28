import { test } from "node:test"
import assert from "node:assert/strict"
import { saveWorkspace } from "../src/components/student/career/save-workspace"
import { projectDraft } from "../src/lib/career/templates"
import {
  workspaceSchema,
  type WorkspaceUpdate,
} from "../src/lib/career/workspace"

const update: WorkspaceUpdate = {
  intent: "create",
  revision: 0,
  activity: { ...projectDraft("existing"), title: "Extend a class project" },
}

test("career saves return validated server state", async (t) => {
  const saved = workspaceSchema.parse({ revision: 1 })
  t.mock.method(globalThis, "fetch", async (_url, options) => {
    assert.deepEqual(JSON.parse(String(options?.body)), update)
    return Response.json({ success: true, data: saved })
  })
  assert.deepEqual(await saveWorkspace(update), saved)
})

test("career save conflicts retain the server's recovery message", async (t) => {
  t.mock.method(globalThis, "fetch", async () =>
    Response.json(
      { error: "Reload your plan before saving." },
      { status: 409 },
    ),
  )
  await assert.rejects(saveWorkspace(update), /Reload your plan before saving/)
})

test("career saves reject malformed responses with a useful retry message", async (t) => {
  for (const response of [
    new Response("Service unavailable", { status: 503 }),
    Response.json(null),
    Response.json({ success: true, data: { revision: -1 } }),
    Response.json({ error: { internal: "private detail" } }, { status: 500 }),
  ]) {
    const mock = t.mock.method(globalThis, "fetch", async () => response)
    await assert.rejects(
      saveWorkspace(update),
      /Keep this page open and try again/,
    )
    mock.mock.restore()
  }
})

test("career saves handle a lost connection without changing the submitted activity", async (t) => {
  const original = structuredClone(update)
  t.mock.method(globalThis, "fetch", async () => {
    throw new TypeError("Failed to fetch")
  })
  await assert.rejects(
    saveWorkspace(update),
    /Keep this page open and try again/,
  )
  assert.deepEqual(update, original)
})
