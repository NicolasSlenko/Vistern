"use client"

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react"
import { Check, CheckCheck, Sparkles, X } from "lucide-react"
import type { Severity } from "@/lib/resume-suggestions"
import { bracket, seedOf, underline, type Box } from "./rough"
import { PAGE } from "./resume-paper"
import type { MarkBoxes } from "./use-mark-boxes"

/**
 * The AI's marks, drawn over the page itself.
 *
 * A flagged line gets a pen line under it and, where it runs to more than
 * one line, a bracket down the margin holding the whole thing together.
 * Pointing at a mark — or tabbing to it — shows what the AI has to say; a
 * click pins the card and takes the form to the line it is about, so it can
 * be answered on the page or edited in place.
 *
 * Two kinds of thing are drawn: line rewrites (Suggestions), with a tick and
 * a cross, and review notes (Review), about a whole entry or section, which
 * are ticked off once dealt with. Notes that land on the same line share one
 * mark and one card.
 *
 * Adapted from resumezip's review marks
 * (MIT, © 2025 Ian Hoang — https://github.com/ian-hoang/resumezip).
 */

export const SEVERITY_NAME: Record<Severity, string> = { fix: "Must fix", look: "Worth a look", optional: "Polish" }
const SEVERITY_ORDER: Severity[] = ["fix", "look", "optional"]

/** One thing the AI says about a line, and what can be done about it. */
export interface MarkNote {
  id: string
  severity: Severity
  /** Above the text: what it's about, when that isn't obvious from the line. */
  eyebrow?: string
  text: string
  why?: string
  /** A rewrite: "Use this" / "Keep mine" / "More options". */
  onAccept?: () => void
  onReject?: () => void
  onMore?: () => void
  /** A review note: ticked off once dealt with. */
  onDone?: () => void
}

/** Something to draw: the line it belongs on, and what's said about it. */
export interface PaperMark {
  /**
   * The `data-mark` keys it can sit on, best first. A note about a section the
   * page doesn't print falls back to the next one (in the end, the name).
   */
  targets: string[]
  note: MarkNote
  /** Takes the form to whatever the mark is about. */
  onGoTo?: () => void
}

/** A mark ready to draw: the notes on one line, the line's boxes, and the area that answers to the pointer. */
interface Placed {
  key: string
  notes: MarkNote[]
  severity: Severity
  boxes: Box[]
  area: Box
  onGoTo?: () => void
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

const BUTTON = "inline-flex h-7 shrink-0 whitespace-nowrap items-center gap-1.5 rounded-full px-2.5 text-[12px] font-medium"

/** One note on the card, with whatever answers it has. */
function NoteBody({ note, first, after }: { note: MarkNote; first: boolean; after: () => void }) {
  const run = (action?: () => void) =>
    action
      ? () => {
          action()
          after()
        }
      : undefined
  const accept = run(note.onAccept)
  const reject = run(note.onReject)
  const more = run(note.onMore)
  const done = run(note.onDone)
  return (
    <div className={first ? "" : "mt-3 border-t border-hairline pt-3"}>
      <p className={`label-mono ${note.severity === "fix" ? "text-alert" : note.severity === "look" ? "text-caution" : "text-brand"}`}>
        {SEVERITY_NAME[note.severity]}
        {note.eyebrow && <span className="text-ink-3"> · {note.eyebrow}</span>}
      </p>
      <p className="mt-1 text-[13.5px] leading-snug text-ink">{note.text}</p>
      {note.why && <p className="mt-1.5 text-[12px] leading-snug text-ink-2">{note.why}</p>}
      {(accept || reject || more || done) && (
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {accept && (
            <button type="button" onClick={accept} className={`${BUTTON} bg-brand text-sheet transition-[filter,scale] hover:brightness-110 active:scale-[0.97]`}>
              <Check className="h-3 w-3" aria-hidden="true" />
              Use this
            </button>
          )}
          {reject && (
            <button type="button" onClick={reject} className={`${BUTTON} bg-fill text-ink-2 transition-colors hover:text-ink`}>
              <X className="h-3 w-3" aria-hidden="true" />
              Keep mine
            </button>
          )}
          {more && (
            <button type="button" onClick={more} className={`${BUTTON} text-brand transition-colors hover:bg-brand/10`}>
              <Sparkles className="h-3 w-3" aria-hidden="true" />
              More options
            </button>
          )}
          {done && (
            <button type="button" onClick={done} className={`${BUTTON} bg-fill text-ink-2 transition-colors hover:text-ink`}>
              <CheckCheck className="h-3 w-3" aria-hidden="true" />
              Done
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/** What the AI has to say about one line, and the ways to answer it. */
function Tip({
  placed,
  height,
  describe,
  pinned,
  onHold,
  onLeave,
  onAnswered,
}: {
  placed: Placed
  height: number
  describe: string
  pinned: boolean
  onHold: () => void
  onLeave: () => void
  onAnswered: () => void
}) {
  const [left, top, right, bottom] = placed.area
  // Below the mark, unless that would hang off the foot of the page.
  const below = bottom / height < 0.62
  // With several notes the card scrolls rather than running off the pane.
  return (
    <div
      role={pinned ? "dialog" : "tooltip"}
      aria-label={pinned ? "What the AI says about this line" : undefined}
      className="paper-tip max-h-[340px] overflow-y-auto"
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
      <div id={describe}>
        {placed.notes.map((note, index) => (
          // A one-note card closes once that note is answered; with more, the rest stay.
          <NoteBody key={note.id} note={note} first={index === 0} after={placed.notes.length === 1 ? onAnswered : () => {}} />
        ))}
      </div>
    </div>
  )
}

export function ResumeMarks({
  marks,
  boxes,
  height,
  open,
  onOpen,
}: {
  marks: readonly PaperMark[]
  /** Where each target sits, from useMarkBoxes. */
  boxes: MarkBoxes
  /** The page's true height in its own units; the viewBox must match it. */
  height: number
  open: string | null
  onOpen: (key: string | null) => void
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

  // A click anywhere else puts a pinned card away, as any other popover does —
  // except in the form, where the click that opened it just took the student.
  useEffect(() => {
    if (!pinned) return
    const onDown = (event: MouseEvent) => {
      const target = event.target as Element | null
      if (target?.closest(".paper-tip, .paper-hit, [data-tour='studio-form']")) return
      dismiss()
    }
    document.addEventListener("mousedown", onDown)
    return () => document.removeEventListener("mousedown", onDown)
  }, [pinned, dismiss])

  // Each mark goes on the first of its targets the page actually prints; marks
  // on the same line become one. Then in reading order, so the pen goes down
  // the page and Tab follows it.
  const placed = useMemo<Placed[]>(() => {
    const byLine = new Map<string, Placed>()
    for (const mark of marks) {
      const key = mark.targets.find((target) => boxes.get(target)?.length)
      if (!key) continue
      const lines = boxes.get(key)!
      const existing = byLine.get(key)
      if (existing) {
        existing.notes.push(mark.note)
        if (SEVERITY_ORDER.indexOf(mark.note.severity) < SEVERITY_ORDER.indexOf(existing.severity)) existing.severity = mark.note.severity
        existing.onGoTo ??= mark.onGoTo
      } else {
        byLine.set(key, { key, notes: [mark.note], severity: mark.note.severity, boxes: lines, area: areaOf(lines, lines.length > 1), onGoTo: mark.onGoTo })
      }
    }
    return [...byLine.values()]
      .map((item) => ({ ...item, notes: [...item.notes].sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity)) }))
      .sort((a, b) => a.area[1] - b.area[1] || a.area[0] - b.area[0])
  }, [marks, boxes])

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
          // A line that wraps gets a bracket holding its lines together as
          // well as the lines under them; a single line only needs the line.
          const paths = [
            ...mark.boxes.map((box, line) => underline(box, seed + line, 0.5)),
            ...(mark.boxes.length > 1 ? [bracket(mark.boxes, seed)] : []),
          ]
          return (
            <g
              key={mark.key}
              className="paper-scribble"
              data-ink={mark.severity}
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
          aria-label={`${SEVERITY_NAME[mark.severity]}: ${mark.notes.map((note) => note.why || note.text).join(" · ")}`}
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
            // Take the form to the line, so it can be answered or edited there too.
            mark.onGoTo?.()
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
          onAnswered={dismiss}
        />
      )}
    </>
  )
}
