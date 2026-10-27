"use client"

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react"
import { Check, Sparkles, X } from "lucide-react"
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
  height,
  describe,
  pinned,
  onHold,
  onLeave,
  onAccept,
  onReject,
  onMore,
}: {
  placed: Placed
  height: number
  describe: string
  pinned: boolean
  onHold: () => void
  onLeave: () => void
  onAccept: () => void
  onReject: () => void
  /** Opens three AI options in place of this one suggestion. */
  onMore?: () => void
}) {
  const [left, top, right, bottom] = placed.area
  // Below the mark, unless that would hang off the foot of the page.
  const below = bottom / height < 0.78
  return (
    <div
      role={pinned ? "dialog" : "tooltip"}
      aria-label={pinned ? "Suggested rewrite" : undefined}
      className="paper-tip"
      data-pinned={pinned || undefined}
      onMouseEnter={onHold}
      onMouseLeave={onLeave}
      style={{
        left: `clamp(150px, ${percent((left + right) / 2, PAGE.width)}, calc(100% - 150px))`,
        ...(below
          ? { top: `calc(${percent(bottom, height)} + 8px)` }
          : { bottom: `calc(${percent(height - top, height)} + 8px)` }),
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
        {onMore && (
          <button
            type="button"
            onClick={onMore}
            className="inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-medium text-brand transition-colors hover:bg-brand/10"
          >
            <Sparkles className="h-3 w-3" aria-hidden="true" />
            More options
          </button>
        )}
      </div>
    </div>
  )
}

export function ResumeMarks({
  rewrites,
  boxes,
  height,
  answered,
  open,
  onOpen,
  onAccept,
  onReject,
  onMoreOptions,
}: {
  /** The rewrites that still match the page. */
  rewrites: readonly BulletRewrite[]
  /** Where each marked line sits, from useMarkBoxes. */
  boxes: MarkBoxes
  /** The page's true height in its own units; the viewBox must match it. */
  height: number
  /** Keys already ticked or crossed; their marks are not drawn. */
  answered: ReadonlySet<string>
  open: string | null
  onOpen: (key: string | null) => void
  onAccept: (rewrite: BulletRewrite) => void
  onReject: (rewrite: BulletRewrite) => void
  /** When set, the card offers "More options": three AI rewrites to choose from. */
  onMoreOptions?: (rewrite: BulletRewrite) => void
}) {
  const describe = useId()

  /**
   * A card opened by hovering closes when you leave; one opened by clicking
   * stays until it is dismissed. Without that, moving the pointer off the
   * line to reach the tick crossed the gap between them and shut the card
   * before it could be answered.
   */
  const [pinned, setPinned] = useState(false)
  // Hovering still needs a moment's grace to cross that gap, so the close is
  // deferred and cancelled if the pointer lands on the card.
  const closing = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hold = useCallback(() => {
    if (closing.current) clearTimeout(closing.current)
    closing.current = null
  }, [])
  const closeSoon = useCallback(
    (key: string) => {
      if (pinned) return
      hold()
      closing.current = setTimeout(() => open === key && onOpen(null), 180)
    },
    [pinned, open, onOpen, hold],
  )
  useEffect(() => () => hold(), [hold])

  const dismiss = useCallback(() => {
    setPinned(false)
    onOpen(null)
  }, [onOpen])
  useEscapeCloses(open, dismiss)

  // A click anywhere else puts a pinned card away, as any other popover does.
  useEffect(() => {
    if (!pinned) return
    const onDown = (event: MouseEvent) => {
      const target = event.target as Element | null
      if (target?.closest(".paper-tip, .paper-hit")) return
      dismiss()
    }
    document.addEventListener("mousedown", onDown)
    return () => document.removeEventListener("mousedown", onDown)
  }, [pinned, dismiss])

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

  return (
    <>
      {/* The viewBox is the page's measured size, not the nominal one, and
          preserveAspectRatio is off: the overlay must map one-to-one onto the
          paper underneath at any zoom, never letterbox itself to fit. */}
      <svg
        viewBox={`0 0 ${PAGE.width} ${height}`}
        preserveAspectRatio="none"
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
            top: percent(mark.area[1], height),
            width: percent(mark.area[2] - mark.area[0], PAGE.width),
            height: percent(mark.area[3] - mark.area[1], height),
          }}
          onMouseEnter={() => {
            hold()
            if (!pinned) onOpen(mark.key)
          }}
          onMouseLeave={() => closeSoon(mark.key)}
          onFocus={() => !pinned && onOpen(mark.key)}
          onClick={() => {
            hold()
            if (pinned && open === mark.key) return dismiss()
            setPinned(true)
            onOpen(mark.key)
          }}
        />
      ))}

      {showing && (
        <Tip
          placed={showing}
          height={height}
          describe={describe}
          pinned={pinned}
          onHold={hold}
          onLeave={() => closeSoon(showing.key)}
          onAccept={() => {
            onAccept(showing.rewrite)
            dismiss()
          }}
          onReject={() => {
            onReject(showing.rewrite)
            dismiss()
          }}
          onMore={
            onMoreOptions
              ? () => {
                  onMoreOptions(showing.rewrite)
                  dismiss()
                }
              : undefined
          }
        />
      )}
    </>
  )
}
