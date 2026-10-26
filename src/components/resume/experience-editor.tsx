"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowDown, ArrowUp, Lock, Mail, Pencil, Plus, Sparkles, Trash2 } from "lucide-react"
import type { AnyEntry, Bullet, SectionKey } from "@/lib/resume/types"
import {
  bulletUsedIn,
  effectiveVisibility,
  entryBullets,
  entryTitle,
  entryUsedIn,
  isProfileEmpty,
  liveSuggestions,
  sectionLabels,
  sectionOrder,
  singularLabels,
} from "@/lib/resume/workspace"
import { useResumeWorkspace } from "./workspace-provider"
import { ContactForm, EntryForm, blankEntry } from "./entry-forms"
import { sectionIcons } from "./review"

type Editing = { section: SectionKey; entry: AnyEntry; isNew: boolean } | null

function entryMeta(section: SectionKey, entry: AnyEntry): string {
  const record = entry as unknown as Record<string, string>
  const dates = [record.startDate, record.endDate].filter(Boolean).join(" – ")
  switch (section) {
    case "education":
      return [[record.degree, record.field].filter(Boolean).join(" in "), dates, record.gpa && `GPA ${record.gpa}`].filter(Boolean).join(" · ")
    case "experience":
      return [record.location, dates].filter(Boolean).join(" · ")
    case "projects":
      return [dates, record.link].filter(Boolean).join(" · ")
    case "coursework":
      return record.term
    case "skills":
      return ""
  }
}

function VisibilityPill({ label = "Private" }: { label?: string }) {
  // Public is stored on every level but hidden until "community" is defined.
  return (
    <span className="ex-pill">
      <Lock size={12} aria-hidden="true" /> {label}
    </span>
  )
}

function UsedIn({ names }: { names: string[] }) {
  return (
    <span className="ex-used-in">
      <span>Used in</span>
      {names.map((name) => (
        <span key={name} className="ex-used-tag">{name}</span>
      ))}
    </span>
  )
}

export function ExperienceEditor() {
  const { state, dispatch, loadSample, clearAll } = useResumeWorkspace()
  const { profile } = state
  const [editing, setEditing] = useState<Editing>(null)
  const [editingContact, setEditingContact] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const suggestions = liveSuggestions(profile, state.suggestions)
  const suggestedBullets = new Set(
    suggestions.flatMap((suggestion) => (suggestion.change.type === "replace-bullet" ? [suggestion.change.bulletId] : [])),
  )
  const savedCount = sectionOrder.reduce((total, section) => total + profile.sections[section].items.length, 0)

  function startAdd(section: SectionKey) {
    setEditingContact(false)
    setEditing({ section, entry: blankEntry(section), isNew: true })
    requestAnimationFrame(() => document.getElementById(`section-${section}`)?.scrollIntoView({ block: "start", behavior: "smooth" }))
  }

  function save(section: SectionKey, entry: AnyEntry) {
    dispatch({ type: "entry/save", section, entry })
    setEditing(null)
  }

  if (isProfileEmpty(profile) && !editing && !editingContact) {
    return (
      <div className="career-page resume-page">
        <ExperienceHeading />
        <div className="ex-empty">
          <span className="rs-empty-icon"><Sparkles size={24} aria-hidden="true" /></span>
          <h2>What have you worked on?</h2>
          <p>Start with anything: a class project, a job, a club role. Everything you add stays private, and your resume is built from it.</p>
          <div className="ex-empty-actions">
            <button type="button" className="rs-button rs-button-primary" onClick={() => startAdd("experience")}>
              <Plus size={16} aria-hidden="true" /> Add experience
            </button>
            <button type="button" className="rs-button rs-button-section" data-section="projects" onClick={() => startAdd("projects")}>Add a project</button>
            <button type="button" className="rs-button rs-button-section" data-section="education" onClick={() => startAdd("education")}>Add education</button>
            <button type="button" className="rs-button rs-button-section" data-section="coursework" onClick={() => startAdd("coursework")}>Add coursework</button>
          </div>
          <button type="button" className="rv-text-button" onClick={loadSample}>Or load a sample profile to look around</button>
        </div>
        <MockNote />
      </div>
    )
  }

  return (
    <div className="career-page resume-page">
      <ExperienceHeading />

      {suggestions.length > 0 && (
        <div className="rs-banner">
          <Sparkles size={20} aria-hidden="true" />
          <div>
            <strong>{suggestions.length} suggestion{suggestions.length === 1 ? "" : "s"} waiting</strong>
            <p>Suggestions stay separate until you accept them on your resume.</p>
          </div>
          <Link className="rs-button rs-button-soft" href="/resume">Review on Resume</Link>
        </div>
      )}

      <section className="ex-card ex-contact" aria-labelledby="contact-heading">
        {editingContact ? (
          <ContactForm
            contact={profile.contact}
            onCancel={() => setEditingContact(false)}
            onSave={(contact) => {
              dispatch({ type: "contact/save", contact })
              setEditingContact(false)
            }}
          />
        ) : (
          <div className="ex-contact-row">
            <span className="ex-section-icon" data-section="contact"><Mail size={17} aria-hidden="true" /></span>
            <div>
              <h2 id="contact-heading">Contact info</h2>
              <p>
                {[profile.contact.name, profile.contact.email, profile.contact.phone, profile.contact.location]
                  .filter(Boolean)
                  .join(" · ") || "Add your name and email so your resume has a header."}
              </p>
            </div>
            <VisibilityPill label={effectiveVisibility(profile.contact.visibility) === "private" ? "Private" : "Public"} />
            <button type="button" className="rs-button rs-button-ghost" onClick={() => { setEditing(null); setEditingContact(true) }}>
              <Pencil size={14} aria-hidden="true" /> {profile.contact.name ? "Edit" : "Add"}
            </button>
          </div>
        )}
      </section>

      <div className="ex-toolbar">
        <p>{savedCount} saved {savedCount === 1 ? "entry" : "entries"}</p>
        <div>
          <button type="button" className="rs-button rs-button-primary" onClick={() => startAdd("experience")}>
            <Plus size={16} aria-hidden="true" /> Add experience
          </button>
          {(["projects", "education", "skills", "coursework"] as const).map((section) => (
            <button key={section} type="button" className="rs-button rs-button-section" data-section={section} onClick={() => startAdd(section)}>
              Add {singularLabels[section]}
            </button>
          ))}
        </div>
      </div>

      {sectionOrder.map((section) => {
        const Icon = sectionIcons[section]
        const items = profile.sections[section].items as AnyEntry[]
        const addingHere = editing?.isNew && editing.section === section
        return (
          <section key={section} id={`section-${section}`} className="ex-section" data-section={section} aria-labelledby={`heading-${section}`}>
            <header className="ex-section-head">
              <span className="ex-section-icon" data-section={section}><Icon size={17} aria-hidden="true" /></span>
              <h2 id={`heading-${section}`}>
                {sectionLabels[section]} <span>({items.length})</span>
              </h2>
              <VisibilityPill />
              <button type="button" className="rs-button rs-button-ghost" onClick={() => startAdd(section)} disabled={!!addingHere}>
                <Plus size={14} aria-hidden="true" /> Add
              </button>
            </header>

            {items.length === 0 && !addingHere && (
              <p className="ex-section-empty">No {sectionLabels[section].toLowerCase()} yet.</p>
            )}

            {items.map((entry, index) => {
              if (editing && !editing.isNew && editing.entry.id === entry.id) {
                return (
                  <div className="ex-card" key={entry.id}>
                    <EntryForm section={section} entry={editing.entry} isNew={false} onCancel={() => setEditing(null)} onSave={(next) => save(section, next)} />
                  </div>
                )
              }
              const bullets = entryBullets(entry)
              const meta = entryMeta(section, entry)
              const chips = "technologies" in entry ? entry.technologies : "skills" in entry ? entry.skills : []
              const title = entryTitle(section, entry)
              return (
                <article className="ex-card ex-entry" key={entry.id} data-section={section}>
                  <div className="ex-entry-head">
                    <div>
                      <span className="ex-kicker">{singularLabels[section]}</span>
                      <h3>{title}</h3>
                      {meta && <p className="ex-meta">{meta}</p>}
                    </div>
                    <div className="ex-entry-controls">
                      <button type="button" className="ex-icon-button" onClick={() => dispatch({ type: "entry/move", section, id: entry.id, direction: -1 })} disabled={index === 0} aria-label={`Move ${title} up`}>
                        <ArrowUp size={15} aria-hidden="true" />
                      </button>
                      <button type="button" className="ex-icon-button" onClick={() => dispatch({ type: "entry/move", section, id: entry.id, direction: 1 })} disabled={index === items.length - 1} aria-label={`Move ${title} down`}>
                        <ArrowDown size={15} aria-hidden="true" />
                      </button>
                      <button type="button" className="rs-button rs-button-ghost" onClick={() => { setEditingContact(false); setEditing({ section, entry, isNew: false }) }}>
                        <Pencil size={14} aria-hidden="true" /> Edit
                      </button>
                      {confirmDelete === entry.id ? (
                        <span className="ex-confirm" role="group" aria-label={`Delete ${title}?`}>
                          Delete?
                          <button type="button" className="rs-button rs-button-danger" onClick={() => { dispatch({ type: "entry/delete", section, id: entry.id }); setConfirmDelete(null) }}>Delete</button>
                          <button type="button" className="rv-text-button" onClick={() => setConfirmDelete(null)}>Keep</button>
                        </span>
                      ) : (
                        <button type="button" className="ex-icon-button ex-delete" onClick={() => setConfirmDelete(entry.id)} aria-label={`Delete ${title}`}>
                          <Trash2 size={15} aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  </div>
                  {bullets.length > 0 && (
                    <ul className="ex-bullet-list">
                      {bullets.map((bullet: Bullet) => (
                        <li key={bullet.id}>
                          <p>{bullet.text}</p>
                          <div className="ex-bullet-tags">
                            <UsedIn names={bulletUsedIn(state, bullet.id)} />
                            {suggestedBullets.has(bullet.id) && (
                              <Link className="ex-suggested-link" href="/resume">Suggested change</Link>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                  {chips.length > 0 && (
                    <div className="ex-chips">{chips.map((chip) => <span key={chip}>{chip}</span>)}</div>
                  )}
                  {bullets.length === 0 && <UsedIn names={entryUsedIn(state, entry.id)} />}
                </article>
              )
            })}

            {addingHere && editing && (
              <div className="ex-card">
                <EntryForm section={section} entry={editing.entry} isNew onCancel={() => setEditing(null)} onSave={(next) => save(section, next)} />
              </div>
            )}
          </section>
        )
      })}

      <MockNote>
        <button type="button" className="rv-text-button" onClick={loadSample}>Reload sample profile</button>
        {confirmClear ? (
          <span className="ex-confirm">
            Remove everything?
            <button type="button" className="rs-button rs-button-danger" onClick={() => { clearAll(); setConfirmClear(false) }}>Clear profile</button>
            <button type="button" className="rv-text-button" onClick={() => setConfirmClear(false)}>Keep</button>
          </span>
        ) : (
          <button type="button" className="rv-text-button" onClick={() => setConfirmClear(true)}>Clear profile</button>
        )}
      </MockNote>
    </div>
  )
}

function ExperienceHeading() {
  return (
    <header className="career-page-heading rs-heading">
      <div>
        <span className="scaffold-eyebrow">Master profile</span>
        <h1>Experience</h1>
        <p>The one place your facts live. Your resume and every tailored version are generated from what you save here. Everything starts private.</p>
      </div>
    </header>
  )
}

function MockNote({ children }: { children?: React.ReactNode }) {
  return (
    <footer className="ex-mock-note">
      <p>Preview build: this profile is sample data saved in this browser only. It is not connected to your account yet.</p>
      {children && <div>{children}</div>}
    </footer>
  )
}
