import "server-only"
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { getCurrentResumeData } from "@/lib/supabase/user-data"
import { readStudentProfile } from "@/lib/student-profile-store"

export async function loadStudent() {
  const { userId } = await auth()
  if (!userId) redirect("/sign-in")
  const [profile, resume] = await Promise.all([
    readStudentProfile(userId),
    getCurrentResumeData(userId),
  ])
  return { profile, resume }
}
