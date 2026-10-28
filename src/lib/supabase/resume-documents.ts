import { listObjectsInS3, getJsonFromS3 } from "@/lib/aws/s3";
import { getResumeObject, type Resume } from "@/app/api/parse/resumeSchema";
import { normalizeProfileData } from "@/lib/profile/profile-data";
import type { Database, Json } from "@/lib/supabase/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface ResumeSubmission {
  id: string;
  fileName: string;
  s3Key: string;
  uploadedAt: string;
  score: number;
  isStarred: boolean;
}

interface LegacySubmission extends Omit<ResumeSubmission, "isStarred"> {
  isStarred?: boolean;
}

export async function getOrCreateProfileId(supabase: SupabaseClient<Database>, userId: string) {
  const { data: profile, error } = await supabase.from("student_profiles")
    .select("id").eq("clerk_user_id", userId).maybeSingle();
  if (error) throw error;
  if (profile) return profile.id;
  const blank = getResumeObject();
  const { data: created, error: createError } = await supabase.from("student_profiles")
    .insert({ clerk_user_id: userId, basics: blank.basics as unknown as Json })
    .select("id").single();
  if (createError) throw createError;
  return created.id;
}

function contentTypeFor(fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase();
  if (extension === "pdf") return "application/pdf";
  if (extension === "doc") return "application/msword";
  if (extension === "docx") return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (extension === "txt") return "text/plain";
  return null;
}

export async function importLegacyResumeSubmissions(
  supabase: SupabaseClient<Database>,
  userId: string,
) {
  const [legacyMetadata, currentResume, currentFeedback, objects] = await Promise.all([
    getJsonFromS3<{ submissions?: LegacySubmission[] }>(`uploads/${userId}/submissions-metadata.json`),
    getJsonFromS3<Resume>(`uploads/${userId}/resume-data.json`),
    getJsonFromS3<unknown>(`uploads/${userId}/xyz-feedback.json`),
    listObjectsInS3(`uploads/${userId}/resumes/`),
  ]);
  const metadataItems = Array.isArray(legacyMetadata?.submissions) ? legacyMetadata.submissions : [];
  const itemsByKey = new Map(metadataItems.filter((item) => item.s3Key).map((item) => [item.s3Key, item]));
  const candidates = objects
    .filter((object) => object.key && !object.key.endsWith("/"))
    .map((object) => {
      const legacy = itemsByKey.get(object.key);
      return legacy ?? {
        id: object.key,
        fileName: object.key.split("/").pop() || "Resume",
        s3Key: object.key,
        uploadedAt: object.lastModified?.toISOString() ?? new Date().toISOString(),
        score: 0,
        isStarred: false,
      };
    });

  const { data: existing, error: existingError } = await supabase.from("resume_documents")
    .select("id,s3_object_key,is_current")
    .eq("clerk_user_id", userId);
  if (existingError) throw existingError;
  const existingKeys = new Set((existing ?? []).map((row) => row.s3_object_key).filter(Boolean));
  const profileId = await getOrCreateProfileId(supabase, userId);
  const mostRecent = candidates.slice().sort((a, b) => Date.parse(b.uploadedAt) - Date.parse(a.uploadedAt))[0];

  for (const item of candidates) {
    if (existingKeys.has(item.s3Key)) continue;
    const perResume = await getJsonFromS3<Resume>(`uploads/${userId}/resume-data-${item.id}.json`);
    const activeResumeMatches = Boolean(currentResume && mostRecent?.s3Key === item.s3Key);
    const structured = perResume ?? (activeResumeMatches ? currentResume : null);
    const normalized = structured ? normalizeProfileData(structured) : getResumeObject();
    const { data: document, error: insertError } = await supabase.from("resume_documents").insert({
      profile_id: profileId,
      clerk_user_id: userId,
      source_type: "uploaded",
      s3_object_key: item.s3Key,
      file_name: item.fileName,
      content_type: contentTypeFor(item.fileName),
      structured_content: normalized as unknown as Json,
      score: item.score || null,
      status: structured ? "ready" : "draft",
      is_current: Boolean(activeResumeMatches && !(existing ?? []).some((row) => row.is_current)),
      is_starred: Boolean(item.isStarred),
      created_at: Number.isFinite(Date.parse(item.uploadedAt)) ? new Date(item.uploadedAt).toISOString() : new Date().toISOString(),
    }).select("id").single();
    if (insertError) throw insertError;
    existingKeys.add(item.s3Key);

    const legacyFeedback = await getJsonFromS3<unknown>(`uploads/${userId}/xyz-feedback-${item.id}.json`);
    const feedback = legacyFeedback ?? (activeResumeMatches ? currentFeedback : null);
    if (feedback) {
      const { error: feedbackError } = await supabase.from("resume_feedback").insert({
        clerk_user_id: userId,
        resume_document_id: document.id,
        feedback_type: "xyz",
        result: feedback as Json,
      });
      if (feedbackError) throw feedbackError;
    }
  }
}

export async function listResumeSubmissions(supabase: SupabaseClient<Database>, userId: string) {
  await importLegacyResumeSubmissions(supabase, userId);
  const { data, error } = await supabase.from("resume_documents")
    .select("id,file_name,s3_object_key,created_at,score,is_starred")
    .eq("clerk_user_id", userId)
    .not("s3_object_key", "is", null)
    .neq("status", "archived")
    .order("created_at", { ascending: false })
    .limit(10);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    fileName: row.file_name || "Resume",
    s3Key: row.s3_object_key!,
    uploadedAt: row.created_at,
    score: row.score ?? 0,
    isStarred: row.is_starred,
  } satisfies ResumeSubmission));
}
