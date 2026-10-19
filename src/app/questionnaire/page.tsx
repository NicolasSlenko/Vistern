import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import QuestionnaireForm from "./_components/questionnaire-form"
import { getCurrentResumeData, getUserPreferences } from "@/lib/supabase/user-data"

export default async function QuestionnairePage() {
  const { userId } = await auth()
  if (!userId) {
    redirect("/sign-in?redirect_url=/questionnaire")
  }

  const resume = await getCurrentResumeData(userId)
  if (!resume) {
    redirect("/upload")
  }

  const preferences = await getUserPreferences(userId)

  return <QuestionnaireForm initialData={preferences} />
}
