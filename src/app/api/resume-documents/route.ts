import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { createClerkSupabaseServerClient } from "@/lib/supabase/server"
import { importLegacyResumeSubmissions } from "@/lib/supabase/resume-documents"

/**
 * The student's resume documents: the files they've uploaded or tailored.
 *
 * These are deliberately separate from the master profile (/api/profile).
 * The profile is the one true record of what they've done; a resume document
 * is one telling of it, aimed at one kind of job, and a student keeps
 * several. Editing a resume never changes the profile.
 */
export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    const supabase = await createClerkSupabaseServerClient()
    await importLegacyResumeSubmissions(supabase, userId)
    const { data, error } = await supabase
      .from("resume_documents")
      .select("id,file_name,s3_object_key,content_type,created_at,updated_at,score,is_starred,is_current,source_type,target_role,status")
      .eq("clerk_user_id", userId)
      .neq("status", "archived")
      .order("is_current", { ascending: false })
      .order("updated_at", { ascending: false })
    if (error) throw error

    return NextResponse.json({
      success: true,
      data: (data ?? []).map((row) => ({
        id: row.id,
        fileName: row.file_name || "Untitled resume",
        s3Key: row.s3_object_key,
        contentType: row.content_type,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        score: row.score ?? 0,
        isStarred: row.is_starred,
        isCurrent: row.is_current,
        sourceType: row.source_type,
        targetRole: row.target_role,
        status: row.status,
      })),
    })
  } catch (error) {
    console.error("Error listing resume documents:", error)
    return NextResponse.json({ success: false, error: "Failed to list resumes" }, { status: 500 })
  }
}
