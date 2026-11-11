import { createHash } from "node:crypto"

/**
 * Bump when a prompt or schema changes in a way that should stop old answers
 * being served. Every cached row keyed under the old version is then a miss.
 */
export const AI_CACHE_VERSION = 1

/** JSON with object keys sorted, so `{a, b}` and `{b, a}` hash the same. */
export function stableStringify(value: unknown): string {
  if (value === undefined) return "null"
  if (value === null || typeof value !== "object") return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`
}

/**
 * The cache key for one AI request: what's being asked (`feature`) and
 * everything the answer depends on (`input`). The provider is left out on
 * purpose: any model's answer to the same question is good enough to reuse.
 */
export function aiCacheKey(feature: string, input: unknown): string {
  return createHash("sha256").update(`${AI_CACHE_VERSION}\u0000${feature}\u0000${stableStringify(input)}`).digest("hex")
}
