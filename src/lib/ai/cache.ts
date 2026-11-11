import { createClerkSupabaseServerClient } from "@/lib/supabase/server"
import type { Json } from "@/lib/supabase/database.types"
import { aiCacheKey } from "./cache-key"

/**
 * Serve an AI answer from the cache when the same question was asked before.
 *
 * `run` does the AI work, *including* `resolveAiProvider`, so a hit costs no
 * tokens and spends none of the user's paid requests. Caching is best effort:
 * if the table can't be read or written, the request just goes to the model.
 * A null result (the model's output failed validation) is never stored.
 */
export async function withAiCache<T>(
  userId: string,
  feature: string,
  input: unknown,
  run: () => Promise<T | null>,
  { ttlDays = 30 }: { ttlDays?: number } = {},
): Promise<{ value: T | null; cached: boolean }> {
  const key = aiCacheKey(feature, input)

  const hit = await readCache<T>(userId, key)
  if (hit !== null) {
    console.log(`[ai] ${feature} cache hit`)
    return { value: hit, cached: true }
  }

  const value = await run()
  if (value !== null && value !== undefined) await writeCache(userId, key, feature, value, ttlDays)
  return { value, cached: false }
}

async function readCache<T>(userId: string, key: string): Promise<T | null> {
  try {
    const supabase = await createClerkSupabaseServerClient()
    const { data, error } = await supabase
      .from("ai_cache")
      .select("result")
      .eq("clerk_user_id", userId)
      .eq("cache_key", key)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle()
    if (error) throw error
    return (data?.result as T | undefined) ?? null
  } catch (error) {
    console.error("[ai] cache read failed, asking the model:", error instanceof Error ? error.message : error)
    return null
  }
}

async function writeCache(userId: string, key: string, feature: string, value: unknown, ttlDays: number) {
  try {
    const supabase = await createClerkSupabaseServerClient()
    const { error } = await supabase.from("ai_cache").upsert({
      clerk_user_id: userId,
      cache_key: key,
      feature,
      result: value as Json,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + ttlDays * 86_400_000).toISOString(),
    })
    if (error) throw error
  } catch (error) {
    console.error("[ai] cache write failed:", error instanceof Error ? error.message : error)
  }
}
