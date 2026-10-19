import { loadCareer } from "@/lib/career/load-workspace"
import { StudentShell } from "@/components/student/student-shell"
import { CareerWorkspace } from "@/components/student/career/career-workspace"

type Query = Record<string, string | string[] | undefined>
export default async function CareerPage({
  searchParams,
}: {
  searchParams: Promise<Query>
}) {
  const [workspace, query] = await Promise.all([loadCareer(), searchParams])
  const value = (key: string) =>
    typeof query[key] === "string" ? (query[key] as string) : undefined
  const view = value("view") || "plan"
  return (
    <StudentShell>
      <CareerWorkspace
        key={JSON.stringify(query)}
        initial={workspace}
        view={view}
        activityId={value("activity")}
        resource={value("resource")}
        create={value("new")}
        organization={value("organization")}
      />
    </StudentShell>
  )
}
