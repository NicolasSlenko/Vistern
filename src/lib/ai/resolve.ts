import { createClerkSupabaseServerClient } from "@/lib/supabase/server"
import { checkAndIncrementLimit } from "@/lib/usageLimits"
import { DEFAULT_AI_PROVIDER, isAiProvider, isPaidProvider, listAiProviders, type AiProvider } from "./index"

/** The provider the user picked in Settings, or null if they never chose (or it isn't configured). */
export async function getChosenAiProvider(userId: string): Promise<AiProvider | null> {
  const supabase = await createClerkSupabaseServerClient()
  const { data, error } = await supabase
    .from("user_settings")
    .select("ai_provider")
    .eq("clerk_user_id", userId)
    .maybeSingle()
  if (error) {
    // e.g. the ai_provider migration isn't applied yet; AI features keep working on the default.
    console.error("Couldn't read the user's AI provider, using the default:", error.message)
    return null
  }

  const chosen = data?.ai_provider
  if (!isAiProvider(chosen)) return null
  const available = listAiProviders().some(p => p.id === chosen && p.available)
  return available ? chosen : null
}

/**
 * Picks the provider for one user request. Call it once per request, right before the AI
 * work (after any cache hit), because a paid provider uses up one of the user's daily
 * paid requests. Over the limit, the request falls back to HiPerGator instead of failing.
 */
export async function resolveAiProvider(userId: string): Promise<{ provider: AiProvider; fellBack: boolean }> {
  const chosen = (await getChosenAiProvider(userId)) ?? DEFAULT_AI_PROVIDER
  if (!isPaidProvider(chosen)) return { provider: chosen, fellBack: false }

  const { allowed } = await checkAndIncrementLimit(userId, "paidAi")
  return allowed ? { provider: chosen, fellBack: false } : { provider: "hipergator", fellBack: true }
}
