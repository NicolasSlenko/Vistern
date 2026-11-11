"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Minus, Plus } from "lucide-react"
import type { Resume } from "@/app/api/parse/resumeSchema"
import { PAGE, ResumePaper } from "./resume-paper"
import { ResumeMarks, type PaperMark } from "./resume-marks"
import { useMarkBoxes } from "./use-mark-boxes"

/**
 * The page, with the AI's marks on it: the student's resume as a recruiter
 * will see it, and the weak lines marked where they actually are.
 *
 * This is the point of the whole studio — a suggestion listed in a side
 * panel is an abstraction, and a suggestion drawn under the line it is about
 * is a correction. The zoom is here rather than in the studio shell because
 * it belongs to the page, not the layout.
 */

const ZOOMS = [0.6, 0.75, 0.9, 1, 1.25, 1.5]

export function PaperPane({
  resume,
  marks,
  toolbar,
  original,
}: {
  resume: Resume | null
  /** What to draw on the page: line rewrites, review notes, or nothing (see studio/paper-marks.ts). */
  marks: readonly PaperMark[]
  /** Floats at the top of the page, e.g. the button that asks the AI for the marks. */
  toolbar?: React.ReactNode
  /** The file as uploaded, to check our reading of it against. */
  original?: React.ReactNode
}) {
  const paper = useRef<HTMLDivElement>(null)
  const frame = useRef<HTMLDivElement>(null)
  // null means fit to the pane, which is what most people want most of the time.
  const [zoom, setZoom] = useState<number | null>(null)
  const [fitted, setFitted] = useState(1)
  const [open, setOpen] = useState<string | null>(null)
  // What we read from the file is a reconstruction, and it can be wrong. The
  // uploaded page stays one click away so a student can check it.
  const [showing, setShowing] = useState<"marked" | "original">("marked")

  // The keys to measure. Derived here so the hook re-runs when the set changes.
  // Every target, fallbacks included, so a mark can drop to the next if its first isn't printed.
  // Keyed on the joined list, so a new array with the same targets doesn't re-measure.
  const signature = [...new Set(marks.flatMap((mark) => mark.targets))].join("|")
  const keys = useMemo(() => (signature ? signature.split("|") : []), [signature])
  const { boxes, height } = useMarkBoxes(paper, keys)

  const fit = useCallback(() => {
    const pane = frame.current
    if (!pane) return
    // 32px of breathing room, so the page never touches the pane's edge.
    setFitted(Math.min(1.5, Math.max(0.35, (pane.clientWidth - 32) / PAGE.width)))
  }, [])

  useEffect(() => {
    fit()
    const pane = frame.current
    if (!pane) return
    const observer = new ResizeObserver(fit)
    observer.observe(pane)
    return () => observer.disconnect()
  }, [fit])

  const scale = zoom ?? fitted
  const step = (direction: 1 | -1) => {
    const at = ZOOMS.findIndex((value) => value >= scale - 0.001)
    const next = Math.min(ZOOMS.length - 1, Math.max(0, (at === -1 ? ZOOMS.length - 1 : at) + direction))
    setZoom(ZOOMS[next])
  }

  if (!resume) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <p className="text-[13px] text-ink-3">Nothing to show yet.</p>
      </div>
    )
  }

  if (original && showing === "original") {
    return (
      <div className="relative flex min-h-0 flex-1 flex-col">
        {original}
        <ViewSwitch showing={showing} onChoose={setShowing} />
      </div>
    )
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      {/* Room at the top for the toolbar, so it never sits over the name. */}
      <div ref={frame} className={`min-h-0 flex-1 overflow-auto p-4 ${toolbar ? "pt-[68px]" : ""}`}>
        {/* The page is scaled rather than re-laid-out, so a line never
            rewraps as you zoom and the marks stay exactly where they were. */}
        {/* Scaling does not change the room an element reserves, so the
            margin makes up the difference — measured from the page's real
            height, since a long resume runs past one nominal page. */}
        <div
          className="relative mx-auto origin-top"
          style={{ width: PAGE.width, scale, marginBottom: `${height * (scale - 1)}px` }}
        >
          <div ref={paper} className="shadow-[0_1px_2px_rgb(10_24_17/0.08),0_14px_40px_-18px_rgb(10_24_17/0.5)]">
            <ResumePaper resume={resume} />
          </div>
          <ResumeMarks marks={marks} boxes={boxes} height={height} open={open} onOpen={setOpen} />
        </div>
      </div>

      {toolbar && (
        <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex justify-center px-3">
          <div className="glass glass-float pointer-events-auto flex max-w-full flex-wrap items-center justify-center gap-1.5 rounded-full p-1">{toolbar}</div>
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-3 flex flex-wrap items-center justify-center gap-2 px-3">
        {original && <ViewSwitch showing={showing} onChoose={setShowing} floating={false} />}
        <div className="glass glass-float pointer-events-auto flex items-center gap-1 rounded-full p-1">
          <button
            type="button"
            onClick={() => step(-1)}
            aria-label="Zoom out"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-ink-2 transition-colors hover:text-ink"
          >
            <Minus className="h-4 w-4" aria-hidden="true" />
          </button>
          <span className="min-w-[46px] text-center text-[13px] tabular-nums text-ink-2">{Math.round(scale * 100)}%</span>
          <button
            type="button"
            onClick={() => step(1)}
            aria-label="Zoom in"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-ink-2 transition-colors hover:text-ink"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setZoom(null)}
            aria-pressed={zoom === null}
            className={`ml-0.5 inline-flex h-8 items-center rounded-full px-3 text-[13px] font-medium transition-colors ${
              zoom === null ? "bg-ink text-sheet" : "text-ink-2 hover:text-ink"
            }`}
          >
            Fit
          </button>
        </div>
      </div>
    </div>
  )
}

/** Our reading of the resume, or the file the student actually uploaded. */
function ViewSwitch({
  showing,
  onChoose,
  floating = true,
}: {
  showing: "marked" | "original"
  onChoose: (view: "marked" | "original") => void
  floating?: boolean
}) {
  return (
    <div
      role="group"
      aria-label="What to show"
      className={`glass glass-float pointer-events-auto flex items-center gap-1 rounded-full p-1 ${
        floating ? "absolute bottom-3 left-1/2 -translate-x-1/2" : ""
      }`}
    >
      {(["marked", "original"] as const).map((view) => (
        <button
          key={view}
          type="button"
          aria-pressed={showing === view}
          onClick={() => onChoose(view)}
          className={`inline-flex h-8 items-center rounded-full px-3 text-[13px] font-medium transition-colors ${
            showing === view ? "bg-ink text-sheet" : "text-ink-2 hover:text-ink"
          }`}
        >
          {view === "marked" ? "Marked up" : "Original"}
        </button>
      ))}
    </div>
  )
}
