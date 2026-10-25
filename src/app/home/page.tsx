import { redirect } from "next/navigation"
import { currentUser } from "@clerk/nextjs/server"
import { loadStudent } from "@/lib/load-student"
import { studentEntryPath } from "@/lib/student-profile"
import { StudentShell } from "@/components/student/student-shell"
import { loadHomeWork } from "@/lib/career/load-workspace"
import { HomeOverview } from "@/components/home/home-overview"

export default async function HomePage() {
  const [{ profile, resume }, work, user] = await Promise.all([loadStudent(), loadHomeWork(), currentUser()])
  if (studentEntryPath(profile, Boolean(resume)) === "/onboarding") redirect("/onboarding")
  return (
    <StudentShell>
      <HomeOverview profile={profile} resume={resume} firstName={user?.firstName ?? null} {...work} />
    </StudentShell>
  )
}
