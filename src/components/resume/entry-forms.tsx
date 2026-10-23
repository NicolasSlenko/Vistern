"use client"

import { useRef, useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import type { AnyEntry, Bullet, ContactInfo, EntryByKey, SectionKey } from "@/lib/resume/types"
import { newId, singularLabels } from "@/lib/resume/workspace"

type FieldSpec = {
  name: string
  label: string
  required?: boolean
  placeholder?: string
  type?: "text" | "email" | "tel"
  wide?: boolean
  hint?: string
}

const fieldsBySection: Record<SectionKey, FieldSpec[]> = {
  education: [
    { name: "school", label: "School", required: true, placeholder: "University of Florida", wide: true },
    { name: "degree", label: "Degree", required: true, placeholder: "B.S." },
    { name: "field", label: "Field of study", placeholder: "Computer Science" },
    { name: "startDate", label: "Start", placeholder: "Aug 2024" },
    { name: "endDate", label: "End or expected", placeholder: "May 2028" },
    { name: "location", label: "Location", placeholder: "Gainesville, FL" },
    { name: "gpa", label: "GPA", placeholder: "3.7" },
  ],
  experience: [
    { name: "role", label: "Role", required: true, placeholder: "Software engineering intern" },
    { name: "organization", label: "Organization", required: true, placeholder: "Company, lab or club" },
    { name: "startDate", label: "Start", required: true, placeholder: "May 2026" },
    { name: "endDate", label: "End", placeholder: "Aug 2026 or Present" },
    { name: "location", label: "Location", placeholder: "Remote" },
  ],
  projects: [
    { name: "name", label: "Project name", required: true, placeholder: "Distributed cache in Go", wide: true },
    { name: "technologies", label: "Technologies", placeholder: "Go, Redis, Docker", hint: "Separate with commas", wide: true },
    { name: "startDate", label: "Start", placeholder: "Sep 2026" },
    { name: "endDate", label: "End", placeholder: "Leave blank if ongoing" },
    { name: "link", label: "Link", placeholder: "github.com/you/project", wide: true },
  ],
  skills: [
    { name: "category", label: "Group name", required: true, placeholder: "Languages" },
    { name: "skills", label: "Skills", required: true, placeholder: "Python, Java, Go", hint: "Separate with commas", wide: true },
  ],
  coursework: [
    { name: "code", label: "Course code", placeholder: "CIS4930" },
    { name: "title", label: "Course title", required: true, placeholder: "Systems Programming" },
    { name: "term", label: "Term", placeholder: "Fall 2026" },
  ],
}

const contactFields: FieldSpec[] = [
  { name: "name", label: "Full name", required: true, placeholder: "Alex Rivera" },
  { name: "email", label: "Email", required: true, type: "email", placeholder: "you@ufl.edu" },
  { name: "phone", label: "Phone", type: "tel", placeholder: "(352) 555-0142" },
  { name: "location", label: "City", placeholder: "Gainesville, FL" },
  { name: "linkedin", label: "LinkedIn", placeholder: "linkedin.com/in/you" },
  { name: "github", label: "GitHub", placeholder: "github.com/you" },
  { name: "portfolio", label: "Portfolio", placeholder: "yoursite.dev", wide: true },
]

const listFields = new Set(["technologies", "skills"])
const sectionsWithBullets: SectionKey[] = ["education", "experience", "projects"]

export function blankEntry(section: SectionKey): AnyEntry {
  const base = { id: newId(section.slice(0, 4)), visibility: "private" as const, origin: "typed" as const }
  switch (section) {
    case "education":
      return { ...base, school: "", degree: "", field: "", location: "", startDate: "", endDate: "", gpa: "", bullets: [] }
    case "experience":
      return { ...base, role: "", organization: "", location: "", startDate: "", endDate: "", bullets: [] }
    case "projects":
      return { ...base, name: "", technologies: [], link: "", startDate: "", endDate: "", bullets: [] }
    case "skills":
      return { ...base, category: "", skills: [] }
    case "coursework":
      return { ...base, code: "", title: "", term: "" }
  }
}

function toValues(entry: object, fields: FieldSpec[]) {
  const record = entry as Record<string, unknown>
  return Object.fromEntries(
    fields.map((field) => {
      const value = record[field.name]
      return [field.name, Array.isArray(value) ? value.join(", ") : String(value ?? "")]
    }),
  )
}

function splitList(value: string) {
  return value.split(",").map((part) => part.trim()).filter(Boolean)
}

function useRequiredCheck(fields: FieldSpec[]) {
  const formRef = useRef<HTMLFormElement>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  function check(values: Record<string, string>) {
    const next: Record<string, string> = {}
    for (const field of fields) {
      if (field.required && !values[field.name]?.trim()) next[field.name] = `${field.label} is required`
    }
    setErrors(next)
    const first = fields.find((field) => next[field.name])
    if (first) formRef.current?.querySelector<HTMLInputElement>(`[name="${first.name}"]`)?.focus()
    return !first
  }
  return { formRef, errors, check }
}

function Fields({
  idPrefix,
  fields,
  values,
  errors,
  onChange,
}: {
  idPrefix: string
  fields: FieldSpec[]
  values: Record<string, string>
  errors: Record<string, string>
  onChange: (name: string, value: string) => void
}) {
  return (
    <div className="ex-fields">
      {fields.map((field) => {
        const id = `${idPrefix}-${field.name}`
        const describedBy = [errors[field.name] && `${id}-error`, field.hint && `${id}-hint`].filter(Boolean).join(" ")
        return (
          <div key={field.name} className={`ex-field${field.wide ? " ex-field-wide" : ""}`}>
            <label htmlFor={id}>
              {field.label}
              {field.required && <span className="ex-required" aria-hidden="true"> *</span>}
            </label>
            <input
              id={id}
              name={field.name}
              type={field.type ?? "text"}
              value={values[field.name] ?? ""}
              placeholder={field.placeholder}
              required={field.required}
              aria-invalid={!!errors[field.name]}
              aria-describedby={describedBy || undefined}
              onChange={(event) => onChange(field.name, event.target.value)}
            />
            {field.hint && <small id={`${id}-hint`}>{field.hint}</small>}
            {errors[field.name] && <small id={`${id}-error`} className="ex-error">{errors[field.name]}</small>}
          </div>
        )
      })}
    </div>
  )
}

function BulletsEditor({ idPrefix, bullets, onChange }: { idPrefix: string; bullets: Bullet[]; onChange: (bullets: Bullet[]) => void }) {
  return (
    <fieldset className="ex-bullets">
      <legend>Bullet points</legend>
      <p className="ex-hint">One accomplishment per line. Start with what you did, then the result.</p>
      {bullets.map((bullet, index) => (
        <div className="ex-bullet-row" key={bullet.id}>
          <label className="rv-visually-hidden" htmlFor={`${idPrefix}-bullet-${bullet.id}`}>Bullet {index + 1}</label>
          <textarea
            id={`${idPrefix}-bullet-${bullet.id}`}
            rows={2}
            value={bullet.text}
            onChange={(event) => onChange(bullets.map((item) => (item.id === bullet.id ? { ...item, text: event.target.value } : item)))}
          />
          <button
            type="button"
            className="ex-icon-button"
            onClick={() => onChange(bullets.filter((item) => item.id !== bullet.id))}
            aria-label={`Remove bullet ${index + 1}`}
          >
            <Trash2 size={15} aria-hidden="true" />
          </button>
        </div>
      ))}
      <button
        type="button"
        className="ex-add-bullet"
        onClick={() => onChange([...bullets, { id: newId("b"), text: "", visibility: "private" }])}
      >
        <Plus size={15} aria-hidden="true" /> Add bullet
      </button>
    </fieldset>
  )
}

function FormActions({ onCancel, saveLabel }: { onCancel: () => void; saveLabel: string }) {
  return (
    <div className="ex-form-actions">
      <p className="ex-hint"><span aria-hidden="true">*</span> Required</p>
      <button type="button" className="rs-button rs-button-ghost" onClick={onCancel}>Cancel</button>
      <button type="submit" className="rs-button rs-button-primary">{saveLabel}</button>
    </div>
  )
}

export function EntryForm({
  section,
  entry,
  isNew,
  onSave,
  onCancel,
}: {
  section: SectionKey
  entry: AnyEntry
  isNew: boolean
  onSave: (entry: AnyEntry) => void
  onCancel: () => void
}) {
  const fields = fieldsBySection[section]
  const [values, setValues] = useState(() => toValues(entry, fields))
  const [bullets, setBullets] = useState<Bullet[]>(() => ("bullets" in entry ? entry.bullets : []))
  const { formRef, errors, check } = useRequiredCheck(fields)
  const hasBullets = sectionsWithBullets.includes(section)

  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!check(values)) return
    const next: Record<string, unknown> = { ...entry }
    for (const field of fields) {
      next[field.name] = listFields.has(field.name) ? splitList(values[field.name]) : values[field.name].trim()
    }
    if (hasBullets) next.bullets = bullets.map((bullet) => ({ ...bullet, text: bullet.text.trim() })).filter((bullet) => bullet.text)
    onSave(next as unknown as EntryByKey[typeof section])
  }

  return (
    <form ref={formRef} className="ex-form" data-section={section} onSubmit={submit} noValidate>
      <h3>{isNew ? `Add ${singularLabels[section]}` : `Edit ${singularLabels[section]}`}</h3>
      <Fields
        idPrefix={entry.id}
        fields={fields}
        values={values}
        errors={errors}
        onChange={(name, value) => setValues((current) => ({ ...current, [name]: value }))}
      />
      {hasBullets && <BulletsEditor idPrefix={entry.id} bullets={bullets} onChange={setBullets} />}
      <FormActions onCancel={onCancel} saveLabel={isNew ? `Save ${singularLabels[section]}` : "Save changes"} />
    </form>
  )
}

export function ContactForm({
  contact,
  onSave,
  onCancel,
}: {
  contact: ContactInfo
  onSave: (contact: ContactInfo) => void
  onCancel: () => void
}) {
  const [values, setValues] = useState(() => toValues(contact, contactFields))
  const { formRef, errors, check } = useRequiredCheck(contactFields)

  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!check(values)) return
    const trimmed = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value.trim()]))
    onSave({ ...contact, ...trimmed })
  }

  return (
    <form ref={formRef} className="ex-form" data-section="contact" onSubmit={submit} noValidate>
      <h3>Contact info</h3>
      <Fields
        idPrefix="contact"
        fields={contactFields}
        values={values}
        errors={errors}
        onChange={(name, value) => setValues((current) => ({ ...current, [name]: value }))}
      />
      <FormActions onCancel={onCancel} saveLabel="Save contact info" />
    </form>
  )
}
