import Link from "next/link"
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { StudentShell } from "@/components/student/student-shell"
import { getCurrentResumeData } from "@/lib/supabase/user-data"

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

export default async function JobsPage() {
  const { userId } = await auth()
  if (!userId) redirect("/sign-in")
  const resume = await getCurrentResumeData(userId)
  return (
    <StudentShell>
      <div className="career-page">
        <header className="career-page-heading">
          <div>
            <h1>Browse jobs</h1>
            <p>
              Explore opportunities and keep track of the roles you’re
              considering.
            </p>
          </div>
          <div className="scaffold-actions">
            <Link className="student-button student-secondary" href="/jobs/applications">My applications</Link>
            {resume && <Link className="student-button" href="/match#job-board">Open my job board</Link>}
          </div>
        </header>
        <div className="career-plan-layout">
          <section>
            <h2>Places to explore</h2>
            <p className="career-section-description">
              Check each employer or organizer for current openings, dates, and
              requirements.
            </p>
            <div className="career-resource-list">
              {sources.map((source) => (
                <a
                  key={source.href}
                  href={source.href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <h3>{source.title}</h3>
                  <p>{source.description}</p>
                  <span className="student-text-link">Visit website</span>
                </a>
              ))}
            </div>
          </section>
          <aside className="career-plan-help">
            <h2>Your search</h2>
            <Link href={resume ? "/match" : "/upload"}>
              {resume
                ? "Find matches using my resume"
                : "Add a resume for job matching"}
            </Link>
            <Link href="/career?new=preparation">
              Plan an application or interview
            </Link>
            <Link href="/career?view=guides&resource=internships">
              Read the internship guide
            </Link>
            <Link href="/career?view=guides&resource=newgrad">
              Read the new grad guide
            </Link>
          </aside>
        </div>
      </div>
    </StudentShell>
  )
}
