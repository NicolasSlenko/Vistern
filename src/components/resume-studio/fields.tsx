"use client"

import { useId } from "react"

/**
 * The studio's form controls. A field has no box, just a line under it, green
 * where the cursor is, with a soft light rising from that line while it has
 * focus. Its label is small monospace caps, and turns green with the line.
 *
 * Adapted from resumezip (MIT, © 2025 Ian Hoang).
 */

/** How a field looks, a one-line input or a text box alike. */
const underlined = (flagged: boolean) =>
  `relative w-full min-w-0 border-0 bg-transparent py-2 text-[15px] text-ink outline-none transition-colors placeholder:text-ink-2/50 focus-visible:outline-none ${
    flagged ? "border-b-2 border-brand" : "border-b border-rule-strong hover:border-ink/40"
  }`

/**
 * A soft green light that rises from a field's line while it has focus. It's
 * under the field (which is `relative`, and later), so the text stays crisp,
 * and nothing moves.
 */
function FocusGlow() {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 bottom-0 h-10 rounded-t-[6px] bg-linear-to-t from-brand/[0.09] to-brand/0 opacity-0 transition-opacity duration-200 ease-out group-focus-within/field:opacity-100 motion-reduce:transition-none"
    />
  )
}

/** The line under the field being typed in, in green, drawn out from the left. */
function FocusLine() {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-0 bg-brand shadow-[0_0_10px_color-mix(in_oklab,var(--color-brand)_55%,transparent)] transition-transform duration-300 ease-glide group-focus-within/field:scale-x-100 motion-reduce:transition-none"
    />
  )
}

const LABEL = "label-mono text-ink-2 transition-colors group-focus-within/field:text-brand"

interface FieldProps {
  label: string
  value: string
  placeholder?: string
  type?: string
  className?: string
  onChange: (value: string) => void
  /** What belongs in the field, shown under it and read out with it. */
  hint?: string
  /** Marks the field as the one a review note points at. */
  flagged?: boolean
  autoComplete?: string
  /** A web address: phones show the keyboard for one, with no spelling marks and no capital first letter. */
  web?: boolean
}

/** A labelled, underlined text input. */
export function Field({
  label,
  value,
  placeholder,
  type = "text",
  className = "",
  onChange,
  hint,
  flagged = false,
  autoComplete,
  web,
}: FieldProps) {
  const hintId = useId()
  return (
    <div className={`flex min-w-0 flex-col gap-1.5 ${className}`}>
      <label className="group/field relative flex min-w-0 flex-col gap-1.5">
        <span className={LABEL}>{label}</span>
        <FocusGlow />
        <input
          type={type}
          value={value}
          placeholder={placeholder}
          aria-describedby={hint ? hintId : undefined}
          autoComplete={autoComplete}
          inputMode={web ? "url" : undefined}
          spellCheck={web ? false : undefined}
          autoCapitalize={web ? "off" : undefined}
          onChange={(event) => onChange(event.target.value)}
          className={underlined(flagged)}
        />
        <FocusLine />
      </label>
      {hint && (
        <span id={hintId} className="text-[13px] leading-normal text-ink-3">
          {hint}
        </span>
      )}
    </div>
  )
}

/** A labelled, underlined box for a few lines of prose, as a project's summary. */
export function ProseField({ label, value, placeholder, className = "", onChange, hint, flagged = false, rows = 3 }: FieldProps & { rows?: number }) {
  const hintId = useId()
  return (
    <div className={`flex min-w-0 flex-col gap-1.5 ${className}`}>
      <label className="group/field relative flex min-w-0 flex-col gap-1.5">
        <span className={LABEL}>{label}</span>
        <FocusGlow />
        <textarea
          value={value}
          rows={rows}
          placeholder={placeholder}
          aria-describedby={hint ? hintId : undefined}
          onChange={(event) => onChange(event.target.value)}
          className={`${underlined(flagged)} resize-y leading-relaxed`}
        />
        <FocusLine />
      </label>
      {hint && (
        <span id={hintId} className="text-[13px] leading-normal text-ink-3">
          {hint}
        </span>
      )}
    </div>
  )
}

/**
 * A box for bullet points, one per line. The resume keeps them as an array of
 * strings; the box joins and splits on newlines, and blank lines are dropped
 * on the way back so a trailing Enter doesn't save an empty bullet.
 */
export function BulletsField({
  label,
  value,
  placeholder,
  className = "",
  onChange,
  hint = "One bullet per line.",
  flagged = false,
  rows = 5,
}: Omit<FieldProps, "value" | "onChange"> & { value: string[]; onChange: (value: string[]) => void; rows?: number }) {
  const hintId = useId()
  return (
    <div className={`flex min-w-0 flex-col gap-1.5 ${className}`}>
      <label className="group/field relative flex min-w-0 flex-col gap-1.5">
        <span className={LABEL}>{label}</span>
        <FocusGlow />
        <textarea
          // Not a controlled join of `value`: re-joining on every keystroke
          // would swallow the blank line you're part-way through typing.
          defaultValue={value.join("\n")}
          rows={rows}
          placeholder={placeholder}
          aria-describedby={hintId}
          onChange={(event) => onChange(event.target.value.split("\n").filter((line) => line.trim() !== ""))}
          className={`${underlined(flagged)} resize-y leading-relaxed`}
        />
        <FocusLine />
      </label>
      <span id={hintId} className="text-[13px] leading-normal text-ink-3">
        {hint}
      </span>
    </div>
  )
}

/** A comma-separated list, as a project's technologies, shown back as chips under the line. */
export function TagsField({
  label,
  value,
  placeholder,
  className = "",
  onChange,
  hint,
}: Omit<FieldProps, "value" | "onChange"> & { value: string[]; onChange: (value: string[]) => void }) {
  const hintId = useId()
  return (
    <div className={`flex min-w-0 flex-col gap-1.5 ${className}`}>
      <label className="group/field relative flex min-w-0 flex-col gap-1.5">
        <span className={LABEL}>{label}</span>
        <FocusGlow />
        <input
          type="text"
          defaultValue={value.join(", ")}
          placeholder={placeholder}
          aria-describedby={hintId}
          onChange={(event) => onChange(event.target.value.split(",").map((tag) => tag.trim()).filter(Boolean))}
          className={underlined(false)}
        />
        <FocusLine />
      </label>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {value.map((tag) => (
            <span key={tag} className="inline-flex h-[23px] items-center rounded-full bg-fill px-2.5 text-[12px] text-ink-2 ring-1 ring-fill-line ring-inset">
              {tag}
            </span>
          ))}
        </div>
      )}
      <span id={hintId} className="text-[13px] leading-normal text-ink-3">
        {hint ?? "Separate with commas."}
      </span>
    </div>
  )
}

/** The big serif title at the top of each section, with a note under it and room for an action at its end. */
export function SectionHeading({ title, note, end }: { title: string; note?: string; end?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
      <div className="flex min-w-0 flex-col gap-[5px]">
        <h1 tabIndex={-1} className="min-w-0 font-serif text-[34px] leading-[1.1] tracking-[-0.03em] wrap-anywhere text-ink sm:text-[40px]">
          {title}
        </h1>
        {note && <p className="text-[14px] leading-5 text-ink-3">{note}</p>}
      </div>
      {end && <div className="-mb-1.5 ml-auto shrink-0">{end}</div>}
    </div>
  )
}
