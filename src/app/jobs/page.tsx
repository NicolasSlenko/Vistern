import Link from "next/link"
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { ArrowRight, ArrowUpRight } from "lucide-react"
import { StudentShell } from "@/components/student/student-shell"
import { getCurrentResumeData } from "@/lib/supabase/user-data"
import { pill } from "@/components/resume-studio/pills"

const sources = [
  {
    title: "UF internship resources",
    description:
      "Learn about internships and use UF’s career resources to plan your search.",
    href: "https://career.ufl.edu/gain-experience/internships/",
  },
  {
    title: "Microsoft early careers",
    description:
      "Explore student and graduate programs on Microsoft’s careers site.",
    href: "https://careers.microsoft.com/v2/global/en/students",
  },
  {
    title: "Uber emerging talent",
    description:
      "Find information about internship and early career opportunities at Uber.",
    href: "https://jobs.uber.com/en/teams/emerging-talent/",
  },
  {
    title: "Undergraduate research at UF",
    description: "Explore research and get help finding a faculty mentor.",
    href: "https://cur.aa.ufl.edu/find-research/",
  },
]

/** A row in the side panel: a name, and an arrow that leans out under the pointer. */
function Row({ href, title }: { href: string; title: string }) {
  return (
    <Link
      href={href}
      className="group/row -mx-2 flex items-center gap-3 rounded-[12px] px-2 py-2 transition-colors hover:bg-fill focus-visible:outline-none"
    >
      <span className="min-w-0 flex-1 text-[15px] font-medium tracking-[-0.01em] text-ink">{title}</span>
      <ArrowRight
        className="h-4 w-4 shrink-0 text-ink-3 opacity-0 transition-[opacity,translate] group-hover/row:translate-x-0.5 group-hover/row:opacity-100 motion-reduce:transition-none"
        aria-hidden="true"
      />
    </Link>
  )
}

export default async function JobsPage() {
  const { userId } = await auth()
  if (!userId) redirect("/sign-in")
  const resume = await getCurrentResumeData(userId)

  const search = [
    {
      href: resume ? "/match" : "/upload",
      label: resume ? "Find matches using my resume" : "Add a resume for job matching",
    },
    { href: "/career?new=preparation", label: "Plan an application or interview" },
    { href: "/career?view=guides&resource=internships", label: "Read the internship guide" },
    { href: "/career?view=guides&resource=newgrad", label: "Read the new grad guide" },
  ]

  return (
    <StudentShell>
      <div className="zip-scope desk desk-bright min-h-[calc(100vh-var(--chrome-top,82px))] p-2 pb-10 sm:p-5 xl:p-6">
        <div className="paper-frame">
          <div className="paper flex min-h-[calc(100vh-var(--chrome-top,82px)-68px)] flex-col">
            <header data-tour="jobs-header" className="flex min-h-[72px] flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-hairline px-4 py-[13px] sm:px-6">
              <h1 className="text-[17px] font-medium tracking-[-0.02em] text-ink sm:text-[18px]">Browse jobs</h1>
              <div className="flex items-center gap-2.5">
                <Link href="/jobs/applications" className={pill("white", "h-10 px-4 text-[15px] font-medium")}>
                  My applications
                </Link>
                {resume && (
                  <Link href="/match#job-board" className={pill("brand", "h-10 px-5 text-[15px] font-medium")}>
                    Open my job board
                  </Link>
                )}
              </div>
            </header>

            <div className="flex-1 px-4 py-9 sm:px-8 sm:py-12">
              <div className="mx-auto flex max-w-[1080px] flex-col gap-9">
                <div className="flex flex-col gap-2">
                  <p className="label-mono text-ink-2">Opportunities</p>
                  <p className="max-w-[58ch] font-serif text-[34px] leading-[1.06] tracking-[-0.03em] text-ink sm:text-[40px]">
                    Places to look, and a way to <em className="text-brand">keep track</em>
                  </p>
                  <p className="max-w-[60ch] text-[15px] leading-relaxed text-ink-2">
                    Check each employer or organiser for current openings, dates, and requirements. Roles you save from the job board
                    turn up in your applications.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
                  <section data-tour="jobs-places" className="flex flex-col gap-4">
                    <h2 className="label-mono text-ink-2">Places to explore</h2>
                    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {sources.map((source) => (
                        <li key={source.href} className="flex">
                          <a
                            href={source.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group/source flex flex-1 flex-col gap-2 rounded-[18px] border border-hairline bg-sheet p-5 shadow-card-rest transition-colors duration-150 hover:border-rule focus-visible:outline-none"
                          >
                            <h3 className="flex items-start justify-between gap-3 text-[15px] font-medium tracking-[-0.01em] text-ink">
                              {source.title}
                              <ArrowUpRight
                                className="h-4 w-4 shrink-0 text-ink-3 transition-[translate,color] duration-200 ease-glide group-hover/source:-translate-y-0.5 group-hover/source:text-brand motion-reduce:transition-none"
                                aria-hidden="true"
                              />
                            </h3>
                            <p className="text-[14px] leading-relaxed text-ink-2">{source.description}</p>
                            <span className="label-mono mt-auto pt-2 text-brand">Visit website</span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  </section>

                  <aside data-tour="jobs-search" className="flex h-fit flex-col gap-3.5 rounded-[18px] border border-hairline bg-sheet p-5 shadow-card-rest">
                    <h2 className="label-mono text-ink-2">Your search</h2>
                    <ul className="flex flex-col">
                      {search.map((item) => (
                        <li key={item.href}>
                          <Row href={item.href} title={item.label} />
                        </li>
                      ))}
                    </ul>
                  </aside>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </StudentShell>
  )
}
