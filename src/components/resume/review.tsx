"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import {
  BookOpen,
  BriefcaseBusiness,
  Check,
  CheckCheck,
  FolderKanban,
  GraduationCap,
  Pencil,
  Wrench,
  X,
} from "lucide-react"
import type { SectionKey, Suggestion, SuggestionKind } from "@/lib/resume/types"
import { sectionLabels, sectionOrder } from "@/lib/resume/workspace"
import type { LineTarget } from "./resume-document"

export const sectionIcons = {
  education: GraduationCap,
  experience: BriefcaseBusiness,
  projects: FolderKanban,
  skills: Wrench,
  coursework: BookOpen,
} satisfies Record<SectionKey, unknown>

const kindLabels: Record<SuggestionKind, string> = {
  contribution: "Contribution",
  metric: "Metric",
  wording: "Wording",
  skill: "Skill",
  "role-fit": "Role fit",
}

export interface ReviewHandlers {
  onAccept: (id: string, text?: string) => void
  onReject: (id: string) => void
  onAcceptAll: (section?: SectionKey) => void
  onRejectAll: (section?: SectionKey) => void
}

/** The text a suggestion would replace, so each card can show before and after. */
export type CurrentText = (suggestion: Suggestion) => string | null

function proposedText(suggestion: Suggestion) {
  return suggestion.change.type === "add-skill" ? suggestion.change.skill : suggestion.change.text
}

export function SuggestionCard({
  suggestion,
  currentText,
  onAccept,
  onReject,
  autoFocus = false,
}: {
  suggestion: Suggestion
  currentText: CurrentText
  onAccept: (id: string, text?: string) => void
  onReject: (id: string) => void
  autoFocus?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(proposedText(suggestion))
  const acceptRef = useRef<HTMLButtonElement>(null)
  const before = currentText(suggestion)

  useEffect(() => {
    if (autoFocus) acceptRef.current?.focus()
  }, [autoFocus])

  return (
    <article className="rv-card" data-section={suggestion.section}>
      <header>
        <span className="rv-kind">{kindLabels[suggestion.kind]}</span>
        <h4>{suggestion.title}</h4>
      </header>
      <p className="rv-reason">{suggestion.reason}</p>
      {before !== null && (
        <p className="rv-before">
          <span className="rv-visually-hidden">Current: </span>
          {before}
        </p>
      )}
      {editing ? (
        <label className="rv-edit">
          <span>Your version</span>
          <textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={3} autoFocus />
        </label>
      ) : (
        <p className="rv-after">
          <span className="rv-visually-hidden">{suggestion.change.type === "replace-bullet" ? "Suggested: " : "Adds: "}</span>
          {proposedText(suggestion)}
        </p>
      )}
      <div className="rv-actions">
        {editing ? (
          <>
            <button
              type="button"
              className="rv-icon rv-accept"
              onClick={() => onAccept(suggestion.id, draft)}
              disabled={!draft.trim()}
              aria-label="Save your version"
              title="Save your version"
            >
              <Check size={17} aria-hidden="true" />
            </button>
            <button type="button" className="rv-text-button" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              ref={acceptRef}
              type="button"
              className="rv-icon rv-accept"
              onClick={() => onAccept(suggestion.id)}
              aria-label={`Accept: ${suggestion.title}`}
              title="Accept"
            >
              <Check size={17} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="rv-icon rv-reject"
              onClick={() => onReject(suggestion.id)}
              aria-label={`Reject: ${suggestion.title}`}
              title="Reject"
            >
              <X size={17} aria-hidden="true" />
            </button>
            <button type="button" className="rv-text-button" onClick={() => setEditing(true)}>
              <Pencil size={13} aria-hidden="true" /> Edit
            </button>
          </>
        )}
      </div>
    </article>
  )
}

/** The side table: pick a section to highlight it in the resume and list its suggestions. */
export function SectionTable({
  counts,
  entryCounts,
  active,
  onSelect,
}: {
  counts: Record<SectionKey, number>
  entryCounts: Record<SectionKey, number>
  active: SectionKey | null
  onSelect: (section: SectionKey | null) => void
}) {
  return (
    <nav className="rv-sections" aria-label="Resume sections">
      <ul>
        {sectionOrder.map((section) => {
          const Icon = sectionIcons[section]
          return (
            <li key={section}>
              <button
                type="button"
                data-section={section}
                aria-pressed={active === section}
                onClick={() => onSelect(active === section ? null : section)}
              >
                <span className="rv-section-icon"><Icon size={17} aria-hidden="true" /></span>
                <span className="rv-section-name">
                  {sectionLabels[section]}
                  <small>{entryCounts[section]} {entryCounts[section] === 1 ? "entry" : "entries"}</small>
                </span>
                {counts[section] > 0 ? (
                  <span className="rv-count" aria-label={`${counts[section]} suggestions`}>{counts[section]}</span>
                ) : (
                  <span className="rv-count rv-count-done" aria-label="No suggestions"><Check size={13} aria-hidden="true" /></span>
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

export function SuggestionPanel({
  section,
  suggestions,
  currentText,
  handlers,
  emptyHint,
}: {
  section: SectionKey | null
  suggestions: Suggestion[]
  currentText: CurrentText
  handlers: ReviewHandlers
  emptyHint: string
}) {
  const shown = section ? suggestions.filter((suggestion) => suggestion.section === section) : suggestions
  const label = section ? sectionLabels[section] : "All sections"
  return (
    <section className="rv-panel" data-section={section ?? "all"} aria-live="polite">
      <header className="rv-panel-head">
        <div>
          <span className="rv-eyebrow">{label}</span>
          <h3>{shown.length ? `${shown.length} to review` : "All caught up"}</h3>
        </div>
        {shown.length > 0 && (
          <div className="rv-bulk">
            <button type="button" className="rv-bulk-accept" onClick={() => handlers.onAcceptAll(section ?? undefined)}>
              <CheckCheck size={16} aria-hidden="true" /> Accept all
            </button>
            <button type="button" className="rv-bulk-skip" onClick={() => handlers.onRejectAll(section ?? undefined)}>
              Skip all
            </button>
          </div>
        )}
      </header>
      {shown.length ? (
        <div className="rv-list">
          {shown.map((suggestion) => (
            <SuggestionCard
              key={suggestion.id}
              suggestion={suggestion}
              currentText={currentText}
              onAccept={handlers.onAccept}
              onReject={handlers.onReject}
            />
          ))}
        </div>
      ) : (
        <p className="rv-empty">{emptyHint}</p>
      )}
    </section>
  )
}

/** The pop-up that opens under a resume line. */
export function LinePopover({
  target,
  suggestions,
  currentText,
  handlers,
  onClose,
  editHref,
}: {
  target: LineTarget
  suggestions: Suggestion[]
  currentText: CurrentText
  handlers: Pick<ReviewHandlers, "onAccept" | "onReject">
  onClose: () => void
  editHref: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const forLine = suggestions.filter((suggestion) =>
    target.suggestionId
      ? suggestion.id === target.suggestionId
      : suggestion.change.type === "replace-bullet" && suggestion.change.bulletId === target.bulletId,
  )

  useEffect(() => {
    if (!forLine.length) ref.current?.focus()
    // Only on open; focusing again after each decision would steal focus mid-review.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      ref={ref}
      className="rv-popover"
      data-section={target.section}
      role="group"
      aria-label="Suggestions for this line"
      tabIndex={-1}
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose()
      }}
    >
      <div className="rv-popover-head">
        <span>{forLine.length ? `${forLine.length} suggestion${forLine.length === 1 ? "" : "s"} for this line` : "No suggestions for this line"}</span>
        <button type="button" className="rv-icon rv-close" onClick={onClose} aria-label="Close">
          <X size={15} aria-hidden="true" />
        </button>
      </div>
      {forLine.map((suggestion, index) => (
        <SuggestionCard
          key={suggestion.id}
          suggestion={suggestion}
          currentText={currentText}
          onAccept={handlers.onAccept}
          onReject={handlers.onReject}
          autoFocus={index === 0}
        />
      ))}
      {!forLine.length && (
        <p className="rv-popover-note">
          This line comes straight from your profile. <Link href={editHref}>Edit it in Experience</Link>
        </p>
      )}
    </div>
  )
}

export function countBySection(items: { section: SectionKey }[]) {
  const counts = Object.fromEntries(sectionOrder.map((section) => [section, 0])) as Record<SectionKey, number>
  for (const item of items) counts[item.section] += 1
  return counts
}
