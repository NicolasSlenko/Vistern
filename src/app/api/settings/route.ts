import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getJsonFromS3 } from "@/lib/aws/s3"
import { createClerkSupabaseServerClient } from "@/lib/supabase/server"
import { hasImportedLegacyDataset, markLegacyDatasetImported } from "@/lib/supabase/legacy-import"

interface UserSettings {
  dataSharing: boolean
}

const DEFAULT_SETTINGS: UserSettings = {
  dataSharing: false,
}

const settingsKey = (userId: string) => `uploads/${userId}/settings.json`

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await createClerkSupabaseServerClient()
    const { data: row, error } = await supabase
      .from("user_settings")
      .select("data_sharing")
      .eq("clerk_user_id", userId)
      .maybeSingle()

    if (error) throw error

    if (row) {
      return NextResponse.json({
        success: true,
        data: { dataSharing: row.data_sharing },
      })
    }

    if (await hasImportedLegacyDataset(supabase, userId, "settings")) {
      return NextResponse.json({ success: true, data: DEFAULT_SETTINGS })
    }

    // Transitional read-through: import this user's existing S3 record on first access.
    const legacy = await getJsonFromS3<UserSettings>(settingsKey(userId))
    const settings = legacy ?? DEFAULT_SETTINGS
    if (legacy) {
      const { error: migrationError } = await supabase.from("user_settings").upsert(
        { clerk_user_id: userId, data_sharing: legacy.dataSharing },
        { onConflict: "clerk_user_id" },
      )
      if (migrationError) throw migrationError
    }
    await markLegacyDatasetImported(supabase, userId, "settings", legacy ? 1 : 0)

    return NextResponse.json({
      success: true,
      data: settings,
    })
  } catch (error) {
    console.error("Error loading settings:", error)
    return NextResponse.json(
      { success: false, error: "Failed to load settings" },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const payload = await request.json()

    const settings: UserSettings = {
      dataSharing: typeof payload.dataSharing === "boolean" ? payload.dataSharing : false,
    }

    const supabase = await createClerkSupabaseServerClient()
    const { error } = await supabase.from("user_settings").upsert(
      { clerk_user_id: userId, data_sharing: settings.dataSharing },
      { onConflict: "clerk_user_id" },
    )
    if (error) throw error
    await markLegacyDatasetImported(supabase, userId, "settings", 0)

    return NextResponse.json({
      success: true,
      data: settings,
    })
  } catch (error) {
    console.error("Error saving settings:", error)
    return NextResponse.json(
      { success: false, error: "Failed to save settings" },
      { status: 500 }
    )
  }
}
