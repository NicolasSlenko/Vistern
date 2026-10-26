"use client"

import { useState } from "react"
import Link from "next/link"
import { History, Lock, PencilLine, RefreshCw, Sparkles } from "lucide-react"
import type { SectionKey, Suggestion } from "@/lib/resume/types"
import { findEntry, isProfileEmpty, liveSuggestions, sectionLabels, sectionOrder } from "@/lib/resume/workspace"
import { useResumeWorkspace } from "./workspace-provider"
import { ResumeDocument, type LineTarget } from "./resume-document"
import { LinePopover, SectionTable, SuggestionPanel, countBySection, type CurrentText, type ReviewHandlers } from "./review"

const historyTime = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })

export function ResumeView() {
  const { state, dispatch } = useResumeWorkspace()
  const [activeSection, setActiveSection] = useState<SectionKey | null>(null)
  const [selected, setSelected] = useState<LineTarget | null>(null)
  const { profile } = state
  const suggestions = liveSuggestions(profile, state.suggestions)
  const counts = countBySection(suggestions)
  const entryCounts = Object.fromEntries(
    sectionOrder.map((section) => [section, profile.sections[section].items.length]),
  ) as Record<SectionKey, number>

  const currentText: CurrentText = (suggestion: Suggestion) => {
    if (suggestion.change.type !== "replace-bullet") return null
    const { bulletId } = suggestion.change
    const found = findEntry(profile, suggestion.change.entryId)
    const bullet = found && "bullets" in found.entry ? found.entry.bullets.find((item) => item.id === bulletId) : undefined
    return bullet?.text ?? null
  }

  const handlers: ReviewHandlers = {
    onAccept: (id, text) => dispatch({ type: "suggestion/accept", id, text }),
    onReject: (id) => dispatch({ type: "suggestion/reject", id }),
    onAcceptAll: (section) => dispatch({ type: "suggestion/accept-all", section }),
    onRejectAll: (section) => dispatch({ type: "suggestion/reject-all", section }),
  }

  function selectSection(section: SectionKey | null) {
    setActiveSection(section)
    setSelected(null)
  }

  function selectLine(target: LineTarget | null) {
    setSelected(target)
    if (target) setActiveSection(target.section)
  }

  if (isProfileEmpty(profile)) {
    return (
      <div className="career-page resume-page">
        <ResumeHeading />
        <div className="rs-empty">
          <span className="rs-empty-icon"><Sparkles size={24} aria-hidden="true" /></span>
          <h2>Your resume builds itself from your profile</h2>
          <p>Add your education, experience and projects once in Experience. This page turns them into a resume and suggests improvements.</p>
          <Link className="student-button" href="/resume/experience">Add your first entry</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="career-page resume-page">
      <ResumeHeading>
        <button type="button" className="rs-button rs-button-soft" onClick={() => dispatch({ type: "suggestion/refresh" })}>
          <RefreshCw size={16} aria-hidden="true" /> Check for suggestions
        </button>
        <Link className="rs-button rs-button-primary" href="/resume/experience">
          <PencilLine size={16} aria-hidden="true" /> Edit in Experience
        </Link>
      </ResumeHeading>

      {suggestions.length > 0 && (
        <div className="rs-banner">
          <Sparkles size={20} aria-hidden="true" />
          <div>
            <strong>{suggestions.length} suggestion{suggestions.length === 1 ? "" : "s"} to review</strong>
            <p>Pick a section on the right, or click a highlighted line. Nothing changes in your profile until you accept.</p>
          </div>
        </div>
      )}

      <div className="rs-legend" aria-label="Legend">
        <span data-state="profile"><i aria-hidden="true" />From profile</span>
        <span data-state="suggested"><i aria-hidden="true" />Has a suggestion</span>
        <span data-state="ghost"><i aria-hidden="true" />Suggested, not saved until accepted</span>
      </div>

      <div className="rs-layout">
        <div className="rs-document">
          <div className="rs-document-bar">
            <span className="rs-chip">Generated from Experience</span>
            <span>Jake&apos;s Resume layout</span>
            <span className="rs-chip rs-chip-private"><Lock size={13} aria-hidden="true" /> Private</span>
          </div>
          <ResumeDocument
            profile={profile}
            suggestions={suggestions}
            activeSection={activeSection}
            selected={selected}
            onSelectLine={selectLine}
            onSelectSection={(section) => selectSection(activeSection === section ? null : section)}
            footnote="Generated from Experience · read-only here · edit facts in Experience"
            renderPopover={(target) => (
              <LinePopover
                target={target}
                suggestions={suggestions}
                currentText={currentText}
                handlers={handlers}
                onClose={() => setSelected(null)}
                editHref="/resume/experience"
              />
            )}
          />
        </div>

        <aside className="rs-rail" aria-label="Review">
          <div className="rs-rail-block">
            <h2 className="rs-rail-title">Sections</h2>
            <SectionTable counts={counts} entryCounts={entryCounts} active={activeSection} onSelect={selectSection} />
          </div>
          <SuggestionPanel
            section={activeSection}
            suggestions={suggestions}
            currentText={currentText}
            handlers={handlers}
            emptyHint={
              activeSection
                ? `Nothing to review in ${sectionLabels[activeSection]}. Pick another section or check for new suggestions.`
                : "Nothing to review. Check for suggestions after you edit your profile."
            }
          />
          <details className="rs-history">
            <summary>
              <History size={16} aria-hidden="true" /> Edit history <span>{state.history.length}</span>
            </summary>
            <p className="rs-history-note">A record of what changed. Only the current version of your resume can be previewed.</p>
            {state.history.length ? (
              <ol>
                {state.history.map((entry) => (
                  <li key={entry.id} data-section={entry.section}>
                    <span>{entry.summary}</span>
                    <time dateTime={entry.at}>{historyTime.format(new Date(entry.at))}</time>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="rs-history-note">No edits yet.</p>
            )}
          </details>
        </aside>
      </div>
    </div>
  )
}

function ResumeHeading({ children }: { children?: React.ReactNode }) {
  return (
    <header className="career-page-heading rs-heading">
      <div>
        <span className="scaffold-eyebrow">Master resume</span>
        <h1>Resume</h1>
        <p>Generated from your Experience. It is read-only here: change facts in Experience, or accept a suggestion.</p>
      </div>
      {children && <div className="rs-heading-actions">{children}</div>}
    </header>
  )
}
