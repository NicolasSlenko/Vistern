"use client"

import Link from "next/link"
import { useState } from "react"
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import { ArrowRight, BriefcaseBusiness, ChevronsLeftRight, ChevronsRightLeft, GripVertical, LayoutGrid, List, Search, Trash2 } from "lucide-react"
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

const stageLabel = (bucket: JobBucket) => stages.find((stage) => stage.id === bucket)?.label ?? bucket

/** Past this many roles a column switches to compact cards, so more fit before it scrolls. */
const COMPACT_AFTER = 15

// Buttons and links inside a draggable card must not start a drag.
const noDrag = { onPointerDown: (event: React.PointerEvent) => event.stopPropagation() }

/** One saved role. The same face is used on the board, in the list and under the pointer while dragging. */
function JobCard({
  job,
  onRemove,
  removing,
  showStage,
  dragging,
  compact,
}: {
  job: SavedJob
  onRemove?: (id: string) => void
  removing?: boolean
  showStage?: boolean
  dragging?: boolean
  /** One line of facts instead of two: for a long column. */
  compact?: boolean
}) {
  const [confirming, setConfirming] = useState(false)
  const applyUrl = safeApplyUrl(job.applyUrl)
  return (
    <article
      className={`group flex flex-col rounded-[14px] border bg-sheet shadow-card-rest ${compact ? "gap-2 p-2.5" : "gap-2.5 p-3.5"} transition-colors duration-150 ${
        dragging ? "border-rule-strong shadow-lg" : "border-hairline hover:border-rule"
      }`}
    >
      <div className="flex items-start gap-2.5">
        <span
          aria-hidden="true"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-fill text-[12px] font-medium text-brand"
        >
          {job.company.slice(0, 1).toUpperCase()}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h3 className={`text-[14px] font-medium leading-snug tracking-[-0.01em] text-ink ${compact ? "line-clamp-2" : ""}`}>{job.title}</h3>
          <p className="truncate text-[12px] text-ink-2">
            {job.company}{job.location && !compact ? ` · ${job.location}` : ""}
            {compact && job.matchScore > 0 && <span className="tabular-nums text-brand"> · {Math.round(job.matchScore)}%</span>}
          </p>
        </div>
        {onRemove && !confirming && (
          <button
            type="button"
            {...noDrag}
            onClick={() => setConfirming(true)}
            aria-label={`Remove ${job.title} at ${job.company}`}
            className="-mr-1 -mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-ink-3 opacity-100 transition-colors duration-150 hover:bg-fill hover:text-alert sm:opacity-0 sm:focus-visible:opacity-100 sm:group-hover:opacity-100"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
      </div>

      {confirming && onRemove ? (
        <div role="group" aria-label="Confirm removal" className="flex items-center justify-between gap-2 border-t border-hairline pt-2.5">
          <span className="whitespace-nowrap text-[12px] text-ink-2">Remove role?</span>
          <span className="flex items-center gap-1.5">
            <button
              type="button"
              {...noDrag}
              onClick={() => setConfirming(false)}
              className="h-7 rounded-full px-3 text-[12px] font-medium text-ink-2 transition-colors duration-150 hover:bg-fill hover:text-ink"
            >
              Keep
            </button>
            <button
              type="button"
              {...noDrag}
              disabled={removing}
              onClick={() => onRemove(job.id)}
              className="h-7 rounded-full bg-alert px-3 text-[12px] font-medium text-white transition-[filter] duration-150 hover:brightness-110 disabled:opacity-50"
            >
              Remove
            </button>
          </span>
        </div>
      ) : compact ? null : (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-hairline pt-2.5 text-[12px]">
          {showStage && (
            <span className="rounded-full bg-fill px-2 py-0.5 font-medium text-ink-2">{stageLabel(job.bucket)}</span>
          )}
          {job.matchScore > 0 && (
            <span className="rounded-full bg-fill px-2 py-0.5 font-medium tabular-nums text-brand">
              {Math.round(job.matchScore)}% match
            </span>
          )}
          <span className="text-ink-3">Saved {when(job.savedAt)}</span>
          {applyUrl && (
            <a
              href={applyUrl}
              {...noDrag}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto inline-flex items-center gap-1 font-medium text-brand underline-offset-4 hover:underline"
            >
              Listing <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </a>
          )}
        </div>
      )}
    </article>
  )
}

function DraggableJob({ job, disabled, ...rest }: { job: SavedJob; disabled: boolean; onRemove: (id: string) => void; removing: boolean; compact: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: job.id, disabled })
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      aria-label={`${job.title} at ${job.company}. Press space to pick up, arrow keys to move between stages.`}
      className={`relative touch-manipulation rounded-[14px] outline-none focus-visible:ring-2 focus-visible:ring-brand/50 ${
        disabled ? "" : "cursor-grab active:cursor-grabbing"
      } ${isDragging ? "opacity-40" : ""}`}
    >
      <GripVertical
        aria-hidden="true"
        className="pointer-events-none absolute left-0.5 top-1/2 hidden h-3.5 w-3.5 -translate-y-1/2 text-ink-3 opacity-0 transition-opacity group-hover:opacity-60 sm:block"
      />
      <JobCard job={job} {...rest} />
    </div>
  )
}

function StageColumn({
  stage,
  count,
  collapsed,
  onToggle,
  children,
}: {
  stage: { id: JobBucket; label: string }
  count: number
  /** Folded to a narrow strip that still takes a drop. */
  collapsed?: boolean
  onToggle?: () => void
  children: React.ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id })
  const label = `${stage.label}, ${count} ${count === 1 ? "role" : "roles"}`

  if (collapsed)
    return (
      <section ref={setNodeRef} aria-label={label} className="flex w-14 shrink-0 flex-col">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={false}
          aria-label={`Show ${stage.label}, ${count} ${count === 1 ? "role" : "roles"}`}
          className={`flex min-h-[220px] flex-col items-center gap-3 rounded-[16px] border border-dashed px-1 py-3 text-ink-3 transition-colors duration-150 hover:border-rule-strong hover:text-ink ${
            isOver ? "border-rule-strong bg-fill text-ink" : "border-rule"
          }`}
        >
          <ChevronsLeftRight className="h-4 w-4" aria-hidden="true" />
          <span className="label-mono [writing-mode:vertical-rl]">{stage.label}</span>
          <span className="text-[13px] tabular-nums">{count}</span>
        </button>
      </section>
    )

  return (
    <section className="flex min-w-[232px] flex-1 basis-0 flex-col gap-3" aria-label={label}>
      <header className="flex items-baseline justify-between gap-2 border-b border-hairline pb-2">
        <h2 className="label-mono text-ink-2">{stage.label}</h2>
        <span className="flex items-center gap-1.5">
          <span className="text-[13px] tabular-nums text-ink-3">{count}</span>
          {onToggle && (
            <button
              type="button"
              onClick={onToggle}
              aria-expanded={true}
              aria-label={`Fold ${stage.label}`}
              className="-my-1 flex h-7 w-7 items-center justify-center rounded-full text-ink-3 transition-colors duration-150 hover:bg-fill hover:text-ink"
            >
              <ChevronsRightLeft className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </span>
      </header>
      {/* A long column scrolls inside itself, so every stage stays on screen
          to drop into; the drag scrolls it when held near either end. */}
      <div
        ref={setNodeRef}
        className={`no-scrollbar flex max-h-[min(68vh,680px)] min-h-[120px] flex-col gap-2.5 overflow-y-auto overscroll-contain rounded-[16px] p-1.5 transition-colors duration-150 ${
          isOver ? "bg-fill outline outline-1 outline-dashed outline-rule-strong" : "bg-transparent"
        }`}
      >
        {children}
      </div>
      {count > COMPACT_AFTER && (
        <p className="px-1.5 text-[12px] text-ink-3">Scroll the column for all {count}</p>
      )}
    </section>
  )
}

export function ApplicationsBoard({ initialJobs }: { initialJobs: SavedJob[] | null }) {
  const [jobs, setJobs] = useState(initialJobs || [])
  const [view, setView] = useState<"board" | "table">("board")
  const [savingId, setSavingId] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  // Closed roles are a record, not work in hand: folded away unless asked for.
  const [closedOpen, setClosedOpen] = useState(false)
  const inProgress = jobs.filter((job) => ["applied", "interviewing"].includes(job.bucket)).length
  const thumb = useThumb(view)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  )
  const activeJob = jobs.find((job) => job.id === activeId) ?? null

  function onDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id))
  }

  function onDragEnd(event: DragEndEvent) {
    setActiveId(null)
    const id = String(event.active.id)
    const target = event.over?.id as JobBucket | undefined
    const job = jobs.find((item) => item.id === id)
    if (job && target && stages.some((stage) => stage.id === target) && job.bucket !== target) moveJob(id, target)
  }

  async function removeJob(id: string) {
    if (removingId) return
    const previous = jobs
    setRemovingId(id)
    setError("")
    setJobs((current) => current.filter((job) => job.id !== id))
    try {
      const response = await fetch(`/api/job-board?id=${encodeURIComponent(id)}`, { method: "DELETE" })
      const result = response.ok ? await response.json() : null
      if (!result?.success) throw new Error("The role could not be removed. Try again.")
      setJobs(result.data)
    } catch (reason) {
      setJobs(previous)
      setError(reason instanceof Error ? reason.message : "The role could not be removed.")
    } finally {
      setRemovingId(null)
    }
  }

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
                <p className="max-w-[58ch] font-serif text-[26px] leading-[1.1] tracking-[-0.03em] text-ink sm:text-[30px]">
                  Saved roles and <em className="text-brand">where each one stands</em>
                </p>
              </div>

              <dl aria-label="Application summary" className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {summary.map((item) => (
                  <div
                    key={item.label}
                    className="flex flex-col gap-1.5 rounded-[14px] border border-hairline bg-sheet px-4 py-3.5 shadow-card-rest"
                  >
                    <dt className="label-mono text-ink-2">{item.label}</dt>
                    <dd className="font-serif text-[26px] leading-[0.95] tracking-[-0.04em] tabular-nums text-ink">
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
                    Save a role from the job board to start tracking it here. Drag it through the stages as your application
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
                      <DndContext
                        sensors={sensors}
                        onDragStart={onDragStart}
                        onDragEnd={onDragEnd}
                        onDragCancel={() => setActiveId(null)}
                      >
                        <div className="flex items-start gap-4">
                          {stages.map((stage) => {
                            const items = jobs.filter((job) => job.bucket === stage.id)
                            const foldable = stage.id === "rejected"
                            return (
                              <StageColumn
                                key={stage.id}
                                stage={stage}
                                count={items.length}
                                collapsed={foldable && !closedOpen}
                                onToggle={foldable ? () => setClosedOpen((open) => !open) : undefined}
                              >
                                {items.map((job) => (
                                  <DraggableJob
                                    key={job.id}
                                    job={job}
                                    disabled={savingId !== null}
                                    onRemove={removeJob}
                                    removing={removingId === job.id}
                                    compact={items.length > COMPACT_AFTER}
                                  />
                                ))}
                                {items.length === 0 && (
                                  <p className="rounded-[12px] border border-dashed border-rule px-3 py-6 text-center text-[13px] text-ink-3">
                                    Drop a role here
                                  </p>
                                )}
                              </StageColumn>
                            )
                          })}
                        </div>
                        <DragOverlay dropAnimation={{ duration: 160 }}>
                          {activeJob ? (
                            <div className="w-[268px] cursor-grabbing rotate-1">
                              <JobCard job={activeJob} dragging />
                            </div>
                          ) : null}
                        </DragOverlay>
                      </DndContext>
                    </div>
                  ) : (
                    <section className="flex flex-col gap-3">
                      <h2 className="sr-only">All saved roles</h2>
                      {jobs.map((job) => (
                        <JobCard key={job.id} job={job} showStage onRemove={removeJob} removing={removingId === job.id} />
                      ))}
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
