"use client"

import { useMemo, useState } from "react"
import { ArrowRight, Check, Loader2, Plus, RefreshCw } from "lucide-react"
import type { ProposedChange } from "@/lib/profile/merge"
import { pill } from "@/components/resume-studio/pills"

/**
 * What a new upload would change about the master profile, as a list to
 * agree to or decline, one row at a time.
 *
 * Additions are ticked to begin with and revisions are not. That asymmetry
 * is the point: gaining a job the profile never had is almost always right,
 * while replacing wording the student may have spent time on is a decision
 * only they can make. Defaulting revisions to "off" means the worst case of
 * clicking straight through is that nothing is lost.
 */

const SECTION_NAME: Record<ProposedChange["section"], string> = {
  basics: "Contact details",
  experience: "Experience",
  projects: "Projects",
  education: "Education",
  skills: "Skills",
}

const ORDER: ProposedChange["section"][] = ["basics", "experience", "projects", "education", "skills"]

function Row({ change, on, onToggle }: { change: ProposedChange; on: boolean; onToggle: () => void }) {
  return (
    <li>
      <label
        className={`flex cursor-pointer gap-3 rounded-[14px] border p-3.5 transition-colors ${
          on ? "border-brand/40 bg-brand/[0.045]" : "border-hairline bg-sheet hover:border-rule"
        }`}
      >
        <input type="checkbox" checked={on} onChange={onToggle} className="sr-only" />
        <span
          aria-hidden="true"
          className={`mt-[2px] flex h-[19px] w-[19px] shrink-0 items-center justify-center rounded-[6px] border transition-colors ${
            on ? "border-brand bg-brand text-white" : "border-rule-strong bg-sheet"
          }`}
        >
          {on && <Check className="h-3 w-3" strokeWidth={3} />}
        </span>

        <span className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="label-mono flex items-center gap-1 text-ink-3">
              {change.kind === "added" ? <Plus className="h-3 w-3" /> : <RefreshCw className="h-3 w-3" />}
              {change.kind === "added" ? "New" : "Changed"}
            </span>
            <span className="text-[15px] font-medium leading-snug tracking-[-0.01em] text-ink">{change.title}</span>
            {change.subtitle && <span className="truncate text-[13px] text-ink-3">{change.subtitle}</span>}
          </span>

          {/* A revision shows what it replaces, struck through, so nothing is
              swapped out without the student having seen the old words. */}
          {change.fields?.map((field) => (
            <span key={field.label} className="flex flex-col gap-0.5 border-l-2 border-rule pl-2.5">
              <span className="label-mono text-ink-3">{field.label}</span>
              <span className="text-[13px] leading-snug text-ink-3 line-through decoration-ink-3/40">{field.before}</span>
              <span className="text-[13px] leading-snug text-ink">{field.after}</span>
            </span>
          ))}

          {change.preview && change.preview.length > 0 && (
            <span className="flex flex-col gap-0.5 border-l-2 border-rule pl-2.5">
              {change.preview.slice(0, 4).map((line, index) => (
                <span key={index} className="line-clamp-2 text-[13px] leading-snug text-ink-2">
                  {line}
                </span>
              ))}
            </span>
          )}
        </span>
      </label>
    </li>
  )
}

export function MergeReview({
  changes,
  saving,
  onApply,
  onSkip,
}: {
  changes: ProposedChange[]
  saving?: boolean
  /** The ids the student agreed to. */
  onApply: (accepted: Set<string>) => void
  onSkip: () => void
}) {
  const [accepted, setAccepted] = useState<Set<string>>(
    () => new Set(changes.filter((change) => change.kind === "added").map((change) => change.id)),
  )

  const grouped = useMemo(
    () => ORDER.map((section) => ({ section, rows: changes.filter((change) => change.section === section) })).filter((g) => g.rows.length),
    [changes],
  )

  const toggle = (id: string) =>
    setAccepted((current) => {
      const next = new Set(current)
      if (!next.delete(id)) next.add(id)
      return next
    })

  const all = () => setAccepted(new Set(changes.map((change) => change.id)))
  const none = () => setAccepted(new Set())

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="label-mono text-ink-2">Since your last upload</p>
        <h2 className="font-serif text-[30px] leading-[1.05] tracking-[-0.03em] text-ink">
          {changes.length} {changes.length === 1 ? "thing" : "things"} to <em className="text-brand">bring across</em>
        </h2>
        <p className="max-w-[58ch] text-[15px] leading-relaxed text-ink-2">
          Your profile keeps everything you have ever done; this resume is one telling of it. Pick what to carry over. Nothing is
          removed — anything the file leaves out stays on your profile.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button type="button" onClick={all} className="text-[13px] font-medium text-brand hover:underline">
          Select all
        </button>
        <span aria-hidden="true" className="text-ink-3">
          ·
        </span>
        <button type="button" onClick={none} className="text-[13px] font-medium text-ink-2 hover:text-ink">
          Select none
        </button>
        <span className="ml-auto text-[13px] tabular-nums text-ink-3">{accepted.size} chosen</span>
      </div>

      {grouped.map(({ section, rows }) => (
        <section key={section} className="flex flex-col gap-2">
          <h3 className="label-mono border-b border-hairline pb-1.5 text-ink-2">
            {SECTION_NAME[section]} <span className="text-ink-3">· {rows.length}</span>
          </h3>
          <ul className="flex flex-col gap-2">
            {rows.map((change) => (
              <Row key={change.id} change={change} on={accepted.has(change.id)} onToggle={() => toggle(change.id)} />
            ))}
          </ul>
        </section>
      ))}

      <div className="flex flex-wrap items-center gap-3 border-t border-hairline pt-5">
        <button
          type="button"
          disabled={saving}
          onClick={() => onApply(accepted)}
          className={pill("brand", "h-11 px-5 text-[15px] font-medium")}
        >
          {saving && <Loader2 className="animate-spin" aria-hidden="true" />}
          {accepted.size === 0 ? "Keep my profile as it is" : `Add ${accepted.size} to my profile`}
          {!saving && accepted.size > 0 && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
        </button>
        <button type="button" onClick={onSkip} disabled={saving} className={pill("white", "h-11 px-5 text-[15px] font-medium")}>
          Decide later
        </button>
        <p className="w-full text-[13px] leading-snug text-ink-3 sm:w-auto">
          The resume itself is saved either way.
        </p>
      </div>
    </div>
  )
}
