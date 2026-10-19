import { redirect } from "next/navigation"
import { loadStudent } from "@/lib/load-student"
import { stepSchema, type OnboardingStep } from "@/lib/student-profile"
import { StudentShell } from "@/components/student/student-shell"
import { Onboarding } from "@/components/student/onboarding"

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const [{ profile, resume }, params] = await Promise.all([loadStudent(), searchParams])
  const editing = params.edit === "1"
  if (profile?.completed && !editing) redirect("/home")
  const requested = stepSchema.safeParse(params.step)
  let initialStep: OnboardingStep = "year"
  if (profile?.year) {
    if (requested.success && requested.data !== "done") {
      initialStep = requested.data
    } else if (!editing && profile.step !== "done") {
      initialStep = profile.step
    }
  }
  // Give every screen a stable URL so browser Back/Forward doesn't resolve to a later saved step.
  if (params.step !== initialStep)
    redirect(`/onboarding?step=${initialStep}${editing ? "&edit=1" : ""}`)
  return (
    <StudentShell onboarding>
      <Onboarding
        initialProfile={profile}
        initialStep={initialStep}
        hasResume={Boolean(resume)}
        editing={editing}
      />
    </StudentShell>
  )
}
