import "server-only"
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { getCurrentResumeData } from "@/lib/supabase/user-data"
import { readStudentProfile } from "@/lib/student-profile-store"
import { createClerkSupabaseServerClient } from "@/lib/supabase/server"

export async function loadStudent() {
  const { userId } = await auth()
  if (!userId) redirect("/sign-in")
  const [profile, resume, xyzFeedback] = await Promise.all([
    readStudentProfile(userId),
    getCurrentResumeData(userId),
    // Carried alongside the resume so that anything scoring it does so the
    // same way the resume pages do. Scoring without this is what made home
    // and the shelf disagree about the same document.
    readCurrentXyzFeedback(userId),
  ])
  return { profile, resume, xyzFeedback }
}

/** The newest AI reading of the student's current resume, if it has had one. */
async function readCurrentXyzFeedback(userId: string): Promise<unknown> {
  try {
    const supabase = await createClerkSupabaseServerClient()
    const { data } = await supabase
      .from("resume_feedback")
      .select("result, resume_documents!inner(is_current)")
      .eq("clerk_user_id", userId)
      .eq("feedback_type", "xyz")
      .eq("resume_documents.is_current", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
    return data?.result ?? null
  } catch {
    // No reading yet, or it could not be fetched: the heuristic score alone
    // is a reasonable answer, and a missing blend must not break the page.
    return null
  }
}
