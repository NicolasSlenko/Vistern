import "server-only"
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { getJobs } from "@/app/api/job-board/route"
import { readCareerWorkspace } from "./store"

export async function loadCareer() {
  const { userId } = await auth()
  if (!userId) redirect("/sign-in")
  return (await readCareerWorkspace(userId)).data
}

export async function loadHomeWork() {
  const { userId } = await auth()
  if (!userId) redirect("/sign-in")
  const [workspace, jobs] = await Promise.all([
    readCareerWorkspace(userId),
    getJobs(userId)
      .then((data) => ({ data, error: false }))
      .catch(() => ({ data: [], error: true })),
  ])
  return {
    workspace: workspace.data,
    jobs: jobs.data,
    jobsUnavailable: jobs.error,
  }
}
