import { test } from "node:test"
import assert from "node:assert/strict"
import { bodyLimitViolation, MAX_JSON_BODY_BYTES } from "../src/lib/http/body-limit"

const len = (n: number) => String(n)

test("lets an ordinary JSON body through", () => {
  assert.equal(bodyLimitViolation("/api/resume", "POST", len(40_000), null), null)
  assert.equal(bodyLimitViolation("/api/resume", "POST", len(MAX_JSON_BODY_BYTES), null), null)
})

test("refuses a body over the limit with 413", () => {
  assert.equal(bodyLimitViolation("/api/career", "PATCH", len(MAX_JSON_BODY_BYTES + 1), null)?.status, 413)
})

test("refuses a chunked body with no length, and a nonsense length, with 411", () => {
  assert.equal(bodyLimitViolation("/api/preferences", "POST", null, "chunked")?.status, 411)
  assert.equal(bodyLimitViolation("/api/preferences", "POST", "abc", null)?.status, 411)
})

test("a POST with no body at all is fine", () => {
  assert.equal(bodyLimitViolation("/api/match-live", "POST", null, null), null)
  assert.equal(bodyLimitViolation("/api/match-live", "POST", "0", null), null)
})

test("leaves the file upload route, reads, and pages alone", () => {
  assert.equal(bodyLimitViolation("/api/upload", "POST", len(9 * 1024 * 1024), null), null)
  assert.equal(bodyLimitViolation("/api/resume", "GET", len(MAX_JSON_BODY_BYTES * 5), null), null)
  assert.equal(bodyLimitViolation("/resumes", "POST", len(MAX_JSON_BODY_BYTES * 5), null), null)
})

test("does not treat a route that merely starts with 'upload' as the upload route", () => {
  assert.equal(bodyLimitViolation("/api/uploads-metadata", "POST", len(MAX_JSON_BODY_BYTES + 1), null)?.status, 413)
})
