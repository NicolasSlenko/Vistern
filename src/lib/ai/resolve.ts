import { createClerkSupabaseServerClient } from "@/lib/supabase/server"
import { checkAndIncrementLimit } from "@/lib/usageLimits"
import { DEFAULT_AI_PROVIDER, hasApiKey, isAiProvider, isPaidProvider, listAiProviders, type AiProvider } from "./index"

/** The day's paid AI requests are used up and no free provider is configured. */
export class AiLimitReachedError extends Error {
  constructor() {
    super("You've used today's AI requests. They reset tomorrow.")
    this.name = "AiLimitReachedError"
  }
}

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
  if (allowed) return { provider: chosen, fellBack: false }
  // Over the paid limit, HiPerGator takes over when it's set up. Without it there's no
  // free provider to fall back to, so the limit holds.
  if (hasApiKey("hipergator")) return { provider: "hipergator", fellBack: true }
  throw new AiLimitReachedError()
}
