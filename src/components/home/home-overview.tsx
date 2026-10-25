import Link from "next/link"
import {
  ArrowRight,
  CalendarDays,
  Compass,
  FileText,
  Sparkles,
  Users,
} from "lucide-react"
import type { Resume } from "@/app/api/parse/resumeSchema"
import type { SavedJob } from "@/app/api/job-board/route"
import type { StudentProfile } from "@/lib/student-profile"
import { formatActivityDate, homeActivities, studentDate, workspaceSchema, type CareerWorkspace } from "@/lib/career/workspace"
import { careerGrowthProgress } from "@/lib/career/roadmap"
import { calculateResumeScoreDetailed } from "@/lib/resumeScoring"
import { GrowthGarden, type GardenLeaf } from "@/components/growth/growth-garden"

/**
 * Home: what to do next, and how the work so far is adding up.
 *
 * One sheet over the sky, as the studio is. The page answers three questions
 * in order — what should I do today, where does my resume stand, and what's
 * coming up — and every panel is a way into the page that owns it rather
 * than a second place to do the work.
 */

const emptyWorkspace = workspaceSchema.parse({})

/** What each kind of work is called where a leaf names itself. */
const ACTIVITY_NAME: Record<string, string> = {
  project: "Project",
  learning: "Learning",
  exploration: "Exploration",
  practice: "Practice",
  community: "Community",
  preparation: "Preparation",
}

const JOB_STAGE: Record<string, string> = {
  interested: "Saved",
  applied: "Applied",
  interviewing: "Interviewing",
  offer: "Offer",
  rejected: "Closed",
}

const greeting = (hour: number) => (hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening")

/** A panel on the sheet: a hairline card with a title and a way through to its page. */
function Panel({
  title,
  href,
  action,
  icon: Icon,
  children,
  className = "",
}: {
  title: string
  href?: string
  action?: string
  icon?: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={`flex flex-col gap-3.5 rounded-[18px] border border-hairline bg-sheet p-5 shadow-card-rest ${className}`}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="label-mono flex items-center gap-2 text-ink-2">
          {Icon && <Icon className="h-3.5 w-3.5" aria-hidden={true} />}
          {title}
        </h2>
        {href && (
          <Link href={href} className="shrink-0 text-[13px] font-medium text-brand underline-offset-4 hover:underline">
            {action ?? "Open"}
          </Link>
        )}
      </div>
      {children}
    </section>
  )
}

/** A row in a list that leads somewhere: a name, a quiet second line, and something at its end. */
function Row({ href, title, note, end }: { href: string; title: string; note?: string; end?: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="group/row -mx-2 flex items-center gap-3 rounded-[12px] px-2 py-2 transition-colors hover:bg-fill focus-visible:outline-none"
    >
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-[15px] font-medium tracking-[-0.01em] text-ink">{title}</span>
        {note && <span className="truncate text-[13px] text-ink-3">{note}</span>}
      </span>
      {end && <span className="shrink-0 text-[12px] text-ink-3">{end}</span>}
      <ArrowRight
        className="h-4 w-4 shrink-0 text-ink-3 opacity-0 transition-[opacity,translate] group-hover/row:translate-x-0.5 group-hover/row:opacity-100 motion-reduce:transition-none"
        aria-hidden="true"
      />
    </Link>
  )
}

export function HomeOverview({
  profile,
  resume,
  workspace = emptyWorkspace,
  jobs = [],
  jobsUnavailable = false,
  firstName,
}: {
  profile: StudentProfile | null
  resume: Resume | null
  workspace?: CareerWorkspace
  jobs?: SavedJob[]
  jobsUnavailable?: boolean
  firstName?: string | null
}) {
  const today = studentDate()
  const { active, dates, primary, attention } = homeActivities(workspace.activities, today)
  const completed = workspace.activities.filter((activity) => activity.status === "completed")
  const step = primary?.steps.find((item) => !item.done)
  const savedJobs = jobs.filter((job) => job.bucket !== "rejected").slice(0, 3)
  const otherWork = active.filter((activity) => activity.id !== primary?.id).slice(0, 3)
  const hasProjects = profile?.backgroundAreas.includes("projects") || Boolean(resume?.projects?.length)
  const growth = careerGrowthProgress(workspace)

  // The score is worked out here rather than fetched: the resume is already
  // on the server, and the number is the point of the panel.
  const score = resume ? Math.round(calculateResumeScoreDetailed(resume).totalScore) : null
  const weakest = resume
    ? [...calculateResumeScoreDetailed(resume).breakdown].sort((a, b) => a.combinedScore - b.combinedScore)[0]
    : null

  // Oldest first, so a leaf keeps its place on the tree as more work is added.
  const growthLeaves: GardenLeaf[] = [...completed]
    .sort((a, b) => (a.completedAt ?? a.updatedAt).localeCompare(b.completedAt ?? b.updatedAt))
    .map((activity) => ({
      id: activity.id,
      title: activity.title,
      tone: activity.kind,
      label: ACTIVITY_NAME[activity.kind],
      note: activity.reflection || activity.notes || undefined,
      date: activity.completedAt,
      href: `/career?activity=${activity.id}`,
    }))

  return (
    <div className="zip-scope desk desk-bright min-h-[calc(100vh-var(--chrome-top,82px))] p-2 pb-10 sm:p-5 xl:p-6">
      <div className="paper-frame">
        <div className="paper flex min-h-[calc(100vh-var(--chrome-top,82px)-68px)] flex-col">
          <div className="flex-1 px-4 py-9 sm:px-8 sm:py-12">
            <div className="mx-auto flex max-w-[1080px] flex-col gap-9">
              {/* What to do next. The one thing the page is for, so it gets
                  the serif and the full width. */}
              <header className="flex flex-col gap-4">
                <p className="label-mono text-ink-2">
                  {greeting(new Date().getHours())}
                  {firstName ? `, ${firstName}` : ""}
                </p>
                <h1 className="max-w-[20ch] text-balance font-serif text-[40px] leading-[1.04] tracking-[-0.035em] text-ink sm:text-[52px]">
                  {primary ? (
                    primary.title
                  ) : hasProjects ? (
                    <>
                      What will you <em className="text-brand">build</em> next?
                    </>
                  ) : (
                    <>
                      Find a direction <em className="text-brand">worth</em> exploring
                    </>
                  )}
                </h1>
                <p className="max-w-[62ch] text-[16px] leading-relaxed text-ink-2">
                  {primary
                    ? step?.title ||
                      (primary.steps.length
                        ? "Every step is ticked off. Open it and write down what came of it."
                        : "Open your notes and decide what to do next.")
                    : "Develop a project, look into what a career actually involves day to day, or find people at UF to learn alongside."}
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <Link
                    href={primary ? `/career?activity=${primary.id}` : hasProjects ? "/career?view=projects" : "/career?view=explore"}
                    className="brand-button inline-flex h-11 items-center gap-2 rounded-full px-5 text-[15px] font-medium tracking-[-0.01em]"
                  >
                    {primary ? "Continue" : hasProjects ? "Work on a project" : "Explore career paths"}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                  <Link
                    href="/career"
                    className="white-button inline-flex h-11 items-center rounded-full px-5 text-[15px] font-medium tracking-[-0.01em]"
                  >
                    My plan
                  </Link>
                  {attention && primary && (
                    <span className="label-mono flex items-center gap-1.5 text-caution">
                      <span aria-hidden="true" className="h-[6px] w-[6px] rounded-full bg-caution" />
                      Coming up
                    </span>
                  )}
                </div>
              </header>

              <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                {/* Resume. The number first, because it's the one thing a
                    student checks on every visit. */}
                <Panel title="Resume" icon={FileText} href={resume ? "/profile" : "/upload"} action={resume ? "Open profile" : "Upload"}>
                  {score === null ? (
                    <>
                      <p className="font-serif text-[26px] leading-[1.05] tracking-[-0.025em] text-ink">
                        No resume <em className="text-brand">yet</em>
                      </p>
                      <p className="text-[13px] leading-snug text-ink-2">
                        Upload one and we’ll read it into a profile, then mark every bullet worth rewriting.
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="flex items-baseline gap-2">
                        <span className="font-serif text-[48px] leading-[0.85] tracking-[-0.045em] tabular-nums text-ink">{score}</span>
                        <span className="label-mono text-ink-2">/ 100</span>
                      </p>
                      <div className="relative h-[3px] rounded-full bg-rule">
                        <div style={{ width: `${score}%` }} className="absolute inset-y-0 left-0 rounded-full bg-ink" />
                      </div>
                      <p className="text-[13px] leading-snug text-ink-2">
                        {weakest ? (
                          <>
                            Weakest part: <span className="capitalize text-ink">{weakest.category}</span>, at{" "}
                            {Math.round(weakest.combinedScore)} out of 100.
                          </>
                        ) : (
                          "Open your profile to see the breakdown."
                        )}
                      </p>
                      <Link
                        href="/resumes"
                        className="inline-flex items-center gap-1.5 self-start text-[13px] font-medium text-brand hover:underline"
                      >
                        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                        Review my bullets
                      </Link>
                    </>
                  )}
                </Panel>

                {/* Growth, as the tree: a leaf for every activity finished,
                    and each one says which when it's chosen. */}
                <Panel title="Growth" icon={Compass} href="/career?view=history" action="Completed work">
                  <p className="flex items-baseline gap-2">
                    <span className="font-serif text-[48px] leading-[0.85] tracking-[-0.045em] tabular-nums text-ink">
                      {completed.length}
                    </span>
                    <span className="label-mono text-ink-2">{completed.length === 1 ? "activity done" : "activities done"}</span>
                  </p>
                  <GrowthGarden leaves={growthLeaves} className="-mt-1" />
                  {growth > 0 && <p className="text-[12px] text-ink-3">{growth}% along your roadmap</p>}
                </Panel>

                {/* Dates. */}
                <Panel title="Dates" icon={CalendarDays} href="/career?new=preparation" action="Add one">
                  {dates.length ? (
                    <ul className="flex flex-col">
                      {dates.slice(0, 4).map((activity) => (
                        <li key={activity.id}>
                          <Row
                            href={`/career?activity=${activity.id}`}
                            title={activity.title}
                            note={activity.scheduledOn! < today ? "Review date" : undefined}
                            end={formatActivityDate(activity.scheduledOn!)}
                          />
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[13px] leading-snug text-ink-2">
                      Nothing scheduled. Add a date when you’ve got something to prepare for — an application, a talk, an interview.
                    </p>
                  )}
                </Panel>
              </div>

              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                {otherWork.length > 0 && (
                  <Panel title="Also in your plan" href="/career" action="View all">
                    <ul className="flex flex-col">
                      {otherWork.map((activity) => (
                        <li key={activity.id}>
                          <Row
                            href={`/career?activity=${activity.id}`}
                            title={activity.title}
                            note={activity.steps.find((item) => !item.done)?.title || "Review the outcome"}
                            end={activity.scheduledOn ? formatActivityDate(activity.scheduledOn) : undefined}
                          />
                        </li>
                      ))}
                    </ul>
                  </Panel>
                )}

                <Panel title="Opportunities" href="/jobs" action="Browse jobs">
                  {jobsUnavailable ? (
                    <p className="text-[13px] leading-snug text-ink-2">Saved roles couldn’t be loaded. Open your job board to try again.</p>
                  ) : savedJobs.length ? (
                    <ul className="flex flex-col">
                      {savedJobs.map((job) => (
                        <li key={job.id}>
                          <Row href="/match#job-board" title={job.title} note={job.company} end={JOB_STAGE[job.bucket]} />
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[13px] leading-snug text-ink-2">
                      Save the roles you’re considering and they’ll stay here while you prepare and apply.
                    </p>
                  )}
                </Panel>

                <Panel title="Around UF" icon={Users} href="/community" action="Browse community">
                  <ul className="flex flex-col">
                    <li>
                      <Row href="/community#organization-acm" title="Meet other CS students" note="Computing groups and activities through UF ACM" />
                    </li>
                    <li>
                      <Row href="/community#organization-research" title="Find a research starting point" note="Research openings and peer advising at UF" />
                    </li>
                  </ul>
                </Panel>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
