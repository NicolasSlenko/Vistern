import { test } from "node:test"
import assert from "node:assert/strict"
import { z } from "zod"

// The demo preview had OPENAI_API_KEY but no HIPERGATOR_API_KEY. The default stayed on
// HiPerGator, the OpenAI SDK filled the missing key from OPENAI_API_KEY, and UF's proxy
// answered every AI request with a 401.
delete process.env.AI_PROVIDER
delete process.env.HIPERGATOR_API_KEY
delete process.env.ANTHROPIC_API_KEY
process.env.OPENAI_API_KEY = "sk-test-not-a-real-key"

test("the default skips a provider whose key isn't set", async () => {
  const ai = await import("../src/lib/ai")
  assert.equal(ai.DEFAULT_AI_PROVIDER, "openai")
  assert.equal(ai.listAiProviders().find((provider) => provider.id === "hipergator")?.available, false)
})

test("a provider with no key fails with its own message instead of borrowing another key", async () => {
  const ai = await import("../src/lib/ai")
  const fetched: string[] = []
  const realFetch = globalThis.fetch
  globalThis.fetch = (async (input: string | URL | Request) => {
    fetched.push(String(input))
    return new Response("{}", { status: 401 })
  }) as typeof fetch
  try {
    await assert.rejects(
      ai.generateObject({ provider: "hipergator", system: "s", prompt: "p", schema: z.object({ ok: z.boolean() }), name: "t" }),
      (error: Error) => error.name === "AiNotConfiguredError" && /HiPerGator/.test(ai.aiErrorMessage(error, "fallback")),
    )
    assert.deepEqual(fetched, [], "no request should reach the proxy")
  } finally {
    globalThis.fetch = realFetch
  }
  assert.equal(ai.aiErrorMessage(new Error("boom"), "Failed to review the bullets"), "Failed to review the bullets")
})
