import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getJsonFromS3 } from "@/lib/aws/s3"
import { questionnaireSchema, type QuestionnaireData } from "@/app/questionnaire/data"
import { createClerkSupabaseServerClient } from "@/lib/supabase/server"
import { hasImportedLegacyDataset, markLegacyDatasetImported } from "@/lib/supabase/legacy-import"

const preferencesKey = (userId: string) => `uploads/${userId}/preferences.json`

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ success: false, data: null, error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await createClerkSupabaseServerClient()
    const { data: row, error } = await supabase
      .from("user_preferences")
      .select("preferences")
      .eq("clerk_user_id", userId)
      .maybeSingle()

    if (error) throw error

    if (row) {
      return NextResponse.json({ success: true, data: row.preferences as QuestionnaireData })
    }

    if (await hasImportedLegacyDataset(supabase, userId, "preferences")) {
      return NextResponse.json({ success: true, data: null })
    }

    // Transitional read-through: import this user's existing S3 record on first access.
    const legacy = await getJsonFromS3<QuestionnaireData>(preferencesKey(userId))
    if (legacy) {
      const { error: migrationError } = await supabase.from("user_preferences").upsert(
        { clerk_user_id: userId, preferences: legacy },
        { onConflict: "clerk_user_id" },
      )
      if (migrationError) throw migrationError
    }
    await markLegacyDatasetImported(supabase, userId, "preferences", legacy ? 1 : 0)

    return NextResponse.json({
      success: true,
      data: legacy,
    })
  } catch (error) {
    console.error("Error loading preferences:", error)
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: "Failed to load preferences",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const payload = await request.json()
    const preferences = questionnaireSchema.parse(payload)

    const supabase = await createClerkSupabaseServerClient()
    const { error } = await supabase.from("user_preferences").upsert(
      { clerk_user_id: userId, preferences },
      { onConflict: "clerk_user_id" },
    )
    if (error) throw error
    await markLegacyDatasetImported(supabase, userId, "preferences", 0)

    return NextResponse.json({
      success: true,
      message: "Preferences saved successfully",
    })
  } catch (error) {
    console.error("Error saving preferences:", error)
    const status = error instanceof Error && "issues" in error ? 400 : 500

    return NextResponse.json(
      {
        success: false,
        error: status === 400 ? "Invalid preferences payload" : "Failed to save preferences",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status },
    )
  }
}
