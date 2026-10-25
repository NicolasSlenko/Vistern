"use client"

import type React from "react"
import { useRef } from "react"
import type { LucideIcon } from "lucide-react"
import { SEGMENT, SEGMENTS } from "./pills"
import { useThumb } from "./use-thumb"

/** One choice on the switch. Each studio names its own. */
export interface ModeOption<Id extends string> {
  id: Id
  label: string
  icon: LucideIcon
  /** A count shown after the label, as how many suggestions are waiting. */
  badge?: number
}

export const modeTabId = (mode: string) => `studio-mode-${mode}`
export const MODE_PANEL_ID = "studio-mode-panel"

/**
 * The switch at the top of the studio: a grey track with the chosen one on a
 * white pill. On wide screens it sits in the middle of the top bar;
 * narrower, at the top of the left bar, where its tabs share the width.
 *
 * Adapted from resumezip's editor tabs (MIT, © 2025 Ian Hoang).
 */
export function ModeTabs<Id extends string>({
  modes,
  mode,
  onChoose,
  stretch = false,
  label = "Choose a panel",
}: {
  modes: ModeOption<Id>[]
  mode: Id
  onChoose: (mode: Id) => void
  stretch?: boolean
  label?: string
}) {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const thumb = useThumb(mode, modes.map((option) => `${option.id}${option.badge ?? ""}`).join())
  const MODES = modes

  // Arrow keys, Home and End move between the tabs, opening each as they go
  // (the WAI-ARIA tabs pattern).
  const onKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = MODES.length - 1
    const targets: Record<string, number> = {
      ArrowLeft: index === 0 ? last : index - 1,
      ArrowRight: index === last ? 0 : index + 1,
      Home: 0,
      End: last,
    }
    const next = targets[event.key]
    if (next === undefined) return
    event.preventDefault()
    onChoose(MODES[next].id)
    tabRefs.current[next]?.focus()
  }

  return (
    <div
      ref={thumb.group}
      role="tablist"
      aria-label={label}
      className={`${SEGMENTS} ${stretch ? "flex w-full sm:inline-flex sm:w-auto" : ""}`}
    >
      <span ref={thumb.thumb} aria-hidden="true" className={`segment-thumb ${thumb.placed ? "" : "invisible"}`} />
      {MODES.map((option, index) => {
        const selected = option.id === mode
        const Icon = option.icon
        return (
          <button
            key={option.id}
            ref={(element) => {
              tabRefs.current[index] = element
            }}
            type="button"
            role="tab"
            id={modeTabId(option.id)}
            aria-selected={selected}
            aria-controls={MODE_PANEL_ID}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChoose(option.id)}
            onKeyDown={(event) => onKeyDown(event, index)}
            // No focus tint: the arrows choose as they move, so the white pill
            // already shows where focus is. Until it's placed, the chosen tab
            // draws its own.
            className={`${SEGMENT} px-4 ${stretch ? "min-w-0 flex-1 max-sm:px-2 sm:flex-none" : ""} ${
              selected ? "text-ink" : "text-ink-3 hover:text-ink"
            } ${selected && !thumb.placed ? "bg-sheet shadow-[0_1px_3px_rgb(17_24_20/0.14)]" : ""}`}
          >
            <Icon aria-hidden="true" />
            {option.label}
            {option.badge ? (
              <span
                aria-label={`${option.badge} waiting`}
                className="inline-flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-caution/20 px-1 text-[11px] font-medium tabular-nums text-caution"
              >
                {option.badge}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
