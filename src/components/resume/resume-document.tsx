"use client"

import { Fragment } from "react"
import type { Bullet, MasterProfile, SectionKey, Suggestion } from "@/lib/resume/types"
import { sectionLabels, sectionOrder } from "@/lib/resume/workspace"

/** Limits the profile to what one resume uses. The general resume passes nothing and shows everything. */
export interface ResumeFilter {
  entryIds: string[]
  bulletIds: string[]
  overrides: Record<string, string>
  addedBullets: Record<string, Bullet[]>
}

export interface LineTarget {
  section: SectionKey
  entryId: string
  bulletId?: string
  suggestionId?: string
}

interface ResumeDocumentProps {
  profile: MasterProfile
  filter?: ResumeFilter
  suggestions: Suggestion[]
  activeSection: SectionKey | null
  selected: LineTarget | null
  onSelectLine: (target: LineTarget | null) => void
  onSelectSection: (section: SectionKey) => void
  renderPopover: (target: LineTarget) => React.ReactNode
  footnote: string
}

function joinParts(parts: string[], separator = " · ") {
  return parts.map((part) => part.trim()).filter(Boolean).join(separator)
}

function dateRange(start: string, end: string) {
  return joinParts([start, end], " – ")
}

export function ResumeDocument({
  profile,
  filter,
  suggestions,
  activeSection,
  selected,
  onSelectLine,
  onSelectSection,
  renderPopover,
  footnote,
}: ResumeDocumentProps) {
  const { contact } = profile
  const included = (id: string) => !filter || filter.entryIds.includes(id)
  const bulletIncluded = (id: string) => !filter || filter.bulletIds.includes(id)
  const contactLine = [contact.phone, contact.email, contact.linkedin, contact.github, contact.portfolio, contact.location]
    .map((part) => part.trim())
    .filter(Boolean)

  const pendingFor = (bulletId: string) =>
    suggestions.filter((suggestion) => suggestion.change.type === "replace-bullet" && suggestion.change.bulletId === bulletId)
  const addsFor = (entryId: string) =>
    suggestions.filter((suggestion) => suggestion.change.type === "add-bullet" && suggestion.change.entryId === entryId)

  const isSelected = (target: LineTarget) =>
    !!selected &&
    selected.entryId === target.entryId &&
    selected.bulletId === target.bulletId &&
    selected.suggestionId === target.suggestionId

  function toggle(target: LineTarget) {
    onSelectLine(isSelected(target) ? null : target)
  }

  function bulletList(section: SectionKey, entryId: string, bullets: Bullet[]) {
    const visible = bullets.filter((bullet) => bulletIncluded(bullet.id))
    const added = filter?.addedBullets[entryId] ?? []
    const ghosts = addsFor(entryId)
    if (!visible.length && !added.length && !ghosts.length) return null
    return (
      <ul className="rd-bullets">
        {visible.map((bullet) => {
          const target = { section, entryId, bulletId: bullet.id }
          const pending = pendingFor(bullet.id).length
          const tailored = filter?.overrides[bullet.id] !== undefined
          const open = isSelected(target)
          return (
            <li key={bullet.id} data-state={pending ? "suggested" : tailored ? "tailored" : "profile"}>
              <button
                type="button"
                className="rd-line"
                aria-expanded={open}
                onClick={() => toggle(target)}
              >
                <span className="rd-marker" aria-hidden="true" />
                <span className="rd-line-text">{filter?.overrides[bullet.id] ?? bullet.text}</span>
                {pending > 0 && (
                  <span className="rd-line-tag">
                    {pending} suggestion{pending === 1 ? "" : "s"}
                  </span>
                )}
                {tailored && !pending && <span className="rd-line-tag rd-line-tag-tailored">This resume only</span>}
              </button>
              {open && renderPopover(target)}
            </li>
          )
        })}
        {added.map((bullet) => (
          <li key={bullet.id} data-state="tailored">
            <span className="rd-line rd-line-static">
              <span className="rd-marker" aria-hidden="true" />
              <span className="rd-line-text">{bullet.text}</span>
              <span className="rd-line-tag rd-line-tag-tailored">This resume only</span>
            </span>
          </li>
        ))}
        {ghosts.map((suggestion) => {
          const target = { section, entryId, suggestionId: suggestion.id }
          const open = isSelected(target)
          return (
            <li key={suggestion.id} data-state="ghost">
              <button type="button" className="rd-line" aria-expanded={open} onClick={() => toggle(target)}>
                <span className="rd-marker" aria-hidden="true" />
                <span className="rd-line-text">
                  {suggestion.change.type === "add-bullet" ? suggestion.change.text : ""}
                </span>
                <span className="rd-line-tag">Suggested</span>
              </button>
              {open && renderPopover(target)}
            </li>
          )
        })}
      </ul>
    )
  }

  function sectionBody(section: SectionKey) {
    switch (section) {
      case "education":
        return profile.sections.education.items.filter((item) => included(item.id)).map((item) => (
          <div className="rd-entry" key={item.id}>
            <div className="rd-row"><strong>{item.school}</strong><span>{item.location}</span></div>
            <div className="rd-row rd-sub">
              <em>{joinParts([joinParts([item.degree, item.field], " in "), item.gpa && `GPA ${item.gpa}`])}</em>
              <span>{dateRange(item.startDate, item.endDate)}</span>
            </div>
            {bulletList(section, item.id, item.bullets)}
          </div>
        ))
      case "experience":
        return profile.sections.experience.items.filter((item) => included(item.id)).map((item) => (
          <div className="rd-entry" key={item.id}>
            <div className="rd-row"><strong>{item.role}</strong><span>{dateRange(item.startDate, item.endDate)}</span></div>
            <div className="rd-row rd-sub"><em>{item.organization}</em><span>{item.location}</span></div>
            {bulletList(section, item.id, item.bullets)}
          </div>
        ))
      case "projects":
        return profile.sections.projects.items.filter((item) => included(item.id)).map((item) => (
          <div className="rd-entry" key={item.id}>
            <div className="rd-row">
              <span>
                <strong>{item.name}</strong>
                {item.technologies.length > 0 && <em> | {item.technologies.join(", ")}</em>}
              </span>
              <span>{dateRange(item.startDate, item.endDate)}</span>
            </div>
            {bulletList(section, item.id, item.bullets)}
          </div>
        ))
      case "skills":
        return (
          <ul className="rd-skills">
            {profile.sections.skills.items.filter((item) => included(item.id)).map((item) => {
              const extra = suggestions.filter(
                (suggestion) => suggestion.change.type === "add-skill" && suggestion.change.entryId === item.id,
              )
              return (
                <li key={item.id}>
                  <strong>{item.category}:</strong> {item.skills.join(", ")}
                  {extra.map((suggestion) => {
                    const target = { section, entryId: item.id, suggestionId: suggestion.id }
                    return (
                      <Fragment key={suggestion.id}>
                        {" "}
                        <button
                          type="button"
                          className="rd-skill-ghost"
                          aria-expanded={isSelected(target)}
                          onClick={() => toggle(target)}
                        >
                          + {suggestion.change.type === "add-skill" ? suggestion.change.skill : ""}
                          <span className="rd-line-tag">Suggested</span>
                        </button>
                        {isSelected(target) && renderPopover(target)}
                      </Fragment>
                    )
                  })}
                </li>
              )
            })}
          </ul>
        )
      case "coursework": {
        const courses = profile.sections.coursework.items.filter((item) => included(item.id))
        return <p className="rd-coursework">{courses.map((item) => joinParts([item.code, item.title], " ")).join(", ")}</p>
      }
    }
  }

  const sections = sectionOrder.filter(
    (section) => (profile.sections[section].items as { id: string }[]).some((item) => included(item.id)),
  )

  return (
    <article className="rd-page" aria-label="Resume preview">
      <header className="rd-header">
        <h2>{contact.name || "Your name"}</h2>
        {contactLine.length > 0 && (
          <p>
            {contactLine.map((part, index) => (
              <Fragment key={part}>
                {index > 0 && <span aria-hidden="true"> | </span>}
                {part}
              </Fragment>
            ))}
          </p>
        )}
      </header>
      {sections.length === 0 && <p className="rd-empty">Nothing to show yet. Add entries in Experience and they appear here.</p>}
      {sections.map((section) => (
        <section
          key={section}
          className="rd-section"
          data-section={section}
          data-active={activeSection === section}
          aria-label={sectionLabels[section]}
        >
          <h3>
            <button type="button" onClick={() => onSelectSection(section)} aria-pressed={activeSection === section}>
              {sectionLabels[section]}
            </button>
          </h3>
          {sectionBody(section)}
        </section>
      ))}
      <p className="rd-footnote">{footnote}</p>
    </article>
  )
}
