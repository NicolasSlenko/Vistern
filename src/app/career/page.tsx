import { loadCareer } from "@/lib/career/load-workspace"
import { loadStudent } from "@/lib/load-student"
import { StudentShell } from "@/components/student/student-shell"
import { CareerWorkspace } from "@/components/student/career/career-workspace"

type Query = Record<string, string | string[] | undefined>
export default async function CareerPage({
  searchParams,
}: {
  searchParams: Promise<Query>
}) {
  const [workspace, student, query] = await Promise.all([loadCareer(), loadStudent(), searchParams])
  const value = (key: string) =>
    typeof query[key] === "string" ? (query[key] as string) : undefined
  const view = value("view") || "plan"
  return (
    <StudentShell activeSubpage={view}>
      <CareerWorkspace
        initial={workspace}
        experience={{
          year: student.profile?.year || null,
          backgroundAreas: student.profile?.backgroundAreas || [],
          resumeProjectCount: student.resume?.projects?.length || 0,
        }}
        view={view}
        activityId={value("activity")}
        resource={value("resource")}
        create={value("new")}
        organization={value("organization")}
      />
    </StudentShell>
  )
}
