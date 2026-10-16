import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClerkSupabaseServerClient } from "@/lib/supabase/server";
import { importLegacyResumeSubmissions } from "@/lib/supabase/resume-documents";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const { id } = await request.json() as { id?: string };
    if (!id) return NextResponse.json({ success: false, error: "Submission ID is required" }, { status: 400 });

    const supabase = await createClerkSupabaseServerClient();
    await importLegacyResumeSubmissions(supabase, userId);
    const { data: target, error: targetError } = await supabase.from("resume_documents")
      .select("id,structured_content,status")
      .eq("id", id).eq("clerk_user_id", userId).maybeSingle();
    if (targetError) throw targetError;
    if (!target) return NextResponse.json({ success: false, error: "Submission not found" }, { status: 404 });
    if (!target.structured_content || Object.keys(target.structured_content).length === 0) {
      return NextResponse.json({ success: false, error: "This resume has no verified structured data to restore." }, { status: 409 });
    }

    const { error: unsetError } = await supabase.from("resume_documents")
      .update({ is_current: false })
      .eq("clerk_user_id", userId).eq("is_current", true);
    if (unsetError) throw unsetError;
    const { error: restoreError } = await supabase.from("resume_documents")
      .update({ is_current: true, status: "ready", updated_at: new Date().toISOString() })
      .eq("id", id).eq("clerk_user_id", userId);
    if (restoreError) throw restoreError;

    const { data: feedback, error: feedbackError } = await supabase.from("resume_feedback")
      .select("result")
      .eq("clerk_user_id", userId).eq("resume_document_id", id).eq("feedback_type", "xyz")
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (feedbackError) throw feedbackError;

    const { data: restored, error: readError } = await supabase.from("resume_documents")
      .select("structured_content,file_name,s3_object_key,created_at,score,is_starred")
      .eq("id", id).eq("clerk_user_id", userId).single();
    if (readError) throw readError;
    return NextResponse.json({
      success: true,
      message: "Resume restored successfully",
      data: restored.structured_content,
      submission: {
        id,
        fileName: restored.file_name || "Resume",
        s3Key: restored.s3_object_key || "",
        uploadedAt: restored.created_at,
        score: restored.score ?? 0,
        isStarred: restored.is_starred,
      },
      feedback: feedback?.result ?? null,
    });
  } catch (error) {
    console.error("Error restoring resume:", error);
    return NextResponse.json({ success: false, error: "Failed to restore resume" }, { status: 500 });
  }
}
