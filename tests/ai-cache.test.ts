import { test } from "node:test"
import assert from "node:assert/strict"
import { aiCacheKey, stableStringify } from "../src/lib/ai/cache-key"

test("key order doesn't change the key", () => {
  assert.equal(aiCacheKey("bullets", { a: 1, b: [1, { y: 2, x: 1 }] }), aiCacheKey("bullets", { b: [1, { x: 1, y: 2 }], a: 1 }))
})

test("a different input or feature is a different key", () => {
  const base = aiCacheKey("bullets", { lines: ["Built an API"] })
  assert.notEqual(base, aiCacheKey("bullets", { lines: ["Built an API."] }))
  assert.notEqual(base, aiCacheKey("tailor", { lines: ["Built an API"] }))
})

test("array order matters, undefined fields don't", () => {
  assert.notEqual(stableStringify([1, 2]), stableStringify([2, 1]))
  assert.equal(stableStringify({ a: 1, b: undefined }), stableStringify({ a: 1 }))
})

test("keys are 64 hex characters, as the table requires", () => {
  assert.match(aiCacheKey("x", null), /^[0-9a-f]{64}$/)
})
