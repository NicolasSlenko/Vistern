import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClerkSupabaseServerClient } from "@/lib/supabase/server";
import { importLegacyResumeSubmissions } from "@/lib/supabase/resume-documents";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const { id, starred } = await request.json();
    if (typeof id !== "string" || typeof starred !== "boolean") {
      return NextResponse.json({ success: false, error: "Invalid parameters" }, { status: 400 });
    }

    const supabase = await createClerkSupabaseServerClient();
    await importLegacyResumeSubmissions(supabase, userId);
    const { data: document, error: lookupError } = await supabase.from("resume_documents")
      .select("id,file_name,s3_object_key,created_at,score,is_starred")
      .eq("id", id).eq("clerk_user_id", userId).not("s3_object_key", "is", null).maybeSingle();
    if (lookupError) throw lookupError;
    if (!document) return NextResponse.json({ success: false, error: "Submission not found" }, { status: 404 });

    if (starred && !document.is_starred) {
      const { count, error: countError } = await supabase.from("resume_documents")
        .select("id", { count: "exact", head: true }).eq("clerk_user_id", userId).eq("is_starred", true);
      if (countError) throw countError;
      if ((count ?? 0) >= 3) {
        return NextResponse.json({ success: false, error: "You can only star up to 3 resumes" }, { status: 400 });
      }
    }

    const { data: updated, error: updateError } = await supabase.from("resume_documents")
      .update({ is_starred: starred }).eq("id", id).eq("clerk_user_id", userId)
      .select("id,file_name,s3_object_key,created_at,score,is_starred").single();
    if (updateError) throw updateError;
    return NextResponse.json({ success: true, data: {
      id: updated.id,
      fileName: updated.file_name || "Resume",
      s3Key: updated.s3_object_key,
      uploadedAt: updated.created_at,
      score: updated.score ?? 0,
      isStarred: updated.is_starred,
    } });
  } catch (error) {
    console.error("Error toggling resume star status:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
