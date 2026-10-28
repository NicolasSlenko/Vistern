import { test } from "node:test"
import assert from "node:assert/strict"
import { z } from "zod"

// On the dev preview, HiPerGator sometimes ran a resume parse to the 8,000-token cap without
// closing the JSON, so "Failed to extract data from resume" came back for a 2k-char resume.
process.env.AI_PROVIDER = "hipergator"
process.env.HIPERGATOR_API_KEY = "hg-test-not-a-real-key"

const completion = (finishReason: "length" | "stop", content: string) =>
  new Response(
    JSON.stringify({
      id: "c", object: "chat.completion", created: 0, model: "gemma-4-31b-it",
      choices: [{ index: 0, finish_reason: finishReason, message: { role: "assistant", content, refusal: null } }],
      usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  )

async function withReplies(replies: Response[], run: (temperatures: unknown[]) => Promise<void>) {
  const temperatures: unknown[] = []
  const realFetch = globalThis.fetch
  globalThis.fetch = (async (_input: string | URL | Request, init?: RequestInit) => {
    temperatures.push(JSON.parse(String(init?.body)).temperature)
    return replies.shift() ?? completion("length", "{")
  }) as typeof fetch
  try {
    await run(temperatures)
  } finally {
    globalThis.fetch = realFetch
  }
}

const options = { provider: "hipergator" as const, system: "s", prompt: "p", schema: z.object({ ok: z.boolean() }), name: "t", temperature: 0 }

test("a reply cut off at the output cap is retried once, warmer", async () => {
  const ai = await import("../src/lib/ai")
  await withReplies([completion("length", '{"ok": tr'), completion("stop", '{"ok": true}')], async (temperatures) => {
    const result = await ai.generateObject(options)
    assert.deepEqual(result.data, { ok: true })
    assert.deepEqual(temperatures, [0, 0.4])
  })
})

test("a second cut-off reply still fails rather than retrying forever", async () => {
  const ai = await import("../src/lib/ai")
  await withReplies([], async (temperatures) => {
    await assert.rejects(ai.generateObject(options), /length limit/)
    assert.equal(temperatures.length, 2)
  })
})
