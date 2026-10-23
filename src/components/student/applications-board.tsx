"use client"

import Link from "next/link"
import { useState } from "react"
import { ArrowRight, BriefcaseBusiness, LayoutGrid, List, Search } from "lucide-react"
import type { JobBucket, SavedJob } from "@/app/api/job-board/route"

const stages: { id: JobBucket; label: string }[] = [
  { id: "interested", label: "Saved" },
  { id: "applied", label: "Applied" },
  { id: "interviewing", label: "Interviewing" },
  { id: "offer", label: "Offer" },
  { id: "rejected", label: "Closed" },
]

function safeApplyUrl(value: string) {
  try {
    const url = new URL(value)
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password ? url.href : null
  } catch {
    return null
  }
}

export function ApplicationsBoard({ initialJobs }: { initialJobs: SavedJob[] | null }) {
  const [jobs, setJobs] = useState(initialJobs || [])
  const [view, setView] = useState<"board" | "table">("board")
  const [savingId, setSavingId] = useState<string | null>(null)
  const [error, setError] = useState("")
  const inProgress = jobs.filter((job) => ["applied", "interviewing"].includes(job.bucket)).length

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

  const card = (job: SavedJob) => {
    const applyUrl = safeApplyUrl(job.applyUrl)
    return (
      <article key={job.id} className="application-card">
        <span className="application-company-mark" aria-hidden="true">{job.company.slice(0, 1).toUpperCase()}</span>
        <div className="application-card-copy">
          <h3>{job.title}</h3>
          <p>{job.company}{job.location ? ` · ${job.location}` : ""}</p>
          <span>Saved {new Date(job.savedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
        </div>
        <div className="application-card-actions">
          <label>
            <span>Stage</span>
            <select value={job.bucket} disabled={savingId === job.id} onChange={(event) => moveJob(job.id, event.target.value as JobBucket)}>
              {stages.map((stage) => <option key={stage.id} value={stage.id}>{stage.label}</option>)}
            </select>
          </label>
          {applyUrl && <a href={applyUrl} target="_blank" rel="noopener noreferrer">Employer listing <ArrowRight size={14} /></a>}
        </div>
      </article>
    )
  }

  return (
    <div className="career-page scaffold-page applications-page">
      <header className="career-page-heading">
        <div>
          <span className="scaffold-eyebrow">Jobs</span>
          <h1>Applications</h1>
          <p>Keep saved roles and application progress in one place.</p>
        </div>
        <Link className="student-button student-secondary" href="/match#job-board">Find jobs <Search size={16} /></Link>
      </header>

      <div className="application-stats" aria-label="Application summary">
        <div><strong>{jobs.length}</strong><span>Saved roles</span></div>
        <div><strong>{inProgress}</strong><span>In progress</span></div>
        <div><strong>{jobs.filter((job) => job.bucket === "interviewing").length}</strong><span>Interviews</span></div>
        <div><strong>{jobs.filter((job) => job.bucket === "offer").length}</strong><span>Offers</span></div>
      </div>

      {initialJobs === null ? (
        <section className="scaffold-empty" role="status"><span className="scaffold-empty-icon"><BriefcaseBusiness size={24} /></span><div><h2>Applications couldn’t load</h2><p>Refresh this page to try again. Your saved jobs have not been changed.</p></div></section>
      ) : jobs.length === 0 ? (
        <section className="scaffold-empty"><span className="scaffold-empty-icon"><BriefcaseBusiness size={24} /></span><div><h2>Keep your search in one place</h2><p>Save a role from the job board to start tracking it here. You can move it through the stages as your application progresses.</p><div className="scaffold-actions"><Link className="student-button" href="/match#job-board">Browse the job board <ArrowRight size={16} /></Link><Link className="student-button student-secondary" href="/jobs">Explore sources</Link></div></div></section>
      ) : (
        <>
          <div className="application-toolbar">
            <p>{jobs.length} {jobs.length === 1 ? "role" : "roles"} in your tracker</p>
            <div role="group" aria-label="Application view">
              <button type="button" aria-pressed={view === "board"} onClick={() => setView("board")}><LayoutGrid size={16} /> Board</button>
              <button type="button" aria-pressed={view === "table"} onClick={() => setView("table")}><List size={16} /> List</button>
            </div>
          </div>
          {error && <p className="application-error" role="alert">{error}</p>}
          {view === "board" ? (
            <div className="application-board-scroll" tabIndex={0} role="region" aria-label="Application board">
              <div className="application-board">
                {stages.map((stage) => {
                  const items = jobs.filter((job) => job.bucket === stage.id)
                  return <section key={stage.id} className="application-column"><header><h2>{stage.label}</h2><span>{items.length}</span></header><div>{items.length ? items.map(card) : <p className="application-column-empty">No roles here yet</p>}</div></section>
                })}
              </div>
            </div>
          ) : (
            <div className="application-list">{jobs.map(card)}</div>
          )}
        </>
      )}
    </div>
  )
}
