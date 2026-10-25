"use client"

import Link from "next/link"
import { useState } from "react"
import { ArrowRight, BriefcaseBusiness, LayoutGrid, List, Search } from "lucide-react"
import type { JobBucket, SavedJob } from "@/app/api/job-board/route"
import { pill, SEGMENT, SEGMENTS } from "@/components/resume-studio/pills"
import { useThumb } from "@/components/resume-studio/use-thumb"

const stages: { id: JobBucket; label: string }[] = [
  { id: "interested", label: "Saved" },
  { id: "applied", label: "Applied" },
  { id: "interviewing", label: "Interviewing" },
  { id: "offer", label: "Offer" },
  { id: "rejected", label: "Closed" },
]

const when = (date: number) =>
  new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })

function safeApplyUrl(value: string) {
  try {
    const url = new URL(value)
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password ? url.href : null
  } catch {
    return null
  }
}

/** A statement the page can't act on: no roles yet, or none that would load. */
function Notice({
  title,
  children,
  role,
}: {
  title: string
  children: React.ReactNode
  role?: "status"
}) {
  return (
    <section
      role={role}
      className="flex flex-col items-start gap-4 rounded-[18px] border border-dashed border-rule-strong px-6 py-12"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-fill text-brand">
        <BriefcaseBusiness className="h-[18px] w-[18px]" aria-hidden="true" />
      </span>
      <h2 className="font-serif text-[26px] leading-tight tracking-[-0.025em] text-ink">{title}</h2>
      {children}
    </section>
  )
}

export function ApplicationsBoard({ initialJobs }: { initialJobs: SavedJob[] | null }) {
  const [jobs, setJobs] = useState(initialJobs || [])
  const [view, setView] = useState<"board" | "table">("board")
  const [savingId, setSavingId] = useState<string | null>(null)
  const [error, setError] = useState("")
  const inProgress = jobs.filter((job) => ["applied", "interviewing"].includes(job.bucket)).length
  const thumb = useThumb(view)

  async function moveJob(id: string, bucket: JobBucket) {
    if (savingId) return
    const previous = jobs
    setSavingId(id)
    setError("")
    setJobs((current) => current.map((job) => job.id === id ? { ...job, bucket } : job))
    try {
      const response = await fetch("/api/job-board", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, bucket }),
      })
      if (!response.ok) throw new Error("The stage could not be saved. Try again.")
      const result = await response.json()
      if (!result.success) throw new Error("The stage could not be saved. Try again.")
      setJobs(result.data)
    } catch (reason) {
      setJobs(previous)
      setError(reason instanceof Error ? reason.message : "The stage could not be saved.")
    } finally {
      setSavingId(null)
    }
  }

  const summary = [
    { label: "Saved roles", value: jobs.length },
    { label: "In progress", value: inProgress },
    { label: "Interviews", value: jobs.filter((job) => job.bucket === "interviewing").length },
    { label: "Offers", value: jobs.filter((job) => job.bucket === "offer").length },
  ]

  const card = (job: SavedJob) => {
    const applyUrl = safeApplyUrl(job.applyUrl)
    return (
      <article
        key={job.id}
        className="flex flex-col gap-3 rounded-[18px] border border-hairline bg-sheet p-4 shadow-card-rest transition-colors duration-150 hover:border-rule"
      >
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-fill text-[14px] font-medium text-brand"
          >
            {job.company.slice(0, 1).toUpperCase()}
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <h3 className="text-[15px] font-medium leading-snug tracking-[-0.01em] text-ink">{job.title}</h3>
            <p className="truncate text-[13px] text-ink-2">
              {job.company}{job.location ? ` · ${job.location}` : ""}
            </p>
            <p className="text-[12px] text-ink-3">Saved {when(job.savedAt)}</p>
          </div>
          {job.matchScore > 0 && (
            <p className="flex shrink-0 items-baseline gap-1">
              <span className="font-serif text-[32px] leading-[0.9] tracking-[-0.04em] tabular-nums text-ink">
                {Math.round(job.matchScore)}
              </span>
              <span className="label-mono text-ink-3">match</span>
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-hairline pt-3">
          <label className="flex items-center gap-2">
            <span className="label-mono text-ink-3">Stage</span>
            <select
              value={job.bucket}
              disabled={savingId === job.id}
              onChange={(event) => moveJob(job.id, event.target.value as JobBucket)}
              className="h-8 rounded-full border border-rule-strong bg-sheet px-2.5 text-[13px] text-ink transition-colors duration-150 hover:bg-fill disabled:opacity-50"
            >
              {stages.map((stage) => <option key={stage.id} value={stage.id}>{stage.label}</option>)}
            </select>
          </label>
          {applyUrl && (
            <a
              href={applyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-brand underline-offset-4 hover:underline"
            >
              Employer listing <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          )}
        </div>
      </article>
    )
  }

  return (
    <div className="zip-scope desk desk-bright min-h-[calc(100vh-var(--chrome-top,82px))] p-2 pb-10 sm:p-5 xl:p-6">
      <div className="paper-frame">
        <div className="paper flex min-h-[calc(100vh-var(--chrome-top,82px)-68px)] flex-col">
          <header className="flex min-h-[72px] flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-hairline px-4 py-[13px] sm:px-6">
            <h1 className="text-[17px] font-medium tracking-[-0.02em] text-ink sm:text-[18px]">Applications</h1>
            <div className="flex items-center gap-2.5">
              <Link href="/match#job-board" className={pill("white", "h-10 px-4 text-[15px] font-medium")}>
                Find jobs
                <Search aria-hidden="true" />
              </Link>
            </div>
          </header>

          <div className="flex-1 px-4 py-9 sm:px-8 sm:py-12">
            <div className="mx-auto flex max-w-[1080px] flex-col gap-9">
              <div className="flex flex-col gap-2">
                <p className="label-mono text-ink-2">Jobs</p>
                <p className="max-w-[58ch] font-serif text-[34px] leading-[1.06] tracking-[-0.03em] text-ink sm:text-[40px]">
                  Saved roles and <em className="text-brand">where each one stands</em>
                </p>
              </div>

              <dl aria-label="Application summary" className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {summary.map((item) => (
                  <div
                    key={item.label}
                    className="flex flex-col gap-2 rounded-[18px] border border-hairline bg-sheet p-5 shadow-card-rest"
                  >
                    <dt className="label-mono text-ink-2">{item.label}</dt>
                    <dd className="font-serif text-[32px] leading-[0.9] tracking-[-0.04em] tabular-nums text-ink">
                      {item.value}
                    </dd>
                  </div>
                ))}
              </dl>

              {initialJobs === null ? (
                <Notice title="Applications couldn’t load" role="status">
                  <p className="max-w-[52ch] text-[15px] leading-relaxed text-ink-2">
                    Refresh this page to try again. Your saved jobs have not been changed.
                  </p>
                </Notice>
              ) : jobs.length === 0 ? (
                <Notice title="Keep your search in one place">
                  <p className="max-w-[52ch] text-[15px] leading-relaxed text-ink-2">
                    Save a role from the job board to start tracking it here. You can move it through the stages as your application
                    progresses.
                  </p>
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <Link href="/match#job-board" className={pill("brand")}>
                      Browse the job board
                      <ArrowRight aria-hidden="true" />
                    </Link>
                    <Link href="/jobs" className={pill("white")}>
                      Explore sources
                    </Link>
                  </div>
                </Notice>
              ) : (
                <div className="flex flex-col gap-5">
                  <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
                    <p className="text-[14px] text-ink-2">
                      {jobs.length} {jobs.length === 1 ? "role" : "roles"} in your tracker
                    </p>
                    <div ref={thumb.group} role="group" aria-label="Application view" className={SEGMENTS}>
                      <span ref={thumb.thumb} aria-hidden="true" className={`segment-thumb ${thumb.placed ? "" : "invisible"}`} />
                      <button
                        type="button"
                        aria-pressed={view === "board"}
                        onClick={() => setView("board")}
                        className={`${SEGMENT} px-4 ${view === "board" ? "text-ink" : "text-ink-3 hover:text-ink"} ${
                          view === "board" && !thumb.placed ? "bg-sheet shadow-[0_1px_3px_rgb(17_24_20/0.14)]" : ""
                        }`}
                      >
                        <LayoutGrid aria-hidden="true" /> Board
                      </button>
                      <button
                        type="button"
                        aria-pressed={view === "table"}
                        onClick={() => setView("table")}
                        className={`${SEGMENT} px-4 ${view === "table" ? "text-ink" : "text-ink-3 hover:text-ink"} ${
                          view === "table" && !thumb.placed ? "bg-sheet shadow-[0_1px_3px_rgb(17_24_20/0.14)]" : ""
                        }`}
                      >
                        <List aria-hidden="true" /> List
                      </button>
                    </div>
                  </div>

                  {error && (
                    <p role="alert" className="rounded-[12px] border border-alert/30 bg-alert/5 px-4 py-3 text-[14px] text-alert">
                      {error}
                    </p>
                  )}

                  {view === "board" ? (
                    <div
                      tabIndex={0}
                      role="region"
                      aria-label="Application board"
                      className="overflow-x-auto pb-2 focus-visible:outline-none"
                    >
                      <div className="flex min-w-max items-start gap-4">
                        {stages.map((stage) => {
                          const items = jobs.filter((job) => job.bucket === stage.id)
                          return (
                            <section key={stage.id} className="flex w-[274px] shrink-0 flex-col gap-3">
                              <header className="flex items-baseline justify-between gap-2 border-b border-hairline pb-2">
                                <h2 className="label-mono text-ink-2">{stage.label}</h2>
                                <span className="text-[13px] tabular-nums text-ink-3">{items.length}</span>
                              </header>
                              <div className="flex flex-col gap-3">
                                {items.length ? items.map(card) : (
                                  <p className="rounded-[12px] border border-dashed border-rule px-3 py-7 text-center text-[13px] text-ink-3">
                                    No roles here yet
                                  </p>
                                )}
                              </div>
                            </section>
                          )
                        })}
                      </div>
                    </div>
                  ) : (
                    <section className="flex flex-col gap-3">
                      <h2 className="sr-only">All saved roles</h2>
                      {jobs.map(card)}
                    </section>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
