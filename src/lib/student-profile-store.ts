import "server-only"
import { getJsonFromS3 } from "@/lib/aws/s3"
import { studentProfileSchema, type StudentProfile } from "@/lib/student-profile"
import { createClerkSupabaseServerClient } from "@/lib/supabase/server"
import { hasImportedLegacyDataset, markLegacyDatasetImported } from "@/lib/supabase/legacy-import"
import type { Json } from "@/lib/supabase/database.types"

function canReadLegacyS3() {
  return Boolean(process.env.AWS_BUCKET_NAME && process.env.IAM_AWS_ACCESS_KEY && process.env.IAM_AWS_SECRET_ACCESS_KEY)
}

export async function readStudentProfile(userId: string): Promise<StudentProfile | null> {
  const supabase = await createClerkSupabaseServerClient()
  const { data, error } = await supabase.from("student_profiles")
    .select("onboarding")
    .eq("clerk_user_id", userId)
    .maybeSingle()
  if (error) throw error
  const stored = data?.onboarding
  if (stored && typeof stored === "object" && !Array.isArray(stored) && Object.keys(stored).length)
    return studentProfileSchema.parse(stored)

  if (await hasImportedLegacyDataset(supabase, userId, "student_onboarding") || !canReadLegacyS3())
    return null

  const legacy = await getJsonFromS3<unknown>(`uploads/${userId}/student-profile.json`)
  if (!legacy) {
    await markLegacyDatasetImported(supabase, userId, "student_onboarding", 0)
    return null
  }
  const profile = studentProfileSchema.parse(legacy)
  await writeStudentProfile(userId, profile)
  await markLegacyDatasetImported(supabase, userId, "student_onboarding", 1)
  return profile
}

export async function writeStudentProfile(userId: string, profile: StudentProfile): Promise<void> {
  const supabase = await createClerkSupabaseServerClient()
  const { error } = await supabase.from("student_profiles").upsert({
    clerk_user_id: userId,
    onboarding: studentProfileSchema.parse(profile) as unknown as Json,
    updated_at: new Date().toISOString(),
  }, { onConflict: "clerk_user_id" })
  if (error) throw error
}
