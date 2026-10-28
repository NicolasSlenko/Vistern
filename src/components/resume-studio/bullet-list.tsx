"use client"

import { useEffect, useId, useRef, useState } from "react"
import { Check, Plus, Sparkles, Trash2, X } from "lucide-react"
import type { BulletRewrite } from "@/lib/resume-suggestions"

/**
 * Bullets, one line each, with the AI's rewrite shown over the line it
 * replaces.
 *
 * A bullet the AI wants to change is marked in the margin and tinted. Under
 * it sits the suggested wording and one sentence on why, with a tick to take
 * it and a cross to turn it down. Taking it swaps the words in place and the
 * line flashes so you can see what moved; turning it down puts the line back
 * to plain and doesn't ask again.
 *
 * Each bullet is its own box rather than one textarea of lines, because a
 * suggestion has to attach to a line — and because deleting line three
 * shouldn't mean re-reading the whole block.
 */

const SEVERITY_DOT: Record<BulletRewrite["severity"], string> = {
  fix: "bg-alert",
  look: "bg-caution",
  optional: "bg-brand",
}

const SEVERITY_NAME: Record<BulletRewrite["severity"], string> = {
  fix: "Must fix",
  look: "Worth a look",
  optional: "Polish",
}

/** A box that grows with its words, so a long bullet is never hidden behind a scrollbar. */
function GrowingBox({
  value,
  placeholder,
  onChange,
  onEnter,
  onBackspaceEmpty,
  className = "",
  flagged,
}: {
  value: string
  placeholder?: string
  onChange: (value: string) => void
  onEnter: () => void
  onBackspaceEmpty: () => void
  className?: string
  flagged: boolean
}) {
  const box = useRef<HTMLTextAreaElement>(null)
  // Measured rather than set in rows: the width changes with the panel.
  useEffect(() => {
    const element = box.current
    if (!element) return
    element.style.height = "auto"
    element.style.height = `${element.scrollHeight}px`
  }, [value])

  return (
    <textarea
      ref={box}
      rows={1}
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault()
          onEnter()
        }
        if (event.key === "Backspace" && value === "") {
          event.preventDefault()
          onBackspaceEmpty()
        }
      }}
      className={`w-full resize-none border-0 bg-transparent py-1 text-[15px] leading-relaxed text-ink outline-none placeholder:text-ink-2/50 focus-visible:outline-none ${
        flagged ? "" : ""
      } ${className}`}
    />
  )
}

function Bullet({
  value,
  rewrite,
  answered,
  onChange,
  onEnter,
  onRemove,
  onAccept,
  onReject,
  onEnhance,
}: {
  value: string
  rewrite: BulletRewrite | undefined
  answered: boolean
  onChange: (value: string) => void
  onEnter: () => void
  onRemove: () => void
  onAccept: () => void
  onReject: () => void
  /** Opens three AI options for this line; absent where the section has no such bullets. */
  onEnhance?: () => void
}) {
  const details = useId()
  // Set for a moment after a rewrite is taken, to light the line up.
  const [justChanged, setJustChanged] = useState(false)
  useEffect(() => {
    if (!justChanged) return
    const timer = setTimeout(() => setJustChanged(false), 1600)
    return () => clearTimeout(timer)
  }, [justChanged])

  const open = Boolean(rewrite) && !answered

  return (
    <li
      className={`group/bullet relative -mx-2 flex flex-col rounded-[12px] px-2 transition-colors duration-300 motion-reduce:transition-none ${
        open ? "bg-caution/[0.07]" : "hover:bg-fill/60"
      }`}
    >
      <div className="flex items-start gap-2">
        {/* The marker: a dot while there's a suggestion to answer, the bullet's own mark otherwise. */}
        <span aria-hidden="true" className="flex h-[29px] w-3 shrink-0 items-center justify-center">
          {open ? (
            <span className={`h-[7px] w-[7px] rounded-full ${SEVERITY_DOT[rewrite!.severity]}`} />
          ) : (
            <span className="h-[3px] w-[3px] rounded-full bg-ink-3" />
          )}
        </span>

        <span
          className={`min-w-0 flex-1 rounded transition-colors duration-700 motion-reduce:transition-none ${
            justChanged ? "bg-brand/15" : ""
          }`}
        >
          <GrowingBox
            value={value}
            placeholder="Accomplished X, measured by Y, by doing Z"
            flagged={open}
            onChange={onChange}
            onEnter={onEnter}
            onBackspaceEmpty={onRemove}
          />
        </span>

        {onEnhance && value.trim() && (
          <button
            type="button"
            onClick={onEnhance}
            aria-label="Improve this bullet with AI"
            title="Improve with AI"
            className="mt-[3px] flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-brand opacity-0 transition-opacity hover:bg-brand/10 focus-visible:opacity-100 group-hover/bullet:opacity-100 group-focus-within/bullet:opacity-100"
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}

        <button
          type="button"
          onClick={onRemove}
          aria-label="Delete this bullet"
          className="mt-[3px] flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-ink-3 opacity-0 transition-[opacity,color] hover:text-alert focus-visible:opacity-100 group-hover/bullet:opacity-100 group-focus-within/bullet:opacity-100"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>

      {open && (
        <div id={details} className="mb-2.5 ml-5 flex flex-col gap-2 border-l-2 border-caution/40 pl-3">
          <p className="label-mono flex items-center gap-1.5 text-ink-3">
            <Sparkles className="h-3 w-3" aria-hidden="true" />
            {SEVERITY_NAME[rewrite!.severity]} · suggested rewrite
          </p>
          <p className="text-[15px] leading-relaxed text-ink">{rewrite!.suggested}</p>
          <p className="text-[13px] leading-snug text-ink-2">{rewrite!.why}</p>
          <div className="flex flex-wrap items-center gap-2 pb-0.5">
            <button
              type="button"
              onClick={() => {
                onAccept()
                setJustChanged(true)
              }}
              className="inline-flex h-8 shrink-0 whitespace-nowrap items-center gap-1.5 rounded-full bg-brand px-3 text-[13px] font-medium text-sheet transition-[filter,scale] hover:brightness-110 active:scale-[0.97]"
            >
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
              Use this
            </button>
            <button
              type="button"
              onClick={onReject}
              className="inline-flex h-8 shrink-0 whitespace-nowrap items-center gap-1.5 rounded-full bg-fill px-3 text-[13px] font-medium text-ink-2 transition-colors hover:text-ink"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              Keep mine
            </button>
            {onEnhance && (
              <button
                type="button"
                onClick={onEnhance}
                className="inline-flex h-8 shrink-0 whitespace-nowrap items-center gap-1.5 rounded-full px-3 text-[13px] font-medium text-brand transition-colors hover:bg-brand/10"
              >
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                More options
              </button>
            )}
          </div>
        </div>
      )}
    </li>
  )
}

export function BulletList({
  label,
  hint,
  bullets,
  /** The AI's rewrites for this field, by line. */
  rewrites,
  /** Lines whose suggestion has already been taken or turned down. */
  answered,
  onChange,
  onAccept,
  onReject,
  onEnhance,
}: {
  label: string
  hint?: string
  bullets: string[]
  rewrites?: Map<number, BulletRewrite>
  answered?: Set<number>
  onChange: (bullets: string[]) => void
  onAccept?: (rewrite: BulletRewrite) => void
  onReject?: (rewrite: BulletRewrite) => void
  /** Opens three AI options for the line at this index. */
  onEnhance?: (index: number) => void
}) {
  const hintId = useId()
  const waiting = rewrites ? [...rewrites.keys()].filter((line) => !answered?.has(line)).length : 0

  const set = (index: number, value: string) => onChange(bullets.map((bullet, at) => (at === index ? value : bullet)))
  const insertAfter = (index: number) => {
    const next = [...bullets]
    next.splice(index + 1, 0, "")
    onChange(next)
    focusLine(index + 1)
  }
  const remove = (index: number) => {
    // The last empty box stays: a field with nothing in it still needs somewhere to type.
    if (bullets.length === 1) return onChange([""])
    onChange(bullets.filter((_, at) => at !== index))
    focusLine(Math.max(0, index - 1))
  }
  // The new line is in the next paint, not this one.
  const focusLine = (index: number) =>
    requestAnimationFrame(() => {
      const boxes = document.querySelectorAll<HTMLTextAreaElement>(`[data-bullets="${label}"] textarea`)
      boxes[index]?.focus()
    })

  const lines = bullets.length ? bullets : [""]

  return (
    <div data-bullets={label} className="flex min-w-0 flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="label-mono text-ink-2">{label}</span>
        {waiting > 0 && (
          <span className="label-mono flex items-center gap-1.5 text-caution">
            <span aria-hidden="true" className="h-[6px] w-[6px] rounded-full bg-caution" />
            {waiting} {waiting === 1 ? "suggestion" : "suggestions"}
          </span>
        )}
      </div>

      <ul className="flex flex-col border-t border-rule-strong">
        {lines.map((bullet, index) => (
          <Bullet
            key={index}
            value={bullet}
            rewrite={rewrites?.get(index)}
            answered={Boolean(answered?.has(index))}
            onChange={(value) => set(index, value)}
            onEnter={() => insertAfter(index)}
            onRemove={() => remove(index)}
            onAccept={() => {
              const rewrite = rewrites?.get(index)
              if (rewrite) onAccept?.(rewrite)
            }}
            onReject={() => {
              const rewrite = rewrites?.get(index)
              if (rewrite) onReject?.(rewrite)
            }}
            onEnhance={onEnhance ? () => onEnhance(index) : undefined}
          />
        ))}
      </ul>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => insertAfter(lines.length - 1)}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-brand transition-opacity hover:opacity-80"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          Add a bullet
        </button>
        <span id={hintId} className="text-right text-[13px] leading-normal text-ink-3">
          {hint ?? "Enter starts the next one."}
        </span>
      </div>
    </div>
  )
}
