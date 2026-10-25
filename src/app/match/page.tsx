"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { AnimatePresence, motion } from "framer-motion"
import Link from "next/link"
import {
  ArrowRight, Bookmark, BookmarkCheck, ChevronDown, ChevronLeft, ChevronRight,
  Download, ExternalLink, FileText, Loader2, RefreshCw, Send, Settings2, Target, Trash2,
} from "lucide-react"
import { toast } from "sonner"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { pill } from "@/components/resume-studio/pills"
import { Breakdown, FitNotes, Score, fitLabel, type FitAnalysis } from "@/components/match/fit"
import { PrefsModal } from "@/components/match/prefs-modal"
import { useResume } from "@/contexts/resume-context"
import type { LiveJob } from "@/app/api/match-live/route"
import type { SavedJob, JobBucket } from "@/app/api/job-board/route"
import type { QuestionnaireData } from "@/app/questionnaire/data"

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatSalary(min?: number, max?: number) {
  if (!min && !max) return null
  const f = (n: number) => (n >= 1000 ? `$${Math.round(n / 1000)}k` : `$${n}`)
  if (min && max) return `${f(min)} – ${f(max)}`
  return min ? `${f(min)}+` : `up to ${f(max!)}`
}
function formatContract(ct?: string, title?: string) {
  const ti = (title || "").toLowerCase()
  if (ti.includes("intern")) return "Internship"
  const c = (ct || "").toLowerCase()
  if (c === "permanent" || c === "full_time") return "Full-Time"
  if (c === "contract") return "Contract"
  if (c === "part_time") return "Part-Time"
  return null
}
function timeAgo(d?: string) {
  if (!d) return null
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000)
  if (days === 0) return "Today"
  if (days === 1) return "1d ago"
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return `${Math.floor(days / 30)}mo ago`
}

/** The stages a saved role moves through, named as the applications page names them. */
const BUCKET_META: Record<JobBucket, { label: string; next?: JobBucket }> = {
  interested: { label: "Saved", next: "applied" },
  applied: { label: "Applied", next: "interviewing" },
  interviewing: { label: "Interviewing", next: "offer" },
  offer: { label: "Offer" },
  rejected: { label: "Closed" },
}
const BUCKETS = Object.keys(BUCKET_META) as JobBucket[]

// ─── Shared pieces ───────────────────────────────────────────────────────────

/** A panel on the sheet: a hairline card under a small monospace heading. */
function Panel({
  title,
  action,
  children,
  id,
  className = "",
}: {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
  id?: string
  className?: string
}) {
  return (
    <section
      id={id}
      className={`flex flex-col gap-3.5 rounded-[18px] border border-hairline bg-sheet p-5 shadow-card-rest ${className}`}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="label-mono text-ink-2">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

/** A statement the page can't act on: nothing loaded, nothing saved, no resume. */
function Notice({ title, children, role }: { title: string; children: React.ReactNode; role?: "status" }) {
  return (
    <div role={role} className="flex flex-col items-start gap-4 rounded-[18px] border border-dashed border-rule-strong px-6 py-12">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-fill text-brand">
        <Target className="h-[18px] w-[18px]" aria-hidden="true" />
      </span>
      <p className="font-serif text-[26px] leading-tight tracking-[-0.025em] text-ink">{title}</p>
      {children}
    </div>
  )
}

const MENU = "zip-scope min-w-[11rem] rounded-[14px] border-hairline bg-sheet p-1 shadow-card-open"
const MENU_ITEM = "gap-2 rounded-[10px] px-2.5 py-2 text-[14px] text-ink focus:bg-fill focus:text-ink"

/** One row on the job board: the role, its score, and where to put it next. */
function SavedJobRow({ job, onBucket, onRemove }: { job: SavedJob; onBucket: (b: JobBucket) => void; onRemove: () => void }) {
  const next = BUCKET_META[job.bucket].next
  return (
    <li className="flex flex-col gap-2 rounded-[12px] border border-hairline bg-sheet p-3 transition-colors duration-150 hover:border-rule">
      <div className="flex items-start gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="truncate text-[14px] font-medium leading-snug tracking-[-0.01em] text-ink">{job.title}</p>
          <p className="truncate text-[12px] text-ink-3">{job.company}</p>
        </div>
        <span className="shrink-0 text-[13px] tabular-nums text-ink-2">{Math.round(job.matchScore)}</span>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${job.title} from the job board`}
          className="-m-1 shrink-0 rounded-full p-1 text-ink-3 transition-colors duration-150 hover:text-alert"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        {next && (
          <button
            type="button"
            onClick={() => onBucket(next)}
            className="inline-flex items-center gap-1 text-[13px] font-medium text-brand underline-offset-4 hover:underline"
          >
            Move to {BUCKET_META[next].label} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
        <a
          href={job.applyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[13px] text-ink-2 underline-offset-4 hover:text-ink hover:underline"
        >
          Listing <ExternalLink className="h-3 w-3" aria-hidden="true" />
        </a>
      </div>
    </li>
  )
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function MatchPage() {
  const { resumeData, isLoading: isResumeLoading } = useResume()

  const [liveJobs, setLiveJobs] = useState<LiveJob[] | null>(null)
  const [isLiveLoading, setIsLiveLoading] = useState(false)
  const [currentJobIdx, setCurrentJobIdx] = useState(0)
  const [tailoringAction, setTailoringAction] = useState<{ idx: number; action: "overleaf" | "download" } | null>(null)
  const [tailoringAnalyzer, setTailoringAnalyzer] = useState<"overleaf" | "download" | null>(null)
  const overleafFormRef = useRef<HTMLFormElement>(null)
  const overleafInputRef = useRef<HTMLInputElement>(null)

  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([])
  const [expandedBucket, setExpandedBucket] = useState<JobBucket | null>("interested")

  const [prefs, setPrefs] = useState<Partial<QuestionnaireData>>({})
  const [showPrefs, setShowPrefs] = useState(false)

  const [jobDescription, setJobDescription] = useState("")
  const [compareResult, setCompareResult] = useState<(FitAnalysis & { overallMatch: number }) | null>(null)
  const [isCompareLoading, setIsCompareLoading] = useState(false)

  const fetchLiveJobs = useCallback(async () => {
    setIsLiveLoading(true)
    try {
      const res = await fetch("/api/match-live", { method: "POST" })
      const result = await res.json()
      if (result.success && result.data?.jobs?.length) {
        setLiveJobs(result.data.jobs)
        setCurrentJobIdx(0)
        toast.success(`Found ${result.data.jobs.length} matches with full analysis`)
      } else {
        toast.error(result.error || "No jobs found")
      }
    } catch {
      toast.error("Failed to fetch jobs")
    } finally {
      setIsLiveLoading(false)
    }
  }, [])

  // Always fetch fresh on mount
  useEffect(() => {
    if (!resumeData) return
    fetchLiveJobs()
    fetch("/api/job-board").then(r => r.json()).then(r => { if (r.success) setSavedJobs(r.data) }).catch(() => {})
    fetch("/api/preferences").then(r => r.json()).then(r => { if (r.success && r.data) setPrefs(r.data) }).catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeData])

  const saveJob = async (job: LiveJob) => {
    const payload: Omit<SavedJob, "savedAt"> = {
      id: job.id, title: job.title, company: job.company,
      location: job.location, applyUrl: job.applyUrl,
      matchScore: job.matchScore, contractType: job.contractType, bucket: "interested",
    }
    const res = await fetch("/api/job-board", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
    const result = await res.json()
    if (result.success) { setSavedJobs(result.data); setExpandedBucket("interested"); toast.success("Job saved to board") }
  }

  const moveBucket = async (id: string, bucket: JobBucket) => {
    const res = await fetch("/api/job-board", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, bucket }) })
    const result = await res.json()
    if (result.success) setSavedJobs(result.data)
  }

  const removeJob = async (id: string) => {
    const res = await fetch(`/api/job-board?id=${id}`, { method: "DELETE" })
    const result = await res.json()
    if (result.success) setSavedJobs(result.data)
  }

  const generateTailoredLatex = async (
    jobTitle: string, jobDescription: string, jobCompany: string, action: "overleaf" | "download"
  ) => {
    const tailorRes = await fetch("/api/tailor-resume", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobTitle, jobDescription, jobCompany }),
    })
    const tailorResult = await tailorRes.json()
    if (!tailorResult.success) throw new Error(tailorResult.error)
    toast.info("Generating tailored LaTeX…")

    if (action === "overleaf") {
      const latexRes = await fetch("/api/export/latex?mode=overleaf", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeData: tailorResult.data.tailoredResume }),
      })
      if (!latexRes.ok) throw new Error("LaTeX generation failed")
      const { latex } = await latexRes.json()
      const encoded = `data:application/x-tex;base64,${btoa(unescape(encodeURIComponent(latex)))}`
      if (overleafInputRef.current) overleafInputRef.current.value = encoded
      if (overleafFormRef.current) overleafFormRef.current.submit()
      toast.success("Opening in Overleaf…")
    } else {
      const latexRes = await fetch("/api/export/latex", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeData: tailorResult.data.tailoredResume }),
      })
      if (!latexRes.ok) throw new Error("LaTeX generation failed")
      const blob = await latexRes.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `resume-${(jobCompany || "").toLowerCase().replace(/[^a-z0-9]/g, "-") || "tailored"}.tex`
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
      toast.success("Tailored resume downloaded!")
    }
  }

  const tailorResume = async (job: LiveJob, action: "overleaf" | "download") => {
    setTailoringAction({ idx: currentJobIdx, action })
    try {
      await generateTailoredLatex(job.title, job.description, job.company, action)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate resume")
    } finally {
      setTailoringAction(null)
    }
  }

  const tailorFromAnalyzer = async (action: "overleaf" | "download") => {
    setTailoringAnalyzer(action)
    try {
      await generateTailoredLatex("", jobDescription, "", action)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate resume")
    } finally {
      setTailoringAnalyzer(null)
    }
  }

  const analyzeCustomJob = async () => {
    if (jobDescription.trim().length < 20) { toast.error("Please paste a longer job description."); return }
    setIsCompareLoading(true); setCompareResult(null)
    try {
      const res = await fetch("/api/match", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "compare", jobDescription }) })
      const result = await res.json()
      if (result.success && result.data) setCompareResult(result.data)
      else toast.error(result.error || "Analysis failed")
    } catch { toast.error("Something went wrong.") } finally { setIsCompareLoading(false) }
  }

  const currentJob = liveJobs?.[currentJobIdx]
  const isJobSaved = currentJob ? savedJobs.some(j => j.id === currentJob.id) : false
  const savedByBucket = BUCKETS.reduce((acc, b) => { acc[b] = savedJobs.filter(j => j.bucket === b); return acc }, {} as Record<JobBucket, SavedJob[]>)
  const totalSaved = savedJobs.length

  // The sheet is the same in all three states, so nothing jumps as the resume
  // loads and the board takes its place.
  const shell = (children: React.ReactNode, actions?: React.ReactNode) => (
    <div className="zip-scope desk desk-bright min-h-[calc(100vh-var(--chrome-top,82px))] p-2 pb-10 sm:p-5 xl:p-6">
      <div className="paper-frame">
        <div className="paper flex min-h-[calc(100vh-var(--chrome-top,82px)-68px)] flex-col">
          <header className="flex min-h-[72px] flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-hairline px-4 py-[13px] sm:px-6">
            <h1 className="text-[17px] font-medium tracking-[-0.02em] text-ink sm:text-[18px]">Job matches</h1>
            <div className="flex items-center gap-2.5">{actions}</div>
          </header>
          <div className="flex-1 px-4 py-9 sm:px-8 sm:py-12">
            <div className="mx-auto flex max-w-[1080px] flex-col gap-9">{children}</div>
          </div>
        </div>
      </div>
    </div>
  )

  if (isResumeLoading) {
    return shell(
      <div aria-busy="true" className="flex flex-col gap-9">
        <span className="sr-only">Loading your matches…</span>
        <div className="h-12 w-[22rem] max-w-full rounded-[12px] bg-fill" />
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex flex-col gap-5">
            <div className="h-[460px] rounded-[18px] bg-fill" />
            <div className="h-56 rounded-[18px] bg-fill" />
          </div>
          <div className="h-80 rounded-[18px] bg-fill" />
        </div>
      </div>
    )
  }

  if (!resumeData) {
    return shell(
      <Notice title="Add a resume to find matches">
        <p className="max-w-[52ch] text-[15px] leading-relaxed text-ink-2">
          See how your experience lines up with live roles, and what’s worth checking before you apply.
        </p>
        <Link href="/upload" className={`${pill("brand")} mt-1`}>
          Upload a resume
          <ArrowRight aria-hidden="true" />
        </Link>
      </Notice>
    )
  }

  const salary = currentJob ? formatSalary(currentJob.salaryMin, currentJob.salaryMax) : null
  const contract = currentJob ? formatContract(currentJob.contractType, currentJob.title) : null

  return (
    <>
      <PrefsModal open={showPrefs} onClose={() => setShowPrefs(false)} currentPrefs={prefs}
        onSaved={(newPrefs) => { setPrefs(newPrefs); fetchLiveJobs() }} />
      <form ref={overleafFormRef} action="https://www.overleaf.com/docs" method="POST" target="_blank" className="hidden">
        <input ref={overleafInputRef} type="hidden" name="snip_uri" defaultValue="" />
      </form>

      {shell(
        <>
          <div className="flex flex-col gap-2">
            <p className="label-mono text-ink-2">Matches</p>
            <p className="max-w-[58ch] font-serif text-[34px] leading-[1.06] tracking-[-0.03em] text-ink sm:text-[40px]">
              Live roles, read <em className="text-brand">against your resume</em>
            </p>
            <p className="max-w-[60ch] text-[15px] leading-relaxed text-ink-2">
              {liveJobs ? `${liveJobs.length} ${liveJobs.length === 1 ? "role" : "roles"} ranked by fit` : "Ranking roles by fit"}
              {totalSaved > 0 ? ` · ${totalSaved} saved to your board` : ""}.
            </p>
          </div>

          <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="flex min-w-0 flex-col gap-5">
              {/* ── Live matches ─────────────────────────────────────── */}
              <Panel
                title="Live matches"
                action={
                  <button
                    type="button"
                    onClick={fetchLiveJobs}
                    disabled={isLiveLoading}
                    aria-label="Refresh matches"
                    className={pill("white", "h-9 w-9 text-[14px]")}
                  >
                    {isLiveLoading
                      ? <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
                      : <RefreshCw aria-hidden="true" />}
                  </button>
                }
              >
                {isLiveLoading ? (
                  <div role="status" className="flex flex-col items-center gap-3 py-20 text-center">
                    <Loader2 className="h-6 w-6 animate-spin text-brand motion-reduce:animate-none" aria-hidden="true" />
                    <p className="text-[15px] font-medium text-ink">Reading live roles against your resume…</p>
                    <p className="text-[13px] text-ink-3">Embedding, ranking, then a written analysis. Around 20 seconds.</p>
                  </div>
                ) : liveJobs && liveJobs.length > 0 ? (
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => setCurrentJobIdx(Math.max(0, currentJobIdx - 1))}
                        disabled={currentJobIdx === 0}
                        aria-label="Previous match"
                        className={pill("white", "h-9 w-9")}
                      >
                        <ChevronLeft aria-hidden="true" />
                      </button>
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="label-mono shrink-0 text-ink-3">
                          {currentJobIdx + 1} / {liveJobs.length}
                        </span>
                        <div className="flex min-w-0 flex-wrap justify-center gap-1">
                          {liveJobs.map((job, i) => (
                            <button
                              key={job.id}
                              type="button"
                              onClick={() => setCurrentJobIdx(i)}
                              aria-label={`Match ${i + 1}: ${job.title}`}
                              aria-current={i === currentJobIdx}
                              className={`h-1.5 rounded-full transition-all duration-200 ease-glide ${
                                i === currentJobIdx ? "w-5 bg-ink" : "w-1.5 bg-rule hover:bg-rule-strong"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCurrentJobIdx(Math.min(liveJobs.length - 1, currentJobIdx + 1))}
                        disabled={currentJobIdx === liveJobs.length - 1}
                        aria-label="Next match"
                        className={pill("white", "h-9 w-9")}
                      >
                        <ChevronRight aria-hidden="true" />
                      </button>
                    </div>

                    <AnimatePresence mode="wait">
                      {currentJob && (
                        <motion.article
                          key={currentJob.id}
                          initial={{ opacity: 0, x: 12 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -12 }}
                          transition={{ duration: 0.18, ease: "easeInOut" }}
                          className="flex flex-col gap-4 rounded-[18px] border border-hairline bg-sheet p-5 shadow-card-rest transition-colors duration-150 hover:border-rule"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex min-w-0 flex-1 flex-col gap-1">
                              <h3 className="text-[17px] font-medium leading-snug tracking-[-0.015em] text-ink">{currentJob.title}</h3>
                              <p className="text-[14px] text-ink-2">
                                {currentJob.company} · {currentJob.location}
                              </p>
                              <p className="label-mono text-ink-3">
                                {[contract, salary ? `${salary}/yr` : null, timeAgo(currentJob.created)].filter(Boolean).join(" · ")}
                              </p>
                            </div>
                            <div className="flex shrink-0 flex-col items-end gap-0.5">
                              <Score value={currentJob.matchScore} />
                              <span className="text-[12px] text-ink-3">{fitLabel(currentJob.matchScore)}</span>
                            </div>
                          </div>

                          <p className="line-clamp-2 text-[14px] leading-relaxed text-ink-2">{currentJob.description}</p>

                          <div className="flex flex-wrap items-center gap-2.5">
                            <a
                              href={currentJob.applyUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={pill("brand", "h-10 px-5 text-[15px] font-medium")}
                            >
                              Apply
                              <ExternalLink aria-hidden="true" />
                            </a>
                            <button
                              type="button"
                              onClick={() => isJobSaved ? undefined : saveJob(currentJob)}
                              disabled={isJobSaved}
                              className={pill("white", "h-10 px-4 text-[15px] font-medium")}
                            >
                              {isJobSaved ? <BookmarkCheck aria-hidden="true" /> : <Bookmark aria-hidden="true" />}
                              {isJobSaved ? "Saved" : "Save"}
                            </button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  type="button"
                                  disabled={tailoringAction?.idx === currentJobIdx}
                                  className={pill("white", "h-10 px-4 text-[15px] font-medium")}
                                >
                                  {tailoringAction?.idx === currentJobIdx
                                    ? <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
                                    : <FileText aria-hidden="true" />}
                                  {tailoringAction?.idx === currentJobIdx ? "Tailoring…" : "Tailor resume"}
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className={MENU}>
                                <DropdownMenuItem onClick={() => tailorResume(currentJob, "overleaf")} className={MENU_ITEM}>
                                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                                  View in Overleaf
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => tailorResume(currentJob, "download")} className={MENU_ITEM}>
                                  <Download className="h-4 w-4" aria-hidden="true" />
                                  Download .tex
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          <div className="flex flex-col gap-4 border-t border-hairline pt-4">
                            <Breakdown breakdown={currentJob.analysis.breakdown} />
                            <FitNotes analysis={currentJob.analysis} label="Analysis of this match" />
                          </div>
                        </motion.article>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  <Notice title="No roles loaded yet">
                    <p className="max-w-[48ch] text-[15px] leading-relaxed text-ink-2">
                      Set what you’re looking for — the kind of role, where, and at what level — and the search will have something to
                      go on.
                    </p>
                    <Link href="/questionnaire" className={`${pill("white")} mt-1`}>
                      Set preferences
                      <ArrowRight aria-hidden="true" />
                    </Link>
                  </Notice>
                )}
              </Panel>

              {/* ── Analyzer ─────────────────────────────────────────── */}
              <Panel title="Job match analyser">
                <div className="flex flex-col gap-3">
                  <label htmlFor="job-description" className="text-[14px] leading-relaxed text-ink-2">
                    Paste any job description to get the same breakdown for it.
                  </label>
                  <textarea
                    id="job-description"
                    value={jobDescription}
                    onChange={e => setJobDescription(e.target.value)}
                    placeholder="Paste the description here…"
                    className="max-h-[220px] min-h-[120px] w-full resize-y rounded-[12px] border border-rule-strong bg-sheet p-3 text-[14px] leading-relaxed text-ink outline-none transition-colors placeholder:text-ink-3 focus-visible:border-brand"
                  />
                  <button
                    type="button"
                    onClick={analyzeCustomJob}
                    disabled={isCompareLoading || jobDescription.trim().length < 20}
                    className={pill("brand", "h-10 w-full px-5 text-[15px] font-medium")}
                  >
                    {isCompareLoading
                      ? <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
                      : <Send aria-hidden="true" />}
                    {isCompareLoading ? "Analysing…" : "Analyse match"}
                  </button>
                </div>

                {compareResult && (
                  <div className="flex flex-col gap-5 border-t border-hairline pt-5">
                    <div className="flex flex-col gap-4 rounded-[12px] bg-fill p-4 sm:flex-row sm:items-center">
                      <div className="flex shrink-0 flex-col gap-0.5">
                        <Score value={compareResult.overallMatch} size="text-[44px]" />
                        <span className="text-[13px] text-ink-2">{fitLabel(compareResult.overallMatch)}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <Breakdown breakdown={compareResult.breakdown} />
                      </div>
                    </div>

                    <FitNotes analysis={compareResult} label="Analysis of the pasted description" />

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button type="button" disabled={!!tailoringAnalyzer} className={pill("white", "h-10 w-full px-5 text-[15px] font-medium")}>
                          {tailoringAnalyzer
                            ? <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
                            : <FileText aria-hidden="true" />}
                          {tailoringAnalyzer ? "Tailoring…" : "Tailor resume for this role"}
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="center" className={MENU}>
                        <DropdownMenuItem onClick={() => tailorFromAnalyzer("overleaf")} className={MENU_ITEM}>
                          <ExternalLink className="h-4 w-4" aria-hidden="true" />
                          View in Overleaf
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => tailorFromAnalyzer("download")} className={MENU_ITEM}>
                          <Download className="h-4 w-4" aria-hidden="true" />
                          Download .tex
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
              </Panel>
            </div>

            {/* ── Board and preferences ──────────────────────────────── */}
            <div className="flex flex-col gap-5 lg:sticky lg:top-6">
              <Panel
                id="job-board"
                title="Job board"
                className="scroll-mt-6"
                action={
                  totalSaved > 0 ? (
                    <Link href="/jobs/applications" className="shrink-0 text-[13px] font-medium text-brand underline-offset-4 hover:underline">
                      All applications
                    </Link>
                  ) : undefined
                }
              >
                {totalSaved === 0 ? (
                  <p className="rounded-[12px] border border-dashed border-rule px-3 py-7 text-center text-[13px] text-ink-3">
                    Save a role from the matches to track it here
                  </p>
                ) : (
                  <div className="flex max-h-[520px] flex-col gap-1 overflow-y-auto">
                    {BUCKETS.map(bucket => {
                      const jobs = savedByBucket[bucket]
                      if (jobs.length === 0) return null
                      const open = expandedBucket === bucket
                      return (
                        <div key={bucket}>
                          <button
                            type="button"
                            onClick={() => setExpandedBucket(open ? null : bucket)}
                            aria-expanded={open}
                            className="flex w-full items-center justify-between gap-2 rounded-[12px] px-1 py-2 text-left transition-colors duration-150 hover:bg-fill"
                          >
                            <span className="label-mono text-ink-2">{BUCKET_META[bucket].label}</span>
                            <span className="flex items-center gap-2">
                              <span className="text-[13px] tabular-nums text-ink-3">{jobs.length}</span>
                              <ChevronDown
                                className={`h-3.5 w-3.5 text-ink-3 transition-transform duration-200 ease-glide ${open ? "rotate-180" : ""}`}
                                aria-hidden="true"
                              />
                            </span>
                          </button>
                          {open && (
                            <ul className="flex flex-col gap-2 pb-2">
                              {jobs.map(j => (
                                <SavedJobRow key={j.id} job={j} onBucket={b => moveBucket(j.id, b)} onRemove={() => removeJob(j.id)} />
                              ))}
                            </ul>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </Panel>

              <Panel
                title="Search preferences"
                action={
                  <button
                    type="button"
                    onClick={() => setShowPrefs(true)}
                    className="shrink-0 text-[13px] font-medium text-brand underline-offset-4 hover:underline"
                  >
                    Edit
                  </button>
                }
              >
                {prefs.roleTypes?.length || prefs.jobType?.length || prefs.degreeLevel?.length || prefs.location?.length ? (
                  <dl className="flex flex-col gap-3">
                    {([
                      ["Roles", prefs.roleTypes?.slice(0, 4), (prefs.roleTypes?.length ?? 0) - 4],
                      ["Type", prefs.jobType, 0],
                      ["Degree", prefs.degreeLevel, 0],
                      ["Location", prefs.location, 0],
                    ] as const).map(([label, values, extra]) =>
                      values?.length ? (
                        <div key={label} className="flex flex-col gap-1.5">
                          <dt className="label-mono text-ink-3">{label}</dt>
                          <dd className="flex flex-wrap gap-1.5">
                            {values.map(value => (
                              <span key={value} className="rounded-full bg-fill px-2.5 py-1 text-[12px] text-ink-2">{value}</span>
                            ))}
                            {extra > 0 && <span className="rounded-full bg-fill px-2.5 py-1 text-[12px] text-ink-3">+{extra}</span>}
                          </dd>
                        </div>
                      ) : null
                    )}
                  </dl>
                ) : (
                  <p className="text-[13px] leading-snug text-ink-2">
                    Nothing set yet. Tell the matcher what you’re after and the results will narrow to it.
                  </p>
                )}
              </Panel>
            </div>
          </div>
        </>,
        <button type="button" onClick={() => setShowPrefs(true)} className={pill("white", "h-10 px-4 text-[15px] font-medium")}>
          <Settings2 aria-hidden="true" />
          Preferences
        </button>
      )}
    </>
  )
}
