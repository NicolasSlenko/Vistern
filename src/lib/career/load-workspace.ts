import "server-only"
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { getJsonFromS3 } from "@/lib/aws/s3"
import type { SavedJob } from "@/app/api/job-board/route"
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
    getJsonFromS3<{ jobs: SavedJob[] }>(`uploads/${userId}/job-board.json`)
      .then((data) => ({ data: data?.jobs || [], error: false }))
      .catch(() => ({ data: [], error: true })),
  ])
  return {
    workspace: workspace.data,
    jobs: jobs.data,
    jobsUnavailable: jobs.error,
  }
}
