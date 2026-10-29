import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { createClerkSupabaseServerClient } from "@/lib/supabase/server"
import { getOrCreateProfileId, importLegacyResumeSubmissions } from "@/lib/supabase/resume-documents"
import { normalizeProfileData } from "@/lib/profile/profile-data"
import { calculateResumeScoreDetailed } from "@/lib/resumeScoring"
import type { Json } from "@/lib/supabase/database.types"

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

/**
 * Put a new resume on the shelf from structured content alone — the general
 * resume generated from the master profile. It's a snapshot: from here on it
 * is edited apart from the profile, like every other document.
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    const body = (await request.json()) as { content?: unknown; fileName?: string; targetRole?: string | null }
    if (!body.content || typeof body.content !== "object") {
      return NextResponse.json({ success: false, error: "Nothing to save" }, { status: 400 })
    }
    const content = normalizeProfileData(body.content)
    const fileName = typeof body.fileName === "string" && body.fileName.trim() ? body.fileName.trim() : "General resume"

    const supabase = await createClerkSupabaseServerClient()
    const profileId = await getOrCreateProfileId(supabase, userId)
    const { data, error } = await supabase
      .from("resume_documents")
      .insert({
        profile_id: profileId,
        clerk_user_id: userId,
        source_type: "generated",
        file_name: fileName,
        target_role: typeof body.targetRole === "string" ? body.targetRole : null,
        structured_content: content as unknown as Json,
        score: Math.round(calculateResumeScoreDetailed(content).totalScore),
        status: "ready",
        is_current: false,
      })
      .select("id,file_name,score,created_at")
      .single()
    if (error) throw error

    return NextResponse.json({ success: true, data: { id: data.id, fileName: data.file_name, score: data.score, createdAt: data.created_at } })
  } catch (error) {
    console.error("Error creating resume document:", error)
    return NextResponse.json({ success: false, error: "Failed to save this resume" }, { status: 500 })
  }
}
