"use client"

import { useEffect, useId, useMemo } from "react"
import { Check, X } from "lucide-react"
import { rewriteKey, type BulletRewrite, type Severity } from "@/lib/resume-suggestions"
import { bracket, seedOf, underline, type Box } from "./rough"
import { PAGE } from "./resume-paper"
import type { MarkBoxes } from "./use-mark-boxes"

/**
 * The AI's marks, drawn over the page itself.
 *
 * A flagged bullet gets a pen line under it and, where it runs to more than
 * one line, a bracket down the margin holding the whole thing together.
 * Pointing at a mark — or tabbing to it — shows what the AI would write
 * instead, with a tick and a cross on the card so the line can be answered
 * without leaving the page.
 *
 * Adapted from resumezip's review marks
 * (MIT, © 2025 Ian Hoang — https://github.com/ian-hoang/resumezip).
 */

const SEVERITY_NAME: Record<Severity, string> = { fix: "Must fix", look: "Worth a look", optional: "Polish" }

/** A mark ready to draw: its rewrite, the lines it covers, and the area that answers to the pointer. */
interface Placed {
  key: string
  rewrite: BulletRewrite
  boxes: Box[]
  area: Box
}

/** The area a mark answers to: its lines, plus room for the bracket in the margin. */
function areaOf(boxes: Box[], bracketed: boolean): Box {
  return [
    Math.min(...boxes.map((box) => box[0])) - (bracketed ? 10 : 3),
    Math.min(...boxes.map((box) => box[1])) - 2,
    Math.max(...boxes.map((box) => box[2])) + 3,
    Math.max(...boxes.map((box) => box[3])) + 3,
  ]
}

const percent = (part: number, whole: number) => `${(part / whole) * 100}%`

/** Esc puts away whatever card is showing, wherever focus is. */
function useEscapeCloses(open: string | null, onOpen: (key: string | null) => void) {
  useEffect(() => {
    if (open === null) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpen(null)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onOpen])
}

/** What the AI would write instead, and the two ways to answer it. */
function Tip({
  placed,
  describe,
  onAccept,
  onReject,
}: {
  placed: Placed
  describe: string
  onAccept: () => void
  onReject: () => void
}) {
  const [left, top, right, bottom] = placed.area
  // Below the mark, unless that would hang off the foot of the page.
  const below = bottom / PAGE.height < 0.78
  return (
    <div
      role="tooltip"
      className="paper-tip"
      style={{
        left: `clamp(150px, ${percent((left + right) / 2, PAGE.width)}, calc(100% - 150px))`,
        ...(below
          ? { top: `calc(${percent(bottom, PAGE.height)} + 8px)` }
          : { bottom: `calc(${percent(PAGE.height - top, PAGE.height)} + 8px)` }),
      }}
    >
      <p className={`label-mono ${placed.rewrite.severity === "fix" ? "text-alert" : "text-caution"}`}>
        {SEVERITY_NAME[placed.rewrite.severity]}
      </p>
      <div id={describe}>
        <p className="mt-1 text-[13.5px] leading-snug text-ink">{placed.rewrite.suggested}</p>
        <p className="mt-1.5 text-[12px] leading-snug text-ink-2">{placed.rewrite.why}</p>
      </div>
      <div className="mt-2.5 flex items-center gap-2">
        <button
          type="button"
          onClick={onAccept}
          className="inline-flex h-7 items-center gap-1.5 rounded-full bg-brand px-2.5 text-[12px] font-medium text-sheet transition-[filter,scale] hover:brightness-110 active:scale-[0.97]"
        >
          <Check className="h-3 w-3" aria-hidden="true" />
          Use this
        </button>
        <button
          type="button"
          onClick={onReject}
          className="inline-flex h-7 items-center gap-1.5 rounded-full bg-fill px-2.5 text-[12px] font-medium text-ink-2 transition-colors hover:text-ink"
        >
          <X className="h-3 w-3" aria-hidden="true" />
          Keep mine
        </button>
      </div>
    </div>
  )
}

export function ResumeMarks({
  rewrites,
  boxes,
  answered,
  open,
  onOpen,
  onAccept,
  onReject,
}: {
  /** The rewrites that still match the page. */
  rewrites: readonly BulletRewrite[]
  /** Where each marked line sits, from useMarkBoxes. */
  boxes: MarkBoxes
  /** Keys already ticked or crossed; their marks are not drawn. */
  answered: ReadonlySet<string>
  open: string | null
  onOpen: (key: string | null) => void
  onAccept: (rewrite: BulletRewrite) => void
  onReject: (rewrite: BulletRewrite) => void
}) {
  const describe = useId()
  useEscapeCloses(open, onOpen)

  // In reading order, so the pen goes down the page and Tab follows it.
  const placed = useMemo<Placed[]>(
    () =>
      rewrites
        .flatMap((rewrite) => {
          const key = rewriteKey(rewrite)
          const lines = boxes.get(key)
          if (!lines?.length || answered.has(key)) return []
          return [{ key, rewrite, boxes: lines, area: areaOf(lines, lines.length > 1) }]
        })
        .sort((a, b) => a.area[1] - b.area[1] || a.area[0] - b.area[0]),
    [rewrites, boxes, answered],
  )

  const showing = placed.find((mark) => mark.key === open)
  const leave = (key: string) => {
    if (open === key) onOpen(null)
  }

  return (
    <>
      <svg
        viewBox={`0 0 ${PAGE.width} ${PAGE.height}`}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
      >
        {placed.map((mark, index) => {
          const seed = seedOf(mark.key)
          // A bullet that wraps gets a bracket holding its lines together as
          // well as the lines under them; a single line only needs the line.
          const paths = [
            ...mark.boxes.map((box, line) => underline(box, seed + line, 0.5)),
            ...(mark.boxes.length > 1 ? [bracket(mark.boxes, seed)] : []),
          ]
          return (
            <g
              key={mark.key}
              className="paper-scribble"
              data-ink={mark.rewrite.severity}
              data-quiet={open !== null && open !== mark.key ? "" : undefined}
              style={{ "--delay": `${index * 90}ms` } as React.CSSProperties}
            >
              {paths
                .join(" ")
                .split(/ (?=M)/)
                .map((d, pass) => (
                  <path key={pass} d={d} pathLength={1} />
                ))}
            </g>
          )
        })}
      </svg>

      {placed.map((mark) => (
        <button
          key={mark.key}
          type="button"
          className="paper-hit"
          aria-label={`${SEVERITY_NAME[mark.rewrite.severity]}: ${mark.rewrite.why}`}
          aria-describedby={open === mark.key ? describe : undefined}
          style={{
            left: percent(mark.area[0], PAGE.width),
            top: percent(mark.area[1], PAGE.height),
            width: percent(mark.area[2] - mark.area[0], PAGE.width),
            height: percent(mark.area[3] - mark.area[1], PAGE.height),
          }}
          onMouseEnter={() => onOpen(mark.key)}
          onMouseLeave={() => leave(mark.key)}
          onFocus={() => onOpen(mark.key)}
          onClick={() => onOpen(open === mark.key ? null : mark.key)}
        />
      ))}

      {showing && (
        <Tip
          placed={showing}
          describe={describe}
          onAccept={() => {
            onAccept(showing.rewrite)
            onOpen(null)
          }}
          onReject={() => {
            onReject(showing.rewrite)
            onOpen(null)
          }}
        />
      )}
    </>
  )
}
