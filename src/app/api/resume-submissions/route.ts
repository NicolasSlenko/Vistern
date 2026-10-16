import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { deleteFromS3 } from "@/lib/aws/s3";
import { createClerkSupabaseServerClient } from "@/lib/supabase/server";
import { getOrCreateProfileId, listResumeSubmissions } from "@/lib/supabase/resume-documents";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const supabase = await createClerkSupabaseServerClient();
    return NextResponse.json({ success: true, data: await listResumeSubmissions(supabase, userId) });
  } catch (error) {
    console.error("Error fetching resume submissions:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch resume submissions" }, { status: 500 });
  }
}

// Compatibility endpoint: record an already uploaded S3 object in Supabase.
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const { fileName, s3Key } = await request.json() as { fileName?: string; s3Key?: string };
    if (!fileName || !s3Key || !s3Key.startsWith(`uploads/${userId}/resumes/`)) {
      return NextResponse.json({ success: false, error: "Missing or invalid resume file details" }, { status: 400 });
    }
    const supabase = await createClerkSupabaseServerClient();
    const { data: existing, error: lookupError } = await supabase.from("resume_documents")
      .select("id").eq("clerk_user_id", userId).eq("s3_object_key", s3Key).maybeSingle();
    if (lookupError) throw lookupError;
    if (existing) return NextResponse.json({ success: true, data: existing });
    const profileId = await getOrCreateProfileId(supabase, userId);
    const { data, error } = await supabase.from("resume_documents").insert({
      profile_id: profileId,
      clerk_user_id: userId,
      source_type: "uploaded",
      s3_object_key: s3Key,
      file_name: fileName,
      status: "draft",
    }).select("id").single();
    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Error recording resume submission:", error);
    return NextResponse.json({ success: false, error: "Failed to record resume submission" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const supabase = await createClerkSupabaseServerClient();
    const { data: documents, error: listError } = await supabase.from("resume_documents")
      .select("id,s3_object_key").eq("clerk_user_id", userId);
    if (listError) throw listError;

    for (const document of documents ?? []) {
      if (document.s3_object_key) await deleteFromS3(document.s3_object_key);
    }
    const { error: deleteError } = await supabase.from("resume_documents").delete().eq("clerk_user_id", userId);
    if (deleteError) throw deleteError;

    // The user explicitly cleared resume history, so remove the legacy structured copies
    // to prevent a later compatibility import from restoring the cleared records.
    const legacyKeys = [
      `uploads/${userId}/submissions-metadata.json`,
      `uploads/${userId}/resume-data.json`,
      `uploads/${userId}/xyz-feedback.json`,
    ];
    for (const document of documents ?? []) {
      legacyKeys.push(`uploads/${userId}/resume-data-${document.id}.json`);
      legacyKeys.push(`uploads/${userId}/xyz-feedback-${document.id}.json`);
    }
    await Promise.all(legacyKeys.map((key) => deleteFromS3(key).catch(() => {})));

    return NextResponse.json({ success: true, message: "Resume submissions cleared" });
  } catch (error) {
    console.error("Error clearing resume submissions:", error);
    return NextResponse.json({ success: false, error: "Failed to clear resume submissions" }, { status: 500 });
  }
}
