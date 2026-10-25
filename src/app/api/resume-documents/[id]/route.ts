import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { createClerkSupabaseServerClient } from "@/lib/supabase/server"
import { normalizeProfileData } from "@/lib/profile/profile-data"
import { calculateResumeScoreDetailed } from "@/lib/resumeScoring"
import type { Database, Json } from "@/lib/supabase/database.types"

/** One resume document: its structured content, the file it came from, and its cached reviews. */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    const { id } = await params

    const supabase = await createClerkSupabaseServerClient()
    const { data, error } = await supabase
      .from("resume_documents")
      .select("id,file_name,s3_object_key,content_type,created_at,updated_at,score,is_starred,is_current,source_type,target_role,status,structured_content")
      .eq("clerk_user_id", userId)
      .eq("id", id)
      .maybeSingle()
    if (error) throw error
    if (!data) return NextResponse.json({ success: false, error: "Resume not found" }, { status: 404 })

    // Both reviews this resume has had, newest of each kind.
    const { data: feedback } = await supabase
      .from("resume_feedback")
      .select("feedback_type,result,created_at")
      .eq("clerk_user_id", userId)
      .eq("resume_document_id", id)
      .order("created_at", { ascending: false })
    const newest = (type: string) => feedback?.find((row) => row.feedback_type === type)?.result ?? null

    return NextResponse.json({
      success: true,
      data: {
        id: data.id,
        fileName: data.file_name || "Untitled resume",
        s3Key: data.s3_object_key,
        contentType: data.content_type,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        score: data.score ?? 0,
        isStarred: data.is_starred,
        isCurrent: data.is_current,
        sourceType: data.source_type,
        targetRole: data.target_role,
        status: data.status,
        content: normalizeProfileData(data.structured_content),
        xyz: newest("xyz"),
        bullets: newest("bullets"),
      },
    })
  } catch (error) {
    console.error("Error reading resume document:", error)
    return NextResponse.json({ success: false, error: "Failed to load this resume" }, { status: 500 })
  }
}

/**
 * Save edits to one resume. Only this document changes — the master profile
 * is left alone, which is the whole point of keeping the two apart.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    const { id } = await params

    const body = (await request.json()) as { content?: unknown; fileName?: string; targetRole?: string | null; isStarred?: boolean }
    const update: Database["public"]["Tables"]["resume_documents"]["Update"] = { updated_at: new Date().toISOString() }

    if (body.content !== undefined) {
      const content = normalizeProfileData(body.content)
      update.structured_content = content as unknown as Json
      update.score = Math.round(calculateResumeScoreDetailed(content).totalScore)
      update.status = "ready"
    }
    if (body.fileName !== undefined) update.file_name = body.fileName
    if (body.targetRole !== undefined) update.target_role = body.targetRole
    if (body.isStarred !== undefined) update.is_starred = body.isStarred

    const supabase = await createClerkSupabaseServerClient()
    const { data, error } = await supabase
      .from("resume_documents")
      .update(update)
      .eq("clerk_user_id", userId)
      .eq("id", id)
      .select("id,score,updated_at,file_name,target_role,is_starred")
      .maybeSingle()
    if (error) throw error
    if (!data) return NextResponse.json({ success: false, error: "Resume not found" }, { status: 404 })

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Error saving resume document:", error)
    return NextResponse.json({ success: false, error: "Failed to save this resume" }, { status: 500 })
  }
}

/** Archive a resume. The file stays in S3 so a mistake can be undone by hand. */
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    const { id } = await params

    const supabase = await createClerkSupabaseServerClient()
    const { error } = await supabase
      .from("resume_documents")
      .update({ status: "archived", is_current: false })
      .eq("clerk_user_id", userId)
      .eq("id", id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error archiving resume document:", error)
    return NextResponse.json({ success: false, error: "Failed to archive this resume" }, { status: 500 })
  }
}
