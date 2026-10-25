"use client"

import { useState } from "react"
import { SEGMENT, SEGMENTS } from "@/components/resume-studio/pills"
import { useThumb } from "@/components/resume-studio/use-thumb"

/**
 * How a resume reads against one job: the score, the three parts it came
 * from, and the notes behind it.
 *
 * The same shape is produced by /api/match-live for a listing and by
 * /api/match for a pasted description, so both use these.
 */

export interface FitAnalysis {
  breakdown: { skillsMatch: number; experienceMatch: number; educationMatch: number }
  strengths: string[]
  gaps: string[]
  recommendations: string[]
}

export function fitLabel(score: number) {
  if (score >= 80) return "Strong fit"
  if (score >= 60) return "Good fit"
  if (score >= 40) return "Partial fit"
  return "Low fit"
}

/** The headline number, set as a figure rather than a badge. */
export function Score({ value, unit = "match", size = "text-[32px]" }: { value: number; unit?: string; size?: string }) {
  return (
    <p className="flex shrink-0 items-baseline gap-1.5">
      <span className={`font-serif ${size} leading-[0.9] tracking-[-0.04em] tabular-nums text-ink`}>{Math.round(value)}</span>
      <span className="label-mono text-ink-3">{unit}</span>
    </p>
  )
}

export function Breakdown({ breakdown }: { breakdown: FitAnalysis["breakdown"] }) {
  const parts = [
    { label: "Skills", value: breakdown.skillsMatch },
    { label: "Experience", value: breakdown.experienceMatch },
    { label: "Education", value: breakdown.educationMatch },
  ]
  return (
    <dl className="flex flex-col gap-2">
      {parts.map((part) => (
        <div key={part.label} className="flex items-center gap-3">
          <dt className="w-[72px] shrink-0 text-[13px] text-ink-2">{part.label}</dt>
          <div aria-hidden="true" className="relative h-[3px] flex-1 rounded-full bg-fill">
            <div
              style={{ width: `${Math.max(0, Math.min(100, part.value))}%` }}
              className="absolute inset-y-0 left-0 rounded-full bg-ink transition-[width] duration-700 ease-glide motion-reduce:transition-none"
            />
          </div>
          <dd className="w-7 shrink-0 text-right text-[13px] tabular-nums text-ink">{part.value}</dd>
        </div>
      ))}
    </dl>
  )
}

type Facet = "strengths" | "gaps" | "steps"

const FACETS: { key: Facet; label: string }[] = [
  { key: "strengths", label: "Strengths" },
  { key: "gaps", label: "Gaps" },
  { key: "steps", label: "Next steps" },
]

/** The three lists, one at a time, on the segmented track the rest of the app uses. */
export function FitNotes({ analysis, label }: { analysis: FitAnalysis; label: string }) {
  const [facet, setFacet] = useState<Facet>("strengths")
  const thumb = useThumb(facet)

  const lists: Record<Facet, string[]> = {
    strengths: analysis.strengths,
    gaps: analysis.gaps,
    steps: analysis.recommendations,
  }
  const items = lists[facet]

  return (
    <div className="flex flex-col gap-3.5">
      <div ref={thumb.group} role="group" aria-label={label} className={`${SEGMENTS} w-full`}>
        <span ref={thumb.thumb} aria-hidden="true" className={`segment-thumb ${thumb.placed ? "" : "invisible"}`} />
        {FACETS.map((item) => (
          <button
            key={item.key}
            type="button"
            aria-pressed={facet === item.key}
            onClick={() => setFacet(item.key)}
            className={`${SEGMENT} flex-1 px-3 ${facet === item.key ? "text-ink" : "text-ink-3 hover:text-ink"} ${
              facet === item.key && !thumb.placed ? "bg-sheet shadow-[0_1px_3px_rgb(17_24_20/0.14)]" : ""
            }`}
          >
            {item.label}
            <span className="label-mono text-ink-3">{lists[item.key].length}</span>
          </button>
        ))}
      </div>

      {items.length ? (
        <ul className="flex flex-col gap-2">
          {items.map((item, index) => (
            <li key={index} className="flex gap-2.5 text-[14px] leading-relaxed text-ink-2">
              <span aria-hidden="true" className="shrink-0 tabular-nums text-ink-3">
                {facet === "steps" ? `${index + 1}.` : "—"}
              </span>
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-[12px] border border-dashed border-rule px-3 py-6 text-center text-[13px] text-ink-3">
          Nothing identified here
        </p>
      )}
    </div>
  )
}
