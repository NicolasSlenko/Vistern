import { getJsonFromS3 } from "@/lib/aws/s3";
import { getResumeObject, type Resume } from "@/app/api/parse/resumeSchema";
import { normalizeProfileData, resumeFromProfileItems } from "@/lib/profile/profile-data";
import { createClerkSupabaseServerClient } from "@/lib/supabase/server";
import { hasImportedLegacyDataset, markLegacyDatasetImported } from "@/lib/supabase/legacy-import";
import type { Json } from "@/lib/supabase/database.types";
import type { QuestionnaireData } from "@/app/questionnaire/data";

export async function getCurrentResumeData(userId: string): Promise<Resume | null> {
  const supabase = await createClerkSupabaseServerClient();
  const { data: current, error } = await supabase
    .from("resume_documents")
    .select("id,structured_content")
    .eq("clerk_user_id", userId)
    .eq("is_current", true)
    .maybeSingle();
  if (error) throw error;
  if (current?.structured_content) return normalizeProfileData(current.structured_content);

  // An existing database document with no current selection is intentional.
  const { data: anyDocuments, error: documentsError } = await supabase
    .from("resume_documents")
    .select("id")
    .eq("clerk_user_id", userId)
    .limit(1);
  if (documentsError) throw documentsError;
  if (anyDocuments?.length) return null;

  // Compatibility import for users whose current structured resume is still in S3.
  const legacyResume = await getJsonFromS3<Resume>(`uploads/${userId}/resume-data.json`);
  if (!legacyResume) return null;
  const resume = normalizeProfileData(legacyResume);
  const [metadata, legacyFeedback] = await Promise.all([
    getJsonFromS3<{ submissions?: Array<{ s3Key?: string; fileName?: string }> }>(`uploads/${userId}/submissions-metadata.json`),
    getJsonFromS3<unknown>(`uploads/${userId}/xyz-feedback.json`),
  ]);

  let { data: profile, error: profileError } = await supabase
    .from("student_profiles")
    .select("id")
    .eq("clerk_user_id", userId)
    .maybeSingle();
  if (profileError) throw profileError;
  if (!profile) {
    const blank = getResumeObject();
    const { data: created, error: createError } = await supabase
      .from("student_profiles")
      .insert({ clerk_user_id: userId, basics: blank.basics as unknown as Json })
      .select("id")
      .single();
    if (createError) throw createError;
    profile = created;
  }

  const latestSubmission = metadata?.submissions?.find((submission) => submission.s3Key);
  const { data: imported, error: importError } = await supabase
    .from("resume_documents")
    .insert({
      profile_id: profile.id,
      clerk_user_id: userId,
      source_type: latestSubmission?.s3Key ? "uploaded" : "generated",
      s3_object_key: latestSubmission?.s3Key ?? null,
      file_name: latestSubmission?.fileName ?? null,
      structured_content: resume as unknown as Json,
      status: "ready",
      is_current: true,
    })
    .select("id")
    .single();
  if (importError) throw importError;
  if (legacyFeedback) {
    const { error: feedbackError } = await supabase.from("resume_feedback").insert({
      clerk_user_id: userId,
      resume_document_id: imported.id,
      feedback_type: "xyz",
      result: legacyFeedback as Json,
    });
    if (feedbackError) throw feedbackError;
  }
  return resume;
}

export async function getUserPreferences(userId: string): Promise<QuestionnaireData | null> {
  const supabase = await createClerkSupabaseServerClient();
  const { data, error } = await supabase
    .from("user_preferences")
    .select("preferences")
    .eq("clerk_user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (data) return data.preferences as QuestionnaireData;
  if (await hasImportedLegacyDataset(supabase, userId, "preferences")) return null;

  const legacy = await getJsonFromS3<QuestionnaireData>(`uploads/${userId}/preferences.json`);
  if (legacy) {
    const { error: importError } = await supabase.from("user_preferences").upsert(
      { clerk_user_id: userId, preferences: legacy as unknown as Json },
      { onConflict: "clerk_user_id" },
    );
    if (importError) throw importError;
  }
  await markLegacyDatasetImported(supabase, userId, "preferences", legacy ? 1 : 0);
  return legacy ?? null;
}

export async function getMasterProfileData(userId: string): Promise<Resume | null> {
  const supabase = await createClerkSupabaseServerClient();
  const { data: profile, error: profileError } = await supabase
    .from("student_profiles")
    .select("id,basics")
    .eq("clerk_user_id", userId)
    .maybeSingle();
  if (profileError) throw profileError;
  if (!profile) {
    const legacy = await getJsonFromS3<unknown>(`uploads/${userId}/master-profile.json`);
    if (!legacy) return getCurrentResumeData(userId);
    const normalized = normalizeProfileData(
      legacy && typeof legacy === "object" && "details" in legacy && !("experience" in legacy)
        ? (legacy as { details: unknown }).details
        : legacy,
    );
    return normalized;
  }

  const { data: items, error: itemsError } = await supabase
    .from("profile_items")
    .select("item_type,title,content,sort_order")
    .eq("profile_id", profile.id)
    .eq("clerk_user_id", userId)
    .eq("verification_status", "verified")
    .order("item_type")
    .order("sort_order");
  if (itemsError) throw itemsError;
  return resumeFromProfileItems(profile.basics, items ?? []);
}
