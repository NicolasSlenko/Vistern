"use client"

import { useMemo, useState, type ReactNode } from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

/**
 * The tree: one leaf for every piece of work the student has finished.
 *
 * The version this replaces was a progress bar wearing a tree costume — a
 * single percentage grew it, and no leaf stood for anything. Here each leaf
 * *is* one finished thing, and choosing it says which. That makes the picture
 * worth looking at twice: it is a record, not a gauge, and it answers the
 * question a student actually has, which is "what have I actually done?"
 *
 * Home and the completed-work page show the same tree from the same
 * component, so a leaf is in the same place on both. The page that wants to
 * drive its own detail panel passes `selected` and `onSelect` and the tree
 * keeps quiet; the page that just wants a tree lets it answer for itself.
 *
 * Tree art adapted from Pablo's student-experience prototype.
 */

/** One finished thing, as a leaf. */
export interface GardenLeaf {
  id: string
  title: string
  /** Which green it takes. */
  tone: "project" | "learning" | "exploration" | "practice" | "community" | "preparation" | "track"
  /** What kind of thing it was: "Project", "Career track". */
  label: string
  /** A line of what came of it. */
  note?: string
  /** When it was finished. */
  date?: string | null
  /** Where to go to see it in full. */
  href?: string
}

/** Where a leaf can grow, in the order they fill: up from the sprout, out to the crown. */
interface Anchor {
  x: number
  y: number
  /** Which way it points, in degrees. */
  angle: number
  length: number
}

// Taken from the branch ends of the original drawing, lowest first, so the
// tree fills from the ground up as the work accumulates.
const ANCHORS: Anchor[] = [
  { x: 140, y: 240, angle: 219, length: 38 },
  { x: 142, y: 225, angle: 318, length: 38 },
  { x: 105, y: 180, angle: 220, length: 44 },
  { x: 175, y: 168, angle: 305, length: 44 },
  { x: 123, y: 165, angle: 243, length: 42 },
  { x: 120, y: 130, angle: 254, length: 40 },
  { x: 145, y: 152, angle: 254, length: 46 },
  { x: 155, y: 129, angle: 313, length: 44 },
  { x: 111, y: 121, angle: 227, length: 46 },
  { x: 148, y: 104, angle: 266, length: 48 },
  { x: 184, y: 97, angle: 300, length: 44 },
  { x: 180, y: 188, angle: 337, length: 42 },
  { x: 87, y: 186, angle: 214, length: 42 },
  { x: 196, y: 170, angle: 326, length: 42 },
]

/**
 * More finished work than the drawing has branch ends: the extra leaves ring
 * the crown, each a little further round and out, so a very full tree still
 * reads as a tree rather than a pile.
 */
function anchorFor(index: number): Anchor {
  if (index < ANCHORS.length) return ANCHORS[index]
  const extra = index - ANCHORS.length
  const angle = -150 + ((extra * 47) % 240)
  const radius = 76 + (extra % 3) * 13
  const radians = (angle * Math.PI) / 180
  return {
    x: 145 + Math.cos(radians) * radius * 0.92,
    y: 132 + Math.sin(radians) * radius * 0.78,
    angle: angle + 360,
    length: 36,
  }
}

/** A leaf pointing along +x from the origin, to be rotated into place. */
function leafPath(length: number): string {
  const width = length * 0.42
  return `M0 0 C${length * 0.28} ${-width} ${length * 0.78} ${-width * 0.82} ${length} 0 C${length * 0.78} ${width * 0.82} ${length * 0.28} ${width} 0 0 Z`
}

const TONE_FILL: Record<GardenLeaf["tone"], string> = {
  project: "var(--leaf-deep)",
  track: "var(--leaf-deep)",
  learning: "var(--leaf-light)",
  exploration: "var(--leaf-light)",
  practice: "var(--leaf-mid)",
  community: "var(--leaf-mid)",
  preparation: "var(--leaf-pale)",
}

const monthYear = (date?: string | null) =>
  date ? new Date(date).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : null

/** The bare tree: trunk and branches, drawn whatever the student has done. */
function Wood() {
  return (
    <g className="garden-wood">
      <path d="M141 266 C137 247 140 229 143 209" />
      <path d="M140 240 Q128 230 116 229 M142 225 Q154 218 163 210" />
      <path d="M143 209 C148 186 143 171 147 149" />
      <path d="M145 203 C131 192 112 180 95 176" />
      <path d="M146 185 C157 177 176 167 187 151" />
      <path d="M146 160 C133 150 123 140 119 126" />
      <path d="M147 149 C154 127 150 108 147 88" />
      <path d="M152 124 C167 111 181 102 188 89" />
      <path d="M145 145 C124 140 107 122 102 102" />
      <path d="M145 201 C154 197 172 195 185 184" />
      <path d="M119 188 C105 188 89 189 76 180" />
      <path d="M168 172 C179 172 193 173 205 166" />
    </g>
  )
}

export function GrowthGarden({
  leaves,
  selected,
  onSelect,
  emptyNote = "Nothing has grown yet. Finish something and the first leaf appears here.",
  className = "",
  children,
}: {
  /** Oldest first: a leaf then keeps its place on the tree as more is added. */
  leaves: GardenLeaf[]
  /** Set these two to drive the choice from outside; the tree then shows no card of its own. */
  selected?: string | null
  onSelect?: (id: string | null) => void
  emptyNote?: string
  className?: string
  /** Shown under the tree in place of the summary line. */
  children?: ReactNode
}) {
  const controlled = onSelect !== undefined
  const [ownChoice, setOwnChoice] = useState<string | null>(null)
  const chosen = controlled ? (selected ?? null) : ownChoice
  const choose = (id: string | null) => (controlled ? onSelect(id) : setOwnChoice(id))

  const showing = useMemo(() => leaves.find((leaf) => leaf.id === chosen) ?? null, [leaves, chosen])

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <div className="garden relative">
        <svg
          viewBox="0 0 280 300"
          className="w-full"
          role="img"
          aria-label={
            leaves.length
              ? `Your tree, with ${leaves.length} ${leaves.length === 1 ? "leaf for the one thing" : `leaves for the ${leaves.length} things`} you have finished`
              : "Your tree, not yet grown"
          }
        >
          <ellipse className="garden-soil" cx="141" cy="267" rx="53" ry="6" />
          <path className="garden-ground" d="M79 267 C111 269 167 269 201 267" />
          <Wood />

          {leaves.length === 0 && (
            <g className="garden-seed">
              <path d="M135 267 C132 260 139 256 148 261 C150 269 143 274 135 267Z" />
              <path className="garden-seed-line" d="M137 267 Q141 263 146 262" />
            </g>
          )}

          {leaves.map((leaf, index) => {
            const anchor = anchorFor(index)
            const open = leaf.id === chosen
            return (
              <g
                key={leaf.id}
                className="garden-leaf"
                data-open={open || undefined}
                data-quiet={chosen !== null && !open ? "" : undefined}
                // Unfurls in turn, so a new leaf is visibly the newest.
                style={{ "--delay": `${Math.min(index, 18) * 70}ms` } as React.CSSProperties}
                transform={`translate(${anchor.x} ${anchor.y}) rotate(${anchor.angle})`}
              >
                {/* Only the drawing grows under the pointer. The target below
                    is a sibling and never moves: scaling the two together
                    slid the target out from under the pointer, which
                    unhovered it, which shrank it back — a leaf that flickered
                    as fast as the browser could redraw it. */}
                <g className="garden-leaf-art">
                  <path d={leafPath(anchor.length)} fill={TONE_FILL[leaf.tone]} />
                  <path className="garden-vein" d={`M${anchor.length * 0.12} 0 L${anchor.length * 0.82} 0`} />
                </g>
                <circle
                  className="garden-hit"
                  cx={anchor.length * 0.5}
                  cy="0"
                  r={Math.max(13, anchor.length * 0.42)}
                  tabIndex={0}
                  role="button"
                  aria-pressed={open}
                  aria-label={`${leaf.label}: ${leaf.title}`}
                  onClick={() => choose(open ? null : leaf.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault()
                      choose(open ? null : leaf.id)
                    }
                  }}
                />
              </g>
            )
          })}
        </svg>
      </div>

      {children ?? (
        // Held to a minimum height so choosing a leaf never shifts the tree.
        <div className="min-h-[76px]">
          {showing ? (
            <div className="flex flex-col gap-1.5 rounded-[14px] border border-hairline bg-sheet p-3.5 shadow-card-rest">
              <div className="flex items-baseline justify-between gap-2">
                <span className="label-mono text-ink-2">{showing.label}</span>
                {monthYear(showing.date) && <span className="text-[12px] text-ink-3">{monthYear(showing.date)}</span>}
              </div>
              <p className="text-[15px] font-medium leading-snug tracking-[-0.01em] text-ink">{showing.title}</p>
              {showing.note && <p className="line-clamp-3 text-[13px] leading-snug text-ink-2">{showing.note}</p>}
              {showing.href && (
                <Link
                  href={showing.href}
                  className="mt-0.5 inline-flex items-center gap-1 self-start text-[13px] font-medium text-brand hover:underline"
                >
                  Open it
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              )}
            </div>
          ) : leaves.length === 0 ? (
            <p className="text-[13px] leading-snug text-ink-2">{emptyNote}</p>
          ) : (
            <p className="text-[13px] leading-snug text-ink-2">
              {leaves.length} {leaves.length === 1 ? "leaf, one for the thing" : "leaves, one for each thing"} you have finished.{" "}
              <span className="text-ink-3">Choose one to see what it was.</span>
            </p>
          )}
        </div>
      )}
    </div>
  )
}
