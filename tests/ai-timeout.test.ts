import { test } from "node:test"
import assert from "node:assert/strict"
import {
  AI_TIMEOUT_MS,
  AiTimeoutError,
  aiErrorMessage,
  aiErrorStatus,
  isStudentFacingAiError,
  withDeadline,
} from "../src/lib/ai"

test("every AI call gets 30 seconds", () => {
  assert.equal(AI_TIMEOUT_MS, 30_000)
})

test("a call that answers in time is returned as is", async () => {
  assert.equal(await withDeadline(async () => "done", 200), "done")
})

test("a call that never answers stops at the deadline, cancels the request and says why", async () => {
  let seen: AbortSignal | undefined
  const started = Date.now()
  await assert.rejects(
    withDeadline((signal) => {
      seen = signal
      return new Promise(() => {}) // a provider that never replies, and ignores the signal
    }, 50),
    (error: unknown) => error instanceof AiTimeoutError,
  )
  assert.ok(Date.now() - started < 1000, "gave up promptly")
  assert.equal(seen?.aborted, true, "the SDK's signal was aborted")
})

test("a request that rejects because it was aborted still reads as a timeout", async () => {
  await assert.rejects(
    withDeadline(
      (signal) =>
        new Promise((_, reject) => signal.addEventListener("abort", () => reject(new Error("Request was aborted.")))),
      50,
    ),
    (error: unknown) => error instanceof AiTimeoutError,
  )
})

test("other failures pass through unchanged", async () => {
  const boom = new Error("schema mismatch")
  await assert.rejects(withDeadline(async () => { throw boom }, 200), (error: unknown) => error === boom)
})

test("routes show the timeout message with a 504, and keep their own fallback otherwise", () => {
  const timeout = new AiTimeoutError()
  assert.equal(isStudentFacingAiError(timeout), true)
  assert.match(aiErrorMessage(timeout, "fallback"), /30 seconds/)
  assert.equal(aiErrorStatus(timeout), 504)

  const other = new Error("Connection reset by upstream")
  assert.equal(aiErrorMessage(other, "Failed to review the bullets"), "Failed to review the bullets")
  assert.equal(aiErrorStatus(other), 500)
})
