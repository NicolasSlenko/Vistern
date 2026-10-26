import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { DEFAULT_AI_PROVIDER, isAiProvider, listAiProviders } from "@/lib/ai"
import { getChosenAiProvider } from "@/lib/ai/resolve"
import { createClerkSupabaseServerClient } from "@/lib/supabase/server"
import { getUsageSummary } from "@/lib/usageLimits"

// GET - Providers the user can pick, their current choice, and today's paid-request usage
export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const [chosen, usage] = await Promise.all([getChosenAiProvider(userId), getUsageSummary(userId)])

    return NextResponse.json({
      success: true,
      data: {
        providers: listAiProviders(),
        defaultProvider: DEFAULT_AI_PROVIDER,
        selectedProvider: chosen ?? DEFAULT_AI_PROVIDER,
        paidUsage: usage.paidAi,
      },
    })
  } catch (error) {
    console.error("Error loading AI provider:", error)
    return NextResponse.json({ success: false, error: "Failed to load AI provider" }, { status: 500 })
  }
}

// PUT - Save the user's provider choice ({ provider: "hipergator" | "openai" | "claude" })
export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const { provider } = await request.json()
    const available = listAiProviders().some(p => p.id === provider && p.available)
    if (!isAiProvider(provider) || !available) {
      return NextResponse.json({ success: false, error: "That AI provider isn't available" }, { status: 400 })
    }

    // Upsert only ai_provider so other settings (e.g. data sharing) are left untouched.
    const supabase = await createClerkSupabaseServerClient()
    const { error } = await supabase
      .from("user_settings")
      .upsert({ clerk_user_id: userId, ai_provider: provider }, { onConflict: "clerk_user_id" })
    if (error) throw error

    return NextResponse.json({ success: true, data: { selectedProvider: provider } })
  } catch (error) {
    console.error("Error saving AI provider:", error)
    return NextResponse.json({ success: false, error: "Failed to save AI provider" }, { status: 500 })
  }
}
