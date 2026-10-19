import "server-only"
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { getJsonFromS3 } from "@/lib/aws/s3"
import { studentProfileSchema, type StudentProfile } from "@/lib/student-profile"
import type { Resume } from "@/app/api/parse/resumeSchema"

export async function loadStudent() {
  const { userId } = await auth()
  if (!userId) redirect("/sign-in")
  const [stored, resume] = await Promise.all([
    getJsonFromS3<StudentProfile>(`uploads/${userId}/student-profile.json`),
    getJsonFromS3<Resume>(`uploads/${userId}/resume-data.json`),
  ])
  return { profile: stored ? studentProfileSchema.parse(stored) : null, resume }
}
