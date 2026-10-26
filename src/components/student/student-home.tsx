import Link from "next/link"
import type { Resume } from "@/app/api/parse/resumeSchema"
import type { SavedJob } from "@/app/api/job-board/route"
import type { StudentProfile } from "@/lib/student-profile"
import {
  homeActivities,
  formatActivityDate,
  workspaceSchema,
  studentDate,
  type CareerWorkspace,
} from "@/lib/career/workspace"
import { GrowthTree } from "./growth-tree"
import { careerGrowthProgress } from "@/lib/career/roadmap"

const emptyWorkspace = workspaceSchema.parse({})
const jobStage = {
  interested: "Saved",
  applied: "Applied",
  interviewing: "Interviewing",
  offer: "Offer",
  rejected: "Closed",
}

export function StudentHome({
  profile,
  resume,
  workspace = emptyWorkspace,
  jobs = [],
  jobsUnavailable = false,
}: {
  profile: StudentProfile | null
  resume: Resume | null
  workspace?: CareerWorkspace
  jobs?: SavedJob[]
  jobsUnavailable?: boolean
}) {
  const today = studentDate()
  const { active, dates, primary, attention } = homeActivities(
    workspace.activities,
    today,
  )
  const completed = workspace.activities.filter(
    (activity) => activity.status === "completed",
  )
  const projects = completed.filter(
    (activity) => activity.kind === "project",
  ).length
  const learning = completed.filter((activity) =>
    ["learning", "exploration", "practice"].includes(activity.kind),
  ).length
  const preparation = completed.filter(
    (activity) => activity.kind === "preparation",
  ).length
  const community = completed.filter(
    (activity) => activity.kind === "community",
  ).length
  const step = primary?.steps.find((step) => !step.done)
  const savedJobs = jobs.filter((job) => job.bucket !== "rejected").slice(0, 3)
  const otherWork = active
    .filter((activity) => activity.id !== primary?.id)
    .slice(0, 3)
  const hasProjects =
    profile?.backgroundAreas.includes("projects") ||
    Boolean(resume?.projects?.length)

  return (
    <div className="career-page home-overview">
      <header className="career-page-heading">
        <h1>Home</h1>
        <Link className="student-text-link" href="/career">
          Open my plan
        </Link>
      </header>
      <div className="home-columns">
        <div className="home-main-column">
          <section
            className="home-current"
            aria-labelledby="home-current-title"
          >
            <p className="home-section-label">
              {primary
                ? attention
                  ? "Coming up in your plan"
                  : "Continue working"
                : "Start with what interests you"}
            </p>
            <h2 id="home-current-title">
              {primary?.title ||
                (hasProjects
                  ? "What would you like to work on next?"
                  : "Find a direction to explore")}
            </h2>
            <p>
              {primary
                ? step?.title ||
                  (primary.steps.length
                    ? "Your steps are checked off. Review what you did and record the outcome."
                    : "Open your notes and decide what to do next.")
                : "You can develop a project, explore the work behind a career, or find people to learn with at UF."}
            </p>
            <div className="career-actions">
              <Link
                className="student-button"
                href={
                  primary
                    ? `/career?activity=${primary.id}`
                    : hasProjects
                      ? "/career?view=projects"
                      : "/career?view=explore"
                }
              >
                {primary
                  ? "Continue activity"
                  : hasProjects
                    ? "Work on a project"
                    : "Explore career paths"}
              </Link>
              <Link
                className="student-text-link"
                href={
                  primary
                    ? "/career"
                    : hasProjects
                      ? "/career?view=explore"
                      : "/career?view=projects"
                }
              >
                {primary
                  ? "View my plan"
                  : hasProjects
                    ? "Explore career paths"
                    : "Start a project"}
              </Link>
            </div>
            {!primary && (
              <nav
                className="home-other-starts"
                aria-label="Other ways to get started"
              >
                <Link href="/career?view=practice">
                  Practice for an interview
                </Link>
                <Link href="/community">Find a community</Link>
                <Link href="/jobs">Explore opportunities</Link>
              </nav>
            )}
          </section>
          {otherWork.length > 0 && (
            <section
              className="home-section"
              aria-labelledby="other-work-title"
            >
              <div className="career-section-heading">
                <h2 id="other-work-title">Also in your plan</h2>
                <Link className="student-text-link" href="/career">
                  View all
                </Link>
              </div>
              <div className="career-list">
                {otherWork.map((activity) => (
                  <Link
                    className="career-list-row"
                    key={activity.id}
                    href={`/career?activity=${activity.id}`}
                  >
                    <div>
                      <strong>{activity.title}</strong>
                      <p>
                        {activity.steps.find((step) => !step.done)?.title ||
                          "Review the outcome"}
                      </p>
                    </div>
                    {activity.scheduledOn && (
                      <time dateTime={activity.scheduledOn}>
                        {formatActivityDate(activity.scheduledOn)}
                      </time>
                    )}
                  </Link>
                ))}
              </div>
            </section>
          )}
          <section className="home-section" aria-labelledby="community-title">
            <div className="career-section-heading">
              <h2 id="community-title">Around UF</h2>
              <Link className="student-text-link" href="/community">
                Browse community
              </Link>
            </div>
            <p className="career-section-description">
              Find people to build with, get feedback, or explore research.
            </p>
            <div className="home-campus-list">
              <Link href="/community#organization-acm">
                <span className="campus-monogram" aria-hidden="true">
                  acm
                </span>
                <div>
                  <h3>Meet other CS students</h3>
                  <p>Computing groups and activities through UF ACM.</p>
                </div>
              </Link>
              <Link href="/community#organization-research">
                <span
                  className="campus-monogram campus-research"
                  aria-hidden="true"
                >
                  UF
                </span>
                <div>
                  <h3>Find a research starting point</h3>
                  <p>Research opportunities and peer advising at UF.</p>
                </div>
              </Link>
            </div>
          </section>
          <section
            className="home-section"
            aria-labelledby="home-opportunities-title"
          >
            <div className="career-section-heading">
              <h2 id="home-opportunities-title">Your opportunities</h2>
              <Link className="student-text-link" href="/match#job-board">
                Open job board
              </Link>
            </div>
            {jobsUnavailable ? (
              <p>
                Saved roles couldn’t be loaded. Open your job board to try
                again.
              </p>
            ) : savedJobs.length ? (
              <div className="career-list">
                {savedJobs.map((job) => (
                  <Link
                    key={job.id}
                    href="/match#job-board"
                    className="career-list-row"
                  >
                    <div>
                      <strong>{job.title}</strong>
                      <p>{job.company}</p>
                    </div>
                    <span>{jobStage[job.bucket]}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="home-opportunities-empty">
                <p>
                  Browse roles and save the ones you want to consider. They’ll
                  stay here as you prepare and apply.
                </p>
                <Link className="student-text-link" href="/jobs">
                  Browse jobs
                </Link>
                <Link
                  className="student-text-link"
                  href="/career?view=guides&resource=internships"
                >
                  Learn about internships
                </Link>
              </div>
            )}
          </section>
        </div>
        <aside className="home-side-column">
          <section className="home-growth" aria-labelledby="growth-title">
            <GrowthTree
              progress={careerGrowthProgress(workspace)}
              decorative
            />
            <h2 id="growth-title">Your growth</h2>
            {completed.length ? (
              <>
                <p>
                  {completed.length}{" "}
                  {completed.length === 1
                    ? "activity completed"
                    : "activities completed"}
                </p>
                <dl>
                  <div>
                    <dt>Projects</dt>
                    <dd>{projects}</dd>
                  </div>
                  <div>
                    <dt>Learning & practice</dt>
                    <dd>{learning}</dd>
                  </div>
                  <div>
                    <dt>Community</dt>
                    <dd>{community}</dd>
                  </div>
                  {preparation > 0 && (
                    <div>
                      <dt>Application preparation</dt>
                      <dd>{preparation}</dd>
                    </div>
                  )}
                </dl>
                <Link className="student-text-link" href="/career?view=history">
                  View completed work
                </Link>
              </>
            ) : (
              <p>
                As you finish activities and record what you learned, your
                progress will appear here.
              </p>
            )}
          </section>
          <section className="home-dates" aria-labelledby="dates-title">
            <div className="career-section-heading">
              <h2 id="dates-title">Your dates</h2>
            </div>
            {dates.length ? (
              <div className="home-date-list">
                {dates.slice(0, 4).map((activity) => (
                  <Link
                    key={activity.id}
                    href={`/career?activity=${activity.id}`}
                  >
                    <time dateTime={activity.scheduledOn!}>
                      {formatActivityDate(activity.scheduledOn!)}
                    </time>
                    <span>
                      {activity.title}
                      {activity.scheduledOn! < today && (
                        <small>Review date</small>
                      )}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p>
                No activities scheduled. Add a date to your plan when you have
                something to prepare for.
              </p>
            )}
            <Link className="student-text-link" href="/career?new=preparation">
              Add a commitment
            </Link>
          </section>
          <section
            className="home-resume-access"
            aria-labelledby="materials-title"
          >
            <h2 id="materials-title">Application materials</h2>
            <p>
              {resume
                ? "Your saved resume is available when you need to review it or prepare an application."
                : "You can add a resume whenever you need one for an application."}
            </p>
            <Link
              className="student-text-link"
              href={resume ? "/resume" : "/upload"}
            >
              {resume ? "Open resume" : "Add a resume"}
            </Link>
          </section>
        </aside>
      </div>
    </div>
  )
}
