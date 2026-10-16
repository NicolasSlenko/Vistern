import { NextResponse } from "next/server"
import { auth, clerkClient } from "@clerk/nextjs/server"
import { listObjectsInS3, deleteFromS3 } from "@/lib/aws/s3"
import { createClerkSupabaseServerClient } from "@/lib/supabase/server"

export async function DELETE() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Remove the user's relational data before deleting their identity.
    const supabase = await createClerkSupabaseServerClient()
    for (const table of ["application_events", "saved_jobs", "resume_feedback", "resume_documents", "profile_items", "profile_import_proposals", "student_profiles", "user_preferences", "user_settings", "daily_usage", "course_progress", "legacy_import_state"] as const) {
      const { error } = await supabase.from(table as "application_events").delete().eq("clerk_user_id", userId)
      if (error) throw error
    }

    // Clean up resume binaries and any legacy objects left from the old storage layout.
    const prefix = `uploads/${userId}/`
    const objects = await listObjectsInS3(prefix)

    console.log(`Deleting ${objects.length} S3 objects for user ${userId}`)

    for (const obj of objects) {
      try {
        await deleteFromS3(obj.key)
      } catch (err) {
        console.error(`Failed to delete S3 object: ${obj.key}`, err)
        // Continue deleting remaining objects even if one fails
      }
    }

    // 2. Delete Clerk user account
    const client = await clerkClient()
    await client.users.deleteUser(userId)

    console.log(`Successfully deleted account for user ${userId}`)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting account:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete account" },
      { status: 500 }
    )
  }
}
