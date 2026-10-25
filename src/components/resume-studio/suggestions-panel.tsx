"use client"

import { useId, useMemo } from "react"
import { Check, X } from "lucide-react"
import type { Resume } from "@/app/api/parse/resumeSchema"
import type { BulletRewrite, Severity } from "@/lib/resume-suggestions"

/**
 * The AI's line-level rewrites, down the left column: how many are waiting,
 * then each one as the bullet it replaces and the words it offers instead.
 *
 * Every suggestion can be answered from here or from the bullet itself in
 * the form — the two share one piece of state, so a tick in either place
 * settles it in both.
 */

const SEVERITY_DOT: Record<Severity, string> = { fix: "bg-alert", look: "bg-caution", optional: "bg-brand" }
const SEVERITY_NAME: Record<Severity, string> = { fix: "Must fix", look: "Worth a look", optional: "Polish" }
const SEVERITIES: Severity[] = ["fix", "look", "optional"]

function Dot({ severity }: { severity: Severity }) {
  return <span aria-hidden="true" className={`block h-[7px] w-[7px] shrink-0 rounded-full ${SEVERITY_DOT[severity]}`} />
}

function entryName(resume: Resume | null, rewrite: BulletRewrite): string {
  const entry = (resume?.[rewrite.section] as Record<string, unknown>[] | undefined)?.[rewrite.entryIndex]
  if (!entry) return rewrite.section
  if (rewrite.section === "experience") return String(entry.company || entry.position || "Role")
  return String(entry.name || "Project")
}

function Suggestion({
  rewrite,
  name,
  onGo,
  onAccept,
  onReject,
}: {
  rewrite: BulletRewrite
  name: string
  onGo: () => void
  onAccept: () => void
  onReject: () => void
}) {
  const details = useId()
  return (
    <li className="flex flex-col gap-2 border-t border-rule py-3 first:border-t-0">
      <button type="button" onClick={onGo} className="flex items-start gap-2.5 text-left focus-visible:outline-offset-[-2px]">
        <span className="mt-[6px]">
          <Dot severity={rewrite.severity} />
        </span>
        <span className="flex min-w-0 flex-col gap-1">
          <span className="label-mono text-ink-3">{name}</span>
          {/* What's there now, struck through, then what the AI would put instead. */}
          <span className="text-[13px] leading-snug text-ink-3 line-through decoration-ink-3/40">{rewrite.original}</span>
          <span id={details} className="text-sm leading-snug text-ink">
            {rewrite.suggested}
          </span>
          <span className="text-[12px] leading-snug text-ink-2">{rewrite.why}</span>
        </span>
      </button>
      <div className="flex items-center gap-2 pl-[17px]">
        <button
          type="button"
          onClick={onAccept}
          aria-describedby={details}
          className="inline-flex h-7 items-center gap-1.5 rounded-full bg-brand px-2.5 text-[12px] font-medium text-sheet transition-[filter,scale] hover:brightness-110 active:scale-[0.97]"
        >
          <Check className="h-3 w-3" aria-hidden="true" />
          Use this
        </button>
        <button
          type="button"
          onClick={onReject}
          aria-describedby={details}
          className="inline-flex h-7 items-center gap-1.5 rounded-full bg-fill px-2.5 text-[12px] font-medium text-ink-2 transition-colors hover:text-ink"
        >
          <X className="h-3 w-3" aria-hidden="true" />
          Keep mine
        </button>
      </div>
    </li>
  )
}

export function SuggestionsPanel({
  resume,
  score,
  rewrites,
  open,
  asking,
  loaded,
  onAsk,
  onGoTo,
  onAccept,
  onReject,
}: {
  resume: Resume | null
  score: number
  /** Every rewrite that still matches the resume, answered or not. */
  rewrites: BulletRewrite[]
  /** The ones still waiting for a tick or a cross. */
  open: BulletRewrite[]
  asking: boolean
  loaded: boolean
  onAsk: () => void
  onGoTo: (rewrite: BulletRewrite) => void
  onAccept: (rewrite: BulletRewrite) => void
  onReject: (rewrite: BulletRewrite) => void
}) {
  const heading = useId()
  const bySeverity = useMemo(
    () => SEVERITIES.map((severity) => ({ severity, items: open.filter((rewrite) => rewrite.severity === severity) })),
    [open],
  )
  const answered = rewrites.length - open.length

  if (asking) {
    return (
      <section aria-labelledby={heading} className="flex flex-col gap-3">
        <h2 id={heading} className="label-mono text-ink-2">
          Suggestions
        </h2>
        <div className="flex flex-col gap-3 border-t border-ink pt-3.5">
          <p className="text-balance font-serif text-[30px] leading-[1.02] tracking-[-0.03em] text-ink">
            Reading every <em className="text-brand">line…</em>
          </p>
          <p className="text-[13px] leading-snug text-ink-2">One bullet at a time, the way a recruiter reads it.</p>
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

  if (!loaded) {
    return (
      <p className="label-mono text-ink-3" role="status">
        Loading…
      </p>
    )
  }

  if (rewrites.length === 0) {
    return (
      <section aria-labelledby={heading} className="flex flex-col gap-3">
        <h2 id={heading} className="label-mono text-ink-2">
          Suggestions
        </h2>
        <p className="font-serif text-[30px] leading-[1.02] tracking-[-0.03em] text-ink">
          Let the AI read it <em className="text-brand">line by line</em>
        </p>
        <p className="text-[13px] leading-snug text-ink-2">
          It marks the weak bullets, writes each one out the way it should read, and you take it or leave it one at a time.
        </p>
        <button type="button" onClick={onAsk} disabled={!resume} className="ai-ask glass mt-1">
          Review my bullets
        </button>
      </section>
    )
  }

  return (
    <section aria-labelledby={heading} className="flex flex-col gap-4">
      <h2 id={heading} className="label-mono text-ink-2">
        Suggestions
      </h2>

      <div className="flex items-baseline gap-2.5 border-b border-ink pb-3">
        <span className="font-serif text-[52px] leading-[0.85] tracking-[-0.045em] tabular-nums text-ink">{open.length}</span>
        <span className="label-mono text-ink-2">{open.length === 1 ? "to answer" : "to answer"}</span>
        {answered > 0 && <span className="ml-auto text-[13px] text-ink-3">{answered} done</span>}
      </div>

      {open.length === 0 ? (
        <div className="flex flex-col gap-3">
          <p className="font-serif text-[26px] leading-[1.05] tracking-[-0.025em] text-ink">
            All <em className="text-brand">answered</em>
          </p>
          <p className="text-[13px] leading-snug text-ink-2">
            Scored {score} out of 100 as it stands. Rewrite a few more lines and ask again to see it move.
          </p>
          <button type="button" onClick={onAsk} className="ai-ask glass mt-1">
            Review again
          </button>
        </div>
      ) : (
        bySeverity.map(({ severity, items }) =>
          items.length === 0 ? null : (
            <section key={severity} aria-label={`${SEVERITY_NAME[severity]}, ${items.length}`} className="flex flex-col gap-1">
              <h3 className="label-mono flex items-center gap-1.5 text-ink-2">
                <Dot severity={severity} />
                {SEVERITY_NAME[severity]} · {items.length}
              </h3>
              <ul className="flex flex-col">
                {items.map((rewrite) => (
                  <Suggestion
                    key={rewrite.id}
                    rewrite={rewrite}
                    name={entryName(resume, rewrite)}
                    onGo={() => onGoTo(rewrite)}
                    onAccept={() => onAccept(rewrite)}
                    onReject={() => onReject(rewrite)}
                  />
                ))}
              </ul>
            </section>
          ),
        )
      )}
    </section>
  )
}
