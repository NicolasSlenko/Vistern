import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { StudentShell } from "@/components/student/student-shell"
import { getJobs, type SavedJob } from "@/app/api/job-board/route"
import { ApplicationsBoard } from "@/components/student/applications-board"

export default async function ApplicationsPage() {
  const { userId } = await auth()
  if (!userId) redirect("/sign-in")

  let jobs: SavedJob[] | null = null
  try {
    jobs = await getJobs(userId)
  } catch {
    // The workspace still renders when its saved jobs service is unavailable.
  }

  return (
    <StudentShell>
      <ApplicationsBoard initialJobs={jobs} />
    </StudentShell>
  )
}
