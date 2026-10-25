"use client"

import { useState } from "react"
import { ChevronDown, Plus, Trash2 } from "lucide-react"
import type { BulletRewrite } from "@/lib/resume-suggestions"
import { BulletList } from "./bullet-list"
import { Field, ProseField, SectionHeading, TagsField } from "./fields"
import { pill } from "./pills"
import type { FieldSpec, ListSectionSpec } from "./sections"

type Entry = Record<string, unknown>

/** The AI's rewrites for one entry, by "field.line", with whether each has been answered. */
export type EntryRewrites = Map<string, { rewrite: BulletRewrite; answered: boolean }>

export interface SuggestionHandlers {
  onAccept: (rewrite: BulletRewrite) => void
  onReject: (rewrite: BulletRewrite) => void
}

const asText = (value: unknown) => (value === null || value === undefined ? "" : String(value))
const asList = (value: unknown) => (Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [])

/** The fields of one entry, laid out two across where they're short. */
function EntryFields({
  fields,
  entry,
  onChange,
  rewrites,
  suggestions,
}: {
  fields: FieldSpec[]
  entry: Entry
  onChange: (key: string, value: unknown) => void
  rewrites?: EntryRewrites
  suggestions?: SuggestionHandlers
}) {
  return (
    <div className="grid grid-cols-1 gap-x-5 gap-y-[18px] @md:grid-cols-2">
      {fields.map((field) => {
        const span = field.half ? "" : "@md:col-span-2"
        switch (field.kind) {
          case "bullets": {
            // The rewrites that land in this field, re-keyed by line number.
            const byLine = new Map<number, BulletRewrite>()
            const answered = new Set<number>()
            if (rewrites) {
              for (const [key, value] of rewrites) {
                const [name, line] = key.split(".")
                if (name !== field.key) continue
                byLine.set(Number(line), value.rewrite)
                if (value.answered) answered.add(Number(line))
              }
            }
            return (
              <div key={field.key} className={span}>
                <BulletList
                  label={field.label}
                  hint={field.hint}
                  bullets={asList(entry[field.key])}
                  rewrites={byLine.size ? byLine : undefined}
                  answered={answered}
                  onChange={(value) => onChange(field.key, value)}
                  onAccept={suggestions?.onAccept}
                  onReject={suggestions?.onReject}
                />
              </div>
            )
          }
          case "tags":
            return (
              <TagsField
                key={field.key}
                className={span}
                label={field.label}
                value={asList(entry[field.key])}
                placeholder={field.placeholder}
                hint={field.hint}
                onChange={(value) => onChange(field.key, value)}
              />
            )
          case "prose":
            return (
              <ProseField
                key={field.key}
                className={span}
                label={field.label}
                value={asText(entry[field.key])}
                placeholder={field.placeholder}
                hint={field.hint}
                onChange={(value) => onChange(field.key, value)}
              />
            )
          default:
            return (
              <Field
                key={field.key}
                className={span}
                label={field.label}
                value={asText(entry[field.key])}
                placeholder={field.placeholder}
                hint={field.hint}
                web={field.web}
                onChange={(value) => onChange(field.key, value)}
              />
            )
        }
      })}
    </div>
  )
}

/**
 * An entry's card: resting on the sheet, open, or being deleted. Folded, it's
 * one line — the entry's name, then a quieter second field, with its dates
 * under them. Open, it holds the section's fields.
 *
 * Adapted from resumezip's SectionForm cards (MIT, © 2025 Ian Hoang).
 */
function EntryCard({
  spec,
  entry,
  index,
  open,
  flagged,
  onOpen,
  onChange,
  onDelete,
  rewrites,
  suggestions,
  notes,
}: {
  spec: ListSectionSpec
  entry: Entry
  index: number
  open: boolean
  flagged: boolean
  onOpen: () => void
  onChange: (key: string, value: unknown) => void
  onDelete: () => void
  rewrites?: EntryRewrites
  suggestions?: SuggestionHandlers
  /** The review's notes about this entry, shown inside the card when it opens. */
  notes?: { id: string; tier: string; text: string; why?: string }[]
}) {
  const [confirming, setConfirming] = useState(false)
  const name = asText(entry[spec.titleKey]).trim()
  const second = spec.secondKey ? asText(entry[spec.secondKey]).trim() : ""
  const meta = (spec.metaKeys ?? [])
    .map((key) => (Array.isArray(entry[key]) ? asList(entry[key]).join(", ") : asText(entry[key]).trim()))
    .filter(Boolean)
    .join(" · ")
  // Suggestions on this card still waiting for a tick or a cross.
  const waiting = rewrites ? [...rewrites.values()].filter((item) => !item.answered).length : 0

  return (
    <section
      data-entry-index={index}
      className={`@container rounded-[18px] border bg-sheet transition-[border-color,box-shadow] duration-300 motion-reduce:transition-none ${
        open
          ? "border-rule shadow-card-open"
          : flagged
            ? "border-caution/45 shadow-card-rest"
            : "border-hairline shadow-card-rest hover:border-rule"
      }`}
    >
      <div className={`flex items-center gap-1 px-3 ${open ? "pb-2.5 pt-3.5" : "py-[11px]"}`}>
        <button
          type="button"
          onClick={onOpen}
          aria-expanded={open}
          className="flex min-w-0 flex-1 flex-col items-start gap-0.5 rounded-[12px] py-0.5 pl-1 pr-2 text-left focus-visible:outline-none"
        >
          <span className="flex min-w-0 max-w-full items-baseline gap-1.5 truncate text-[15px] tracking-[-0.01em]">
            <span className={`font-medium ${name ? "text-ink" : "text-ink-3"}`}>{name || `Untitled ${spec.singular}`}</span>
            {second && <span className="truncate text-ink-3">· {second}</span>}
          </span>
          {meta && !open && <span className="max-w-full truncate text-[13px] text-ink-3">{meta}</span>}
        </button>
        {waiting > 0 ? (
          <span
            title={`${waiting} suggested ${waiting === 1 ? "rewrite" : "rewrites"}`}
            className="mr-1 inline-flex h-[19px] shrink-0 items-center gap-1 rounded-full bg-caution/15 px-1.5 text-[11px] font-medium tabular-nums text-caution"
          >
            <span aria-hidden="true" className="h-[5px] w-[5px] rounded-full bg-caution" />
            {waiting}
          </span>
        ) : (
          flagged &&
          !open && <span aria-label="Has review notes" title="Has review notes" className="mr-1 h-[7px] w-[7px] shrink-0 rounded-full bg-caution" />
        )}
        <button
          type="button"
          onClick={() => setConfirming(true)}
          aria-label={`Delete ${name || spec.singular}`}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-fill hover:text-alert focus-visible:outline-none"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={onOpen}
          aria-hidden="true"
          tabIndex={-1}
          className="flex h-9 w-7 shrink-0 items-center justify-center rounded-full text-ink-3 transition-colors hover:text-ink"
        >
          <ChevronDown
            className={`h-[18px] w-[18px] transition-transform duration-300 ease-glide motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      {confirming && (
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-hairline px-4 py-3">
          <span className="mr-auto text-[14px] text-ink-2">Delete this {spec.singular}?</span>
          <button type="button" onClick={() => setConfirming(false)} className={pill("white", "h-9 px-4 text-[14px] font-medium")}>
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              setConfirming(false)
              onDelete()
            }}
            className={pill("danger", "h-9 px-4 text-[14px] font-medium")}
          >
            Delete
          </button>
        </div>
      )}

      {/* Opening animates the row's height rather than the card's, so the
          fields inside aren't squashed on the way. */}
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className={`min-h-0 overflow-hidden transition-opacity duration-200 motion-reduce:transition-none ${open ? "opacity-100" : "opacity-0"}`}>
          <div className="flex flex-col gap-4 px-4 pb-5 pt-2">
            {/* What the dot on the card is about. Without this the marker
                promised a correction the card never showed. */}
            {notes && notes.length > 0 && (
              <ul className="flex flex-col gap-2 rounded-[12px] bg-fill/70 p-3">
                {notes.map((note) => (
                  <li key={note.id} className="flex gap-2.5">
                    <span
                      aria-hidden="true"
                      className={`mt-[6px] h-[7px] w-[7px] shrink-0 rounded-full ${note.tier === "fix" ? "bg-alert" : "bg-caution"}`}
                    />
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-[14px] leading-snug text-ink">{note.text}</span>
                      {note.why && <span className="text-[13px] leading-snug text-ink-2">{note.why}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <EntryFields fields={spec.fields} entry={entry} onChange={onChange} rewrites={rewrites} suggestions={suggestions} />
          </div>
        </div>
      </div>
    </section>
  )
}

/**
 * One list section of the resume: its title, its entries as cards, and a
 * dashed button to add another. One card is open at a time; a new one opens
 * as it's added.
 */
export function SectionForm({
  spec,
  entries,
  onChange,
  /** Entry indexes a review note points at, so their cards carry a dot. */
  flagged = [],
  /** The AI's line-level rewrites, looked up per entry. */
  rewritesFor,
  suggestions,
  notesFor,
}: {
  spec: ListSectionSpec
  entries: Entry[]
  onChange: (entries: Entry[]) => void
  flagged?: number[]
  rewritesFor?: (entryIndex: number) => EntryRewrites
  suggestions?: SuggestionHandlers
  /** The review's notes about one entry, shown inside its card. */
  notesFor?: (entryIndex: number) => { id: string; tier: string; text: string; why?: string }[]
}) {
  const [open, setOpen] = useState<number | null>(entries.length === 1 ? 0 : null)

  const updateEntry = (index: number, key: string, value: unknown) => {
    onChange(entries.map((entry, at) => (at === index ? { ...entry, [key]: value } : entry)))
  }
  const removeEntry = (index: number) => {
    onChange(entries.filter((_, at) => at !== index))
    setOpen((current) => (current === null || current < index ? current : current === index ? null : current - 1))
  }
  const addEntry = () => {
    onChange([...entries, spec.blank()])
    setOpen(entries.length)
  }

  const count = entries.length
  return (
    <div className="flex flex-col gap-6">
      <SectionHeading
        title={spec.title}
        note={count === 0 ? `No ${spec.title.toLowerCase()} yet.` : `${count} ${count === 1 ? "entry" : "entries"}`}
      />

      <div className="flex flex-col gap-2.5">
        {entries.map((entry, index) => (
          <EntryCard
            // Index is the identity here: entries have no id of their own in
            // the resume schema, and the list only ever grows at its end or
            // loses the card being deleted.
            key={index}
            spec={spec}
            entry={entry}
            index={index}
            open={open === index}
            flagged={flagged.includes(index)}
            onOpen={() => setOpen(open === index ? null : index)}
            onChange={(key, value) => updateEntry(index, key, value)}
            onDelete={() => removeEntry(index)}
            rewrites={rewritesFor?.(index)}
            suggestions={suggestions}
            notes={notesFor?.(index)}
          />
        ))}

        <button
          type="button"
          onClick={addEntry}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[18px] border border-dashed border-rule-strong text-[15px] font-medium tracking-[-0.01em] text-brand transition-colors duration-150 hover:border-ink/30 hover:bg-fill [&_svg]:size-4"
        >
          <Plus aria-hidden="true" />
          Add {/^[aeiou]/i.test(spec.singular) ? "an" : "a"} {spec.singular}
        </button>
      </div>
    </div>
  )
}
