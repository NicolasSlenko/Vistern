import Link from "next/link"
import { ArrowUpRight } from "lucide-react"
import { organizations } from "@/lib/career/catalog"
import { StudentShell } from "@/components/student/student-shell"
import { loadCareer } from "@/lib/career/load-workspace"
import { pill } from "@/components/resume-studio/pills"

export default async function CommunityPage() {
  const workspace = await loadCareer()
  return (
    <StudentShell>
      <div className="zip-scope desk desk-bright min-h-[calc(100vh-var(--chrome-top,82px))] p-2 pb-10 sm:p-5 xl:p-6">
        <div className="paper-frame">
          <div className="paper flex min-h-[calc(100vh-var(--chrome-top,82px)-68px)] flex-col">
            <header data-tour="community-header" className="flex min-h-[72px] flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-hairline px-4 py-[13px] sm:px-6">
              <h1 className="text-[17px] font-medium tracking-[-0.02em] text-ink sm:text-[18px]">Campus directory</h1>
              <div className="flex items-center gap-2.5">
                <Link href="/community/feed" className={pill("white", "h-10 px-4 text-[15px] font-medium")}>
                  Community feed
                </Link>
              </div>
            </header>

            <div className="flex-1 px-4 py-9 sm:px-8 sm:py-12">
              <div className="mx-auto flex max-w-[1080px] flex-col gap-9">
                <div className="flex flex-col gap-2">
                  <p className="label-mono text-ink-2">Community</p>
                  <p className="max-w-[58ch] font-serif text-[34px] leading-[1.06] tracking-[-0.03em] text-ink sm:text-[40px]">
                    Computing groups, collaborators and <em className="text-brand">research</em> at UF
                  </p>
                  <p className="max-w-[60ch] text-[15px] leading-relaxed text-ink-2">
                    Check each organisation’s website for current activities and ways to participate. Add one to your plan to keep
                    track of what you want to do.
                  </p>
                </div>

                <section data-tour="community-orgs" className="flex flex-col gap-4">
                  <h2 className="label-mono text-ink-2">Around UF and beyond</h2>
                  <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {organizations.map((organization) => {
                      const saved = workspace.activities.find(
                        (activity) =>
                          activity.source?.type === "organization" &&
                          activity.source.id === organization.id &&
                          activity.status !== "completed",
                      )
                      return (
                        <li key={organization.id} className="flex">
                          <article
                            id={`organization-${organization.id}`}
                            className="flex flex-1 scroll-mt-6 flex-col gap-2 rounded-[18px] border border-hairline bg-sheet p-5 shadow-card-rest transition-colors duration-150 hover:border-rule"
                          >
                            <p className="label-mono text-ink-3">{organization.kind}</p>
                            <h3 className="text-[16px] font-medium tracking-[-0.015em] text-ink">{organization.name}</h3>
                            <p className="text-[14px] leading-relaxed text-ink-2">{organization.description}</p>
                            <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-2 pt-3">
                              <a
                                href={organization.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-[13px] font-medium text-brand underline-offset-4 hover:underline"
                              >
                                Visit website
                                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                              </a>
                              <Link
                                href={saved ? `/career?activity=${saved.id}` : `/career?organization=${organization.id}`}
                                className="text-[13px] font-medium text-ink-2 underline-offset-4 hover:text-ink hover:underline"
                              >
                                {saved ? "Open in my plan" : "Add to my plan"}
                              </Link>
                            </div>
                          </article>
                        </li>
                      )
                    })}
                  </ul>
                </section>
              </div>
            </div>
          </div>
        </div>
      </div>
    </StudentShell>
  )
}
