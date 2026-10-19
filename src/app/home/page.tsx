import { redirect } from "next/navigation"
import { loadStudent } from "@/lib/load-student"
import { studentEntryPath } from "@/lib/student-profile"
import { StudentShell } from "@/components/student/student-shell"
import { loadHomeWork } from "@/lib/career/load-workspace"
import { StudentHome } from "@/components/student/student-home"

export default async function HomePage() {
  const [{ profile, resume }, work] = await Promise.all([
    loadStudent(),
    loadHomeWork(),
  ])
  if (studentEntryPath(profile, Boolean(resume)) === "/onboarding")
    redirect("/onboarding")
  return (
    <StudentShell>
      <StudentHome profile={profile} resume={resume} {...work} />
    </StudentShell>
  )
}
