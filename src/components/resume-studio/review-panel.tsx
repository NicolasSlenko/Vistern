"use client"

import type React from "react"
import { useId, useMemo, useState } from "react"
import { Check, RotateCcw, Target } from "lucide-react"
import type { Resume } from "@/app/api/parse/resumeSchema"
import { calculateResumeScoreDetailed } from "@/lib/resumeScoring"
import {
  careerGoals,
  reviewNotes,
  TIER_DOT,
  TIER_NAMES,
  TIERS,
  YEAR_NAMES,
  type ReviewNote,
  type Tier,
  type XyzFeedback,
} from "./review-notes"
import type { SectionRef } from "./sections"
import { useDismissedNotes } from "./use-dismissed-notes"

/**
 * What the AI found, in the left column. The score at the top with its
 * breakdown, then the notes: must-fix first, one open at a time to say why
 * and what to write instead. Choosing one opens the card it's about.
 *
 * The look is adapted from resumezip's Check panel (MIT, © 2025 Ian Hoang);
 * everything it shows comes from Vistern's own XYZ analysis.
 */

/**
 * The score, rolling like an odometer when it changes. Each digit is a strip
 * of 0 to 9 drawn by CSS (.odometer-digit), so the page's text — and what's
 * read aloud — is just the number, which sits unseen under it.
 */
function Odometer({ value }: { value: number }) {
  const digits = String(Math.max(0, Math.min(100, Math.round(value)))).split("").map(Number)
  return (
    <span className="relative">
      <span className="sr-only">{value}</span>
      <span aria-hidden="true" className="flex">
        {digits.map((digit, index) => (
          // Keyed from the right, so 99 → 100 slides the existing digits
          // along rather than re-mounting them.
          <span key={digits.length - 1 - index} className="odometer-digit" style={{ "--digit": digit } as React.CSSProperties} />
        ))}
      </span>
    </span>
  )
}

function Dot({ tier }: { tier: Tier }) {
  return <span aria-hidden="true" className={`block h-[7px] w-[7px] shrink-0 rounded-full ${TIER_DOT[tier]}`} />
}

function Note({
  note,
  opened,
  onOpen,
  onGo,
  onDone,
}: {
  note: ReviewNote
  opened: boolean
  onOpen: () => void
  onGo: () => void
  onDone: () => void
}) {
  const details = useId()
  return (
    <li className="group/note flex flex-col border-t border-rule first:border-t-0">
      <div className="flex items-start gap-1">
        <button
          type="button"
          aria-expanded={opened}
          aria-controls={opened ? details : undefined}
          onClick={() => {
            onOpen()
            onGo()
          }}
          className="flex min-w-0 flex-1 items-start gap-2.5 px-0.5 py-3 text-left transition-colors hover:bg-ink/[0.02] focus-visible:outline-offset-[-2px]"
        >
          <span className="mt-[7px]">
            <Dot tier={note.tier} />
          </span>
          <span className="flex min-w-0 flex-col gap-0.5">
            {note.entryName && <span className="label-mono text-ink-3">{note.entryName}</span>}
            <span className="text-sm leading-snug text-ink">{note.text}</span>
          </span>
        </button>
        {/* Ticking a note puts it away. A review can return dozens at once,
            and a list that never shrinks stops being read. */}
        <button
          type="button"
          onClick={onDone}
          aria-label={`Done: ${note.text}`}
          title="Mark as done"
          className="mt-[9px] inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-ink-3 opacity-0 transition-[opacity,color,background] hover:bg-brand/10 hover:text-brand focus-visible:opacity-100 group-hover/note:opacity-100"
        >
          <Check className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      {opened && note.why && (
        <div id={details} className="flex flex-col gap-2.5 pb-3.5 pl-[19px] pr-0.5">
          <p className="text-[13px] leading-snug text-ink-2">{note.why}</p>
        </div>
      )}
    </li>
  )
}

/** The scale under the score, and the categories that make it up with dotted leaders to their points. */
function Breakdown({ resume, feedback }: { resume: Resume; feedback: XyzFeedback | null }) {
  const result = useMemo(() => calculateResumeScoreDetailed(resume, feedback ?? undefined), [resume, feedback])
  const total = Math.round(result.totalScore)
  const perfect = total >= 95

  return (
    <div {...(perfect ? { "data-perfect": "" } : {})} className="flex flex-col gap-4">
      <div className="flex items-baseline gap-2.5">
        <span className="score-number font-serif text-[72px] leading-[0.9] tracking-[-0.045em] tabular-nums text-ink">
          <Odometer value={total} />
        </span>
        <span className="label-mono tracking-[0.04em] text-ink-2" aria-hidden="true">
          / 100
        </span>
      </div>

      <div className="relative h-[3px] rounded-full bg-rule">
        <div
          style={{ scale: `${total / 100} 1` }}
          className="score-fill absolute inset-0 origin-left rounded-full bg-ink transition-[scale] duration-1000 ease-glide motion-reduce:transition-none starting:[scale:0_1]"
        />
      </div>

      <dl className="flex flex-col">
        {result.breakdown.map((row) => (
          <div key={row.category} className="flex items-baseline justify-between gap-2 border-b border-hairline py-[7px] last:border-b-0">
            <dt className="check-leader min-w-0 flex-1 text-[13px] capitalize text-ink-2">
              <span>{row.category}</span>
            </dt>
            <dd className="shrink-0 text-[13px] tabular-nums text-ink">
              {Math.round(row.combinedScore)}
              <span className="text-ink-3"> / 100</span>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

export function ReviewPanel({
  resume,
  feedback,
  asking,
  onAsk,
  onGoTo,
  notes,
  hidden = 0,
  onDone,
  onRestore,
}: {
  resume: Resume | null
  feedback: XyzFeedback | null
  asking: boolean
  onAsk: () => void
  /** Opens the section a note points at, and the card inside it. */
  onGoTo: (section: SectionRef, entryIndex?: number) => void
  /**
   * The notes still worth showing. Held by the studio rather than here, so
   * the dots on the cards and the counts in the section list agree with
   * this list — a note ticked off should disappear from all three.
   */
  notes: ReviewNote[]
  hidden?: number
  onDone: (note: ReviewNote) => void
  onRestore: () => void
}) {
  const heading = useId()
  const [chosen, setChosen] = useState<string | null>(null)
  const goals = useMemo(() => careerGoals(feedback), [feedback])

  if (asking) {
    return (
      <section aria-labelledby={heading} className="flex flex-col gap-3">
        <h2 id={heading} className="label-mono text-ink-2">
          AI review
        </h2>
        <div className="flex flex-col gap-3 border-t border-ink pt-3.5">
          <p className="text-balance font-serif text-[30px] leading-[1.02] tracking-[-0.03em] text-ink">
            Reading it like a <em className="text-brand">recruiter…</em>
          </p>
          <p className="text-[13px] leading-snug text-ink-2">Every bullet, not just the first seven seconds.</p>
          {/* Three bars filling in turn, where the notes will be. */}
          <div aria-hidden="true" className="mt-2 flex flex-col gap-3">
            {[0, 1, 2].map((row) => (
              <div key={row} className="h-[9px] overflow-hidden rounded-full bg-fill motion-reduce:hidden">
                <div
                  style={{ animationDelay: `${row * 180}ms` }}
                  className="h-full w-1/3 rounded-full bg-brand/40 [animation:score-glint_1.6s_ease-in-out_infinite]"
                />
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (!resume) {
    return (
      <section aria-labelledby={heading} className="flex flex-col gap-3">
        <h2 id={heading} className="label-mono text-ink-2">
          AI review
        </h2>
        <p className="text-[13px] leading-snug text-ink-2">Add something to your profile first, and the AI will have something to read.</p>
      </section>
    )
  }

  if (notes.length === 0) {
    return (
      <section aria-labelledby={heading} className="flex flex-col gap-3">
        <h2 id={heading} className="label-mono text-ink-2">
          AI review
        </h2>
        <p className="font-serif text-[30px] leading-[1.02] tracking-[-0.03em] text-ink">
          What a recruiter <em className="text-brand">notices</em>
        </p>
        <p className="text-[13px] leading-snug text-ink-2">
          An AI reads every bullet the way a recruiter skims it, scores each role and project, and says what to rewrite.
        </p>
        <button type="button" onClick={onAsk} className="ai-ask glass mt-1">
          Get AI notes
        </button>
      </section>
    )
  }

  const byTier = TIERS.map((tier) => ({ tier, notes: notes.filter((note) => note.tier === tier) }))
  // The first listed is open until another is chosen.
  const opened = chosen ?? notes[0]?.id

  return (
    <section aria-labelledby={heading} className="flex flex-col gap-5">
      <h2 id={heading} className="label-mono text-ink-2">
        AI review
      </h2>

      <Breakdown resume={resume} feedback={feedback} />

      {/* How many of each kind there are, as a line across the top of the notes. */}
      <div className="grid grid-cols-3 border-y border-b-rule border-t-ink">
        {byTier.map(({ tier, notes: group }) => (
          <div key={tier} className="flex min-w-0 flex-col gap-1 py-3 not-last:border-r not-last:border-rule not-first:pl-2.5">
            <span className="flex items-center gap-1.5">
              <Dot tier={tier} />
              <span className="font-serif text-[28px] leading-[0.9] tracking-[-0.04em] text-ink">{group.length}</span>
            </span>
            {/* The column is narrow, so the name wraps rather than being cut short. */}
            <span className="label-mono leading-[1.35] text-ink-2">{TIER_NAMES[tier].many}</span>
          </div>
        ))}
      </div>

      {byTier.map(({ tier, notes: group }) =>
        group.length === 0 ? null : (
          <section key={tier} aria-label={`${TIER_NAMES[tier].many}, ${group.length}`}>
            <ul className="flex flex-col">
              {group.map((note) => (
                <Note
                  key={note.id}
                  note={note}
                  opened={note.id === opened}
                  onOpen={() => setChosen(note.id)}
                  onGo={() => note.section && onGoTo(note.section, note.entryIndex)}
                  onDone={() => onDone(note)}
                />
              ))}
            </ul>
          </section>
        ),
      )}

      {goals.length > 0 && (
        <section className="flex flex-col gap-2.5 border-t border-rule pt-4">
          <h3 className="label-mono flex items-center gap-2 text-ink-2">
            <Target className="h-3.5 w-3.5" aria-hidden="true" />
            Not edits — things to go and do
          </h3>
          <ul className="flex flex-col gap-2.5">
            {goals.map((goal) => (
              <li key={goal.id} className="flex items-start gap-2.5">
                <span className="mt-[7px]">
                  <Dot tier={goal.tier} />
                </span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  {goal.targetYear && <span className="label-mono text-ink-3">{YEAR_NAMES[goal.targetYear] ?? `Year ${goal.targetYear}`}</span>}
                  <span className="text-[13px] leading-snug text-ink-2">{goal.text}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Ticking a note off is not meant to be a one-way door. */}
      {hidden > 0 && (
        <button type="button" onClick={onRestore} className="self-start text-[13px] text-ink-3 hover:text-ink">
          {hidden} marked done · show {hidden === 1 ? "it" : "them"} again
        </button>
      )}

      {/* The notes are of the resume as it was: for what's been rewritten since, the AI can be asked again. */}
      <button
        type="button"
        onClick={onAsk}
        className="inline-flex items-center gap-1.5 self-start pb-2 text-[13px] font-medium text-brand hover:underline"
      >
        <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
        Get new notes for this version
      </button>
    </section>
  )
}
