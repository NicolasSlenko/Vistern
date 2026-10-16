import { type NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { deleteFromS3, uploadToS3 } from "@/lib/aws/s3";
import { createClerkSupabaseServerClient } from "@/lib/supabase/server";
import { getOrCreateProfileId, importLegacyResumeSubmissions } from "@/lib/supabase/resume-documents";

const DAILY_UPLOAD_LIMIT = 3;
const MAX_STORED_SUBMISSIONS = 10;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
]);

function contentTypeFor(fileName: string, fallback: string) {
  const extension = fileName.split(".").pop()?.toLowerCase();
  if (extension === "pdf") return "application/pdf";
  if (extension === "doc") return "application/msword";
  if (extension === "docx") return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (extension === "txt") return "text/plain";
  return fallback || "application/octet-stream";
}

export async function POST(request: NextRequest) {
  let uploadedKey: string | null = null;
  let persisted = false;
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const missing = ["AWS_BUCKET_NAME", "AWS_BUCKET_REGION", "IAM_AWS_ACCESS_KEY", "IAM_AWS_SECRET_ACCESS_KEY"]
      .filter((key) => !process.env[key]);
    if (missing.length) return NextResponse.json({ error: "Server AWS configuration is incomplete." }, { status: 500 });

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "No file received" }, { status: 400 });
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: "Invalid file type. Only PDF, DOC, DOCX, and TXT files are allowed." }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) return NextResponse.json({ error: "File too large. Maximum size is 10MB." }, { status: 400 });

    const supabase = await createClerkSupabaseServerClient();
    await importLegacyResumeSubmissions(supabase, userId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { data: todaysUploads, error: countError } = await supabase.from("resume_documents")
      .select("id")
      .eq("clerk_user_id", userId)
      .gte("created_at", today.toISOString());
    if (countError) throw countError;

    const user = await currentUser();
    const exempt = user?.primaryEmailAddress?.emailAddress === "nickslenko@gmail.com";
    if ((todaysUploads?.length ?? 0) >= DAILY_UPLOAD_LIMIT && !exempt) {
      return NextResponse.json({ error: `Daily upload limit reached (${DAILY_UPLOAD_LIMIT}/day). Please try again tomorrow.` }, { status: 429 });
    }

    const now = Date.now();
    const safeName = file.name.replace(/[^\w.-]+/g, "-").toLowerCase();
    uploadedKey = `uploads/${userId}/resumes/${now}-${safeName}`;
    await uploadToS3(uploadedKey, Buffer.from(await file.arrayBuffer()), contentTypeFor(file.name, file.type));

    const profileId = await getOrCreateProfileId(supabase, userId);
    const { data: document, error: insertError } = await supabase.from("resume_documents").insert({
      profile_id: profileId,
      clerk_user_id: userId,
      source_type: "uploaded",
      s3_object_key: uploadedKey,
      file_name: file.name,
      content_type: contentTypeFor(file.name, file.type),
      structured_content: {},
      status: "draft",
      score: 0,
    }).select("id,created_at,score,is_starred").single();
    if (insertError) throw insertError;
    persisted = true;

    // Keep the 10 most recent unstarred source files, while starred resumes stay available.
    const { data: recent, error: recentError } = await supabase.from("resume_documents")
      .select("id,s3_object_key,is_starred")
      .eq("clerk_user_id", userId)
      .not("s3_object_key", "is", null)
      .neq("status", "archived")
      .order("created_at", { ascending: false });
    if (recentError) throw recentError;
    const unstarred = (recent ?? []).filter((row) => !row.is_starred);
    for (const old of unstarred.slice(MAX_STORED_SUBMISSIONS)) {
      if (old.s3_object_key) await deleteFromS3(old.s3_object_key);
      const { error: deleteError } = await supabase.from("resume_documents")
        .delete().eq("id", old.id).eq("clerk_user_id", userId);
      if (deleteError) throw deleteError;
    }

    return NextResponse.json({
      message: "File uploaded successfully",
      filename: uploadedKey,
      size: file.size,
      type: file.type,
      submission: {
        id: document.id,
        fileName: file.name,
        s3Key: uploadedKey,
        uploadedAt: document.created_at,
        score: document.score ?? 0,
        isStarred: document.is_starred,
      },
    });
  } catch (error) {
    if (uploadedKey && !persisted) await deleteFromS3(uploadedKey).catch(() => {});
    console.error("Error uploading resume:", error);
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  }
}
