"use client"

import { useState } from "react"
import { Plus, Sparkles, Target, Trash2 } from "lucide-react"
import type { AnyEntry, SectionKey, Suggestion, TailoredResume } from "@/lib/resume/types"
import {
  entryBullets,
  entryTitle,
  findEntry,
  liveSuggestions,
  newId,
  sectionLabels,
  sectionOrder,
  tailoredName,
} from "@/lib/resume/workspace"
import { useResumeWorkspace } from "./workspace-provider"
import { ResumeDocument, type LineTarget } from "./resume-document"
import { LinePopover, SectionTable, SuggestionPanel, countBySection, sectionIcons, type CurrentText, type ReviewHandlers } from "./review"

export function TailorWorkspace() {
  const { state, dispatch } = useResumeWorkspace()
  const [activeId, setActiveId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const resume = state.tailored.find((item) => item.id === activeId) ?? state.tailored[0]

  function create(details: { role: string; company: string; jobDescription: string }) {
    const { profile } = state
    const entries = sectionOrder.flatMap((section) => profile.sections[section].items as AnyEntry[])
    const next: TailoredResume = {
      id: newId("tailor"),
      ...details,
      createdAt: new Date().toISOString(),
      entryIds: entries.map((entry) => entry.id),
      bulletIds: entries.flatMap((entry) => entryBullets(entry).map((bullet) => bullet.id)),
      overrides: {},
      addedBullets: {},
      suggestions: [],
      dismissed: [],
    }
    dispatch({ type: "tailored/create", resume: next })
    setActiveId(next.id)
    setCreating(false)
  }

  return (
    <div className="career-page resume-page">
      <header className="career-page-heading rs-heading">
        <div>
          <span className="scaffold-eyebrow">Tailored resumes</span>
          <h1>Tailor for a role</h1>
          <p>Choose what goes into a resume for one role and review wording for it. Choices and accepted wording apply to that resume only; your profile stays the same.</p>
        </div>
      </header>

      <div className="tl-tabs" role="group" aria-label="Tailored resumes">
        {state.tailored.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={!creating && item.id === resume?.id}
            onClick={() => { setActiveId(item.id); setCreating(false) }}
          >
            <Target size={15} aria-hidden="true" /> {tailoredName(item)}
          </button>
        ))}
        <button type="button" className="tl-new" aria-pressed={creating} onClick={() => setCreating(true)}>
          <Plus size={15} aria-hidden="true" /> New role
        </button>
      </div>

      {creating || !resume ? (
        <RoleForm
          heading={state.tailored.length ? "Tailor a resume for a new role" : "Tailor your first resume"}
          submitLabel="Create tailored resume"
          onSubmit={create}
          onCancel={state.tailored.length ? () => setCreating(false) : undefined}
        />
      ) : (
        <TailorDetail key={resume.id} resume={resume} />
      )}
    </div>
  )
}

function RoleForm({
  heading,
  submitLabel,
  initial = { role: "", company: "", jobDescription: "" },
  onSubmit,
  onCancel,
}: {
  heading: string
  submitLabel: string
  initial?: { role: string; company: string; jobDescription: string }
  onSubmit: (details: { role: string; company: string; jobDescription: string }) => void
  onCancel?: () => void
}) {
  const [values, setValues] = useState(initial)
  const [error, setError] = useState(false)
  return (
    <form
      className="ex-card ex-form tl-role-form"
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        if (!values.role.trim()) {
          setError(true)
          event.currentTarget.querySelector<HTMLInputElement>("[name=role]")?.focus()
          return
        }
        onSubmit({ role: values.role.trim(), company: values.company.trim(), jobDescription: values.jobDescription.trim() })
      }}
    >
      <h3>{heading}</h3>
      <div className="ex-fields">
        <div className="ex-field">
          <label htmlFor="tl-role">Target role<span className="ex-required" aria-hidden="true"> *</span></label>
          <input id="tl-role" name="role" value={values.role} placeholder="Backend engineering intern" required aria-invalid={error} aria-describedby={error ? "tl-role-error" : undefined}
            onChange={(event) => { setValues({ ...values, role: event.target.value }); setError(false) }} />
          {error && <small id="tl-role-error" className="ex-error">Target role is required</small>}
        </div>
        <div className="ex-field">
          <label htmlFor="tl-company">Company</label>
          <input id="tl-company" name="company" value={values.company} placeholder="Optional" onChange={(event) => setValues({ ...values, company: event.target.value })} />
        </div>
        <div className="ex-field ex-field-wide">
          <label htmlFor="tl-posting">Job posting</label>
          <textarea id="tl-posting" rows={4} value={values.jobDescription} placeholder="Paste the description to get role-specific wording suggestions (optional)"
            onChange={(event) => setValues({ ...values, jobDescription: event.target.value })} />
        </div>
      </div>
      <div className="ex-form-actions">
        <p className="ex-hint"><span aria-hidden="true">*</span> Required</p>
        {onCancel && <button type="button" className="rs-button rs-button-ghost" onClick={onCancel}>Cancel</button>}
        <button type="submit" className="rs-button rs-button-primary">{submitLabel}</button>
      </div>
    </form>
  )
}

function TailorDetail({ resume }: { resume: TailoredResume }) {
  const { state, dispatch } = useResumeWorkspace()
  const { profile } = state
  const [activeSection, setActiveSection] = useState<SectionKey | null>(null)
  const [selected, setSelected] = useState<LineTarget | null>(null)
  const [editingDetails, setEditingDetails] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const suggestions = liveSuggestions(profile, resume.suggestions).filter(
    (suggestion) =>
      resume.entryIds.includes(suggestion.change.entryId) &&
      (suggestion.change.type !== "replace-bullet" || resume.bulletIds.includes(suggestion.change.bulletId)),
  )
  const counts = countBySection(suggestions)
  const entryCounts = Object.fromEntries(
    sectionOrder.map((section) => [
      section,
      (profile.sections[section].items as AnyEntry[]).filter((entry) => resume.entryIds.includes(entry.id)).length,
    ]),
  ) as Record<SectionKey, number>

  const currentText: CurrentText = (suggestion: Suggestion) => {
    if (suggestion.change.type !== "replace-bullet") return null
    const { bulletId } = suggestion.change
    const found = findEntry(profile, suggestion.change.entryId)
    const bullet = found ? entryBullets(found.entry).find((item) => item.id === bulletId) : undefined
    return bullet ? (resume.overrides[bullet.id] ?? bullet.text) : null
  }

  const handlers: ReviewHandlers = {
    onAccept: (suggestionId, text) => dispatch({ type: "tailored/accept", id: resume.id, suggestionId, text }),
    onReject: (suggestionId) => dispatch({ type: "tailored/reject", id: resume.id, suggestionId }),
    onAcceptAll: (section) => dispatch({ type: "tailored/accept-all", id: resume.id, section }),
    onRejectAll: (section) => dispatch({ type: "tailored/reject-all", id: resume.id, section }),
  }

  function select(entryIds: string[], bulletIds: string[]) {
    dispatch({ type: "tailored/select", id: resume.id, entryIds, bulletIds })
  }

  function toggleEntry(entry: AnyEntry) {
    const bulletIds = entryBullets(entry).map((bullet) => bullet.id)
    if (resume.entryIds.includes(entry.id)) {
      select(resume.entryIds.filter((id) => id !== entry.id), resume.bulletIds.filter((id) => !bulletIds.includes(id)))
    } else {
      select([...resume.entryIds, entry.id], [...new Set([...resume.bulletIds, ...bulletIds])])
    }
  }

  function toggleBullet(entryId: string, bulletId: string) {
    if (resume.bulletIds.includes(bulletId)) {
      select(resume.entryIds, resume.bulletIds.filter((id) => id !== bulletId))
    } else {
      select(resume.entryIds.includes(entryId) ? resume.entryIds : [...resume.entryIds, entryId], [...resume.bulletIds, bulletId])
    }
  }

  function selectLine(target: LineTarget | null) {
    setSelected(target)
    if (target) setActiveSection(target.section)
  }

  return (
    <div className="tl-layout">
      <aside className="tl-choose" aria-label="Choose content">
        <div className="ex-card tl-details">
          {editingDetails ? (
            <RoleForm
              heading="Role details"
              submitLabel="Save details"
              initial={{ role: resume.role, company: resume.company, jobDescription: resume.jobDescription }}
              onCancel={() => setEditingDetails(false)}
              onSubmit={(details) => {
                dispatch({ type: "tailored/details", id: resume.id, ...details })
                setEditingDetails(false)
              }}
            />
          ) : (
            <>
              <span className="rv-eyebrow">Target role</span>
              <h2>{tailoredName(resume)}</h2>
              <p className="ex-meta">{resume.jobDescription ? `${resume.jobDescription.slice(0, 140)}${resume.jobDescription.length > 140 ? "…" : ""}` : "No job posting added."}</p>
              <div className="tl-details-actions">
                <button type="button" className="rv-text-button" onClick={() => setEditingDetails(true)}>Edit details</button>
                {confirmDelete ? (
                  <span className="ex-confirm">
                    Delete this resume?
                    <button type="button" className="rs-button rs-button-danger" onClick={() => dispatch({ type: "tailored/delete", id: resume.id })}>Delete</button>
                    <button type="button" className="rv-text-button" onClick={() => setConfirmDelete(false)}>Keep</button>
                  </span>
                ) : (
                  <button type="button" className="rv-text-button tl-delete" onClick={() => setConfirmDelete(true)}>
                    <Trash2 size={13} aria-hidden="true" /> Delete
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        <div className="ex-card tl-checklist">
          <h2>Choose content</h2>
          <p className="ex-hint">Only what you check appears in this resume. Your profile is not changed.</p>
          {sectionOrder.map((section) => {
            const items = profile.sections[section].items as AnyEntry[]
            if (!items.length) return null
            const Icon = sectionIcons[section]
            return (
              <fieldset key={section} data-section={section}>
                <legend>
                  <span className="ex-section-icon" data-section={section}><Icon size={14} aria-hidden="true" /></span>
                  {sectionLabels[section]} <small>{entryCounts[section]} of {items.length}</small>
                </legend>
                {items.map((entry) => {
                  const checked = resume.entryIds.includes(entry.id)
                  const bullets = entryBullets(entry)
                  return (
                    <div key={entry.id} className="tl-entry">
                      <label>
                        <input type="checkbox" checked={checked} onChange={() => toggleEntry(entry)} />
                        {entryTitle(section, entry)}
                      </label>
                      {checked && bullets.length > 0 && (
                        <div className="tl-bullets">
                          {bullets.map((bullet) => (
                            <label key={bullet.id}>
                              <input type="checkbox" checked={resume.bulletIds.includes(bullet.id)} onChange={() => toggleBullet(entry.id, bullet.id)} />
                              <span>{resume.overrides[bullet.id] ?? bullet.text}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </fieldset>
            )
          })}
        </div>
      </aside>

      <div className="rs-document">
        <div className="rs-document-bar">
          <span className="rs-chip">Tailored · {resume.role}</span>
          <span>Jake&apos;s Resume layout</span>
        </div>
        <ResumeDocument
          profile={profile}
          filter={resume}
          suggestions={suggestions}
          activeSection={activeSection}
          selected={selected}
          onSelectLine={selectLine}
          onSelectSection={(section) => { setActiveSection(activeSection === section ? null : section); setSelected(null) }}
          footnote={`Tailored for ${tailoredName(resume)} · built from your profile · wording changes stay in this resume`}
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

      <aside className="rs-rail" aria-label="Review for this role">
        <button type="button" className="rs-button rs-button-primary tl-suggest" onClick={() => dispatch({ type: "tailored/suggest", id: resume.id })}>
          <Sparkles size={16} aria-hidden="true" /> Suggest wording for this role
        </button>
        <div className="rs-rail-block">
          <h2 className="rs-rail-title">Sections</h2>
          <SectionTable counts={counts} entryCounts={entryCounts} active={activeSection} onSelect={(section) => { setActiveSection(section); setSelected(null) }} />
        </div>
        <SuggestionPanel
          section={activeSection}
          suggestions={suggestions}
          currentText={currentText}
          handlers={handlers}
          emptyHint="No wording suggestions for this role yet. Use Suggest wording to get some."
        />
        <p className="rs-rail-note">Accepted wording is saved to this resume only. To change a fact everywhere, edit it in Experience.</p>
      </aside>
    </div>
  )
}
