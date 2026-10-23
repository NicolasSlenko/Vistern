import Link from "next/link"
import { organizations } from "@/lib/career/catalog"
import { StudentShell } from "@/components/student/student-shell"
import { loadCareer } from "@/lib/career/load-workspace"

export default async function CommunityPage() {
  const workspace = await loadCareer()
  return (
    <StudentShell>
      <div className="career-page">
        <header className="career-page-heading">
          <div>
            <h1>Campus directory</h1>
            <p>
              Find computing groups, project collaborators, and research at UF.
            </p>
          </div>
          <Link className="student-button student-secondary" href="/community/feed">Community feed</Link>
        </header>
        <section className="community-directory">
          <h2>Around UF & beyond</h2>
          <p className="career-section-description">
            Check each organization’s website for current activities and ways to
            participate. Add one to your plan to keep track of what you want to
            do.
          </p>
          {organizations.map((organization) => {
            const saved = workspace.activities.find(
              (activity) =>
                activity.source?.type === "organization" &&
                activity.source.id === organization.id &&
                activity.status !== "completed",
            )
            return (
              <article
                key={organization.id}
                id={`organization-${organization.id}`}
              >
                <div>
                  <p className="community-kind">{organization.kind}</p>
                  <h3>{organization.name}</h3>
                  <p>{organization.description}</p>
                </div>
                <div className="community-actions">
                  <a
                    className="student-text-link"
                    href={organization.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Visit website
                  </a>
                  <Link
                    className="student-text-link"
                    href={
                      saved
                        ? `/career?activity=${saved.id}`
                        : `/career?organization=${organization.id}`
                    }
                  >
                    {saved ? "Open in my plan" : "Add to my plan"}
                  </Link>
                </div>
              </article>
            )
          })}
        </section>
      </div>
    </StudentShell>
  )
}
