import { type NextRequest, NextResponse as Response } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getJsonFromS3 } from "@/lib/aws/s3";
import ResumeSchema, { getResumeObject, type Resume } from "@/app/api/parse/resumeSchema";
import { calculateResumeScoreDetailed, getScoreBreakdown } from "@/lib/resumeScoring";
import { createClerkSupabaseServerClient } from "@/lib/supabase/server";
import { profileItemsFromResume, normalizeProfileData } from "@/lib/profile/profile-data";
import type { Json } from "@/lib/supabase/database.types";
import { getOrCreateProfileId } from "@/lib/supabase/resume-documents";

interface ResumeSubmission {
  id: string;
  fileName: string;
  s3Key: string;
  uploadedAt: string;
  score: number;
  isStarred?: boolean;
}

function contentTypeFor(fileName: string): string | null {
  const extension = fileName.split(".").pop()?.toLowerCase();
  if (extension === "pdf") return "application/pdf";
  if (extension === "doc") return "application/msword";
  if (extension === "docx") return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (extension === "txt") return "text/plain";
  return null;
}

async function currentResume(userId: string) {
  const supabase = await createClerkSupabaseServerClient();
  const { data, error } = await supabase
    .from("resume_documents")
    .select("id,structured_content, score")
    .eq("clerk_user_id", userId)
    .eq("is_current", true)
    .maybeSingle();
  if (error) throw error;

  if (data?.structured_content) {
    const resume = normalizeProfileData(data.structured_content);
    const { data: feedbackRow, error: feedbackError } = await supabase.from("resume_feedback")
      .select("result")
      .eq("clerk_user_id", userId)
      .eq("resume_document_id", data.id)
      .eq("feedback_type", "xyz")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (feedbackError) throw feedbackError;
    const xyzFeedback = feedbackRow?.result;
    const score = calculateResumeScoreDetailed(resume, xyzFeedback).totalScore;
    return { resume, score };
  }

  // If this user has any database-backed document, an empty current selection is
  // intentional (for example, after clearing the active resume). Do not revive
  // the legacy S3 JSON snapshot in that case.
  const { data: existingDocuments, error: documentsError } = await supabase
    .from("resume_documents")
    .select("id")
    .eq("clerk_user_id", userId)
    .limit(1);
  if (documentsError) throw documentsError;
  if (existingDocuments?.length) return null;

  // One-time compatibility read while old users' structured resume data is moved.
  if (!process.env.AWS_BUCKET_NAME || !process.env.IAM_AWS_ACCESS_KEY || !process.env.IAM_AWS_SECRET_ACCESS_KEY) return null;
  const legacy = await getJsonFromS3<Resume>(`uploads/${userId}/resume-data.json`);
  if (!legacy) return null;
  const resume = normalizeProfileData(legacy);
  const xyzFeedback = await getJsonFromS3<any>(`uploads/${userId}/xyz-feedback.json`);
  const score = calculateResumeScoreDetailed(resume, xyzFeedback).totalScore;

  // Move the structured legacy snapshot on first read. Keep its source S3 JSON
  // untouched and keep it as a document snapshot, never as master-profile data.
  const { data: profile, error: profileError } = await supabase
    .from("student_profiles")
    .select("id")
    .eq("clerk_user_id", userId)
    .maybeSingle();
  if (profileError) throw profileError;
  let profileId = profile?.id;
  if (!profileId) {
    const blank = getResumeObject();
    const { data: created, error: createError } = await supabase
      .from("student_profiles")
      .insert({ clerk_user_id: userId, basics: blank.basics as unknown as Json })
      .select("id")
      .single();
    if (createError) throw createError;
    profileId = created.id;
  }

  const { error: importError } = await supabase.from("resume_documents").insert({
    profile_id: profileId,
    clerk_user_id: userId,
    source_type: "generated",
    structured_content: resume as unknown as Json,
    score,
    status: "ready",
    is_current: true,
  });
  if (importError) throw importError;

  return { resume, score };
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const payload = await request.json();
    const parsed = ResumeSchema.safeParse(payload?.resume ?? payload?.data ?? payload);
    if (!parsed.success) {
      return Response.json({ success: false, error: "Check your resume details and try again." }, { status: 400 });
    }
    // `resume` is what the master profile becomes — after the student has
    // said which of this upload's changes to take. `document` is the file as
    // it actually reads, which is stored against the resume untouched; they
    // differ whenever a proposed change was declined.
    const resume = normalizeProfileData(parsed.data);
    const documentParsed = payload?.document ? ResumeSchema.safeParse(payload.document) : null;
    const document = documentParsed?.success ? normalizeProfileData(documentParsed.data) : resume;
    const supabase = await createClerkSupabaseServerClient();
    const requestedS3Key = typeof payload?.s3Key === "string" ? payload.s3Key : null;
    let latestQuery = supabase.from("resume_documents")
      .select("id,profile_id,s3_object_key,file_name")
      .eq("clerk_user_id", userId)
      .not("s3_object_key", "is", null)
      .order("created_at", { ascending: false })
      .limit(1);
    if (requestedS3Key) latestQuery = latestQuery.eq("s3_object_key", requestedS3Key).limit(1);
    const { data: latestRows, error: latestError } = await latestQuery;
    if (latestError) throw latestError;
    const latest = latestRows?.[0];
    if (!latest) {
      return Response.json({ success: false, error: "The uploaded resume record could not be found." }, { status: 409 });
    }

    const profileId = latest.profile_id || await getOrCreateProfileId(supabase, userId);
    const { data: feedbackRow, error: feedbackLookupError } = await supabase.from("resume_feedback")
      .select("result")
      .eq("clerk_user_id", userId)
      .eq("resume_document_id", latest.id)
      .eq("feedback_type", "xyz")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (feedbackLookupError) throw feedbackLookupError;
    const xyzFeedback = feedbackRow?.result;
    // The document is scored on what it says, not on what the profile holds.
    const score = calculateResumeScoreDetailed(document, xyzFeedback).totalScore;

    // Keep uploaded bytes in S3; store the structured document and current selection in Supabase.
    const { error: unsetCurrentError } = await supabase
      .from("resume_documents")
      .update({ is_current: false })
      .eq("clerk_user_id", userId)
      .eq("is_current", true);
    if (unsetCurrentError) throw unsetCurrentError;

    const documentId = latest.id;
    const { error: updateDocumentError } = await supabase
        .from("resume_documents")
        .update({
          structured_content: document as unknown as Json,
          score,
          file_name: latest.file_name,
          content_type: contentTypeFor(latest.file_name || ""),
          status: "ready",
          is_current: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", documentId)
        .eq("clerk_user_id", userId);
    if (updateDocumentError) throw updateDocumentError;

    const { data: alreadyProposed, error: proposalLookupError } = await supabase
      .from("profile_import_proposals")
      .select("id")
      .eq("source_resume_document_id", documentId)
      .eq("clerk_user_id", userId)
      .limit(1);
    if (proposalLookupError) throw proposalLookupError;

    // When the upload was reconciled against the profile before saving, the
    // student has already said what to take and the caller has written it.
    // Queuing proposals as well would ask the same questions twice.
    const reconciled = payload?.reconciled === true;
    if (!reconciled && !alreadyProposed?.length) {
      const items = profileItemsFromResume(resume);
      const { data: existingItems, error: itemsLookupError } = await supabase
        .from("profile_items")
        .select("id, item_type, identity_key")
        .eq("profile_id", profileId)
        .eq("clerk_user_id", userId)
        .neq("verification_status", "archived");
      if (itemsLookupError) throw itemsLookupError;

      const targetIds = new Map((existingItems ?? []).map((item) => [`${item.item_type}:${item.identity_key}`, item.id]));
      const proposals = items.map((item) => ({
        profile_id: profileId!,
        clerk_user_id: userId,
        source_resume_document_id: documentId!,
        item_type: item.item_type,
        target_profile_item_id: targetIds.get(`${item.item_type}:${item.identity_key}`) ?? null,
        proposed_data: {
          title: item.title,
          content: item.content,
          identity_key: item.identity_key,
          sort_order: item.sort_order,
        } as Json,
      }));
      if (proposals.length) {
        const { error: proposalInsertError } = await supabase.from("profile_import_proposals").insert(proposals);
        if (proposalInsertError) throw proposalInsertError;
      }
    }

    return Response.json({
      success: true,
      message: reconciled ? "Resume saved." : "Resume saved. Review profile suggestions before adding them to your master profile.",
      score,
    });
  } catch (error) {
    console.error("Error saving resume data:", error);
    return Response.json({ success: false, error: "Failed to save resume data", message: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return Response.json({ success: false, data: null, error: "Unauthorized" }, { status: 401 });
    const current = await currentResume(userId);
    if (!current) return Response.json({ success: false, data: null, message: "No resume data found" });
    const breakdown = getScoreBreakdown(current.resume);
    return Response.json({ success: true, data: current.resume, score: current.score, breakdown });
  } catch (error) {
    console.error("Error loading resume data:", error);
    return Response.json({ success: false, data: null, error: "Failed to load resume data", message: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const { userId } = await auth();
    if (!userId) return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const supabase = await createClerkSupabaseServerClient();
    const { error } = await supabase
      .from("resume_documents")
      .update({ is_current: false, status: "archived" })
      .eq("clerk_user_id", userId)
      .eq("is_current", true);
    if (error) throw error;
    return Response.json({ success: true, message: "Current resume unselected." });
  } catch (error) {
    console.error("Error clearing current resume:", error);
    return Response.json({ success: false, error: "Failed to clear current resume" }, { status: 500 });
  }
}
