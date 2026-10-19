import {
  studentProfileSchema,
  type StudentProfile,
  type StudentProfileUpdate,
} from "@/lib/student-profile"

export async function saveProfile(payload: StudentProfileUpdate): Promise<StudentProfile> {
  const fallback = "We couldn’t save your changes. Please try again."
  const response = await fetch("/api/student-profile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch(() => {
    throw new Error(fallback)
  })
  const result = await response.json().catch(() => null)
  if (!response.ok || !result?.success) {
    throw new Error(typeof result?.error === "string" ? result.error : fallback)
  }
  const profile = studentProfileSchema.safeParse(result.data)
  if (!profile.success) throw new Error(fallback)
  return profile.data
}
