"use client"

import type React from "react"
import { useEffect, useLayoutEffect, useRef } from "react"
import type { Resume } from "@/app/api/parse/resumeSchema"
import { entryCounts, SECTION_ICONS, SECTION_ORDER, SECTION_TITLES, skillCount, type SectionRef } from "./sections"

/**
 * The sections, each with its icon: a list down the left column on wide
 * screens, with how many entries each has, and a row of pill tabs on narrower
 * ones. A grey tab slides behind the chosen one.
 *
 * Adapted from resumezip's SectionNav (MIT, © 2025 Ian Hoang), without the
 * drag-to-reorder: the order here comes from the resume schema, not the user.
 */
export function SectionNav({
  resume,
  active,
  onSelect,
  /** How many review notes point into each section, shown as a dot with a count. */
  notesBySection,
}: {
  resume: Resume | null
  active: SectionRef
  onSelect: (section: SectionRef) => void
  notesBySection?: Partial<Record<SectionRef, number>>
}) {
  const navRef = useRef<HTMLElement>(null)
  const tabRef = useRef<HTMLSpanElement>(null)
  // The section the grey tab was last put behind, so choosing another slides it there.
  const tabAt = useRef<SectionRef | null>(null)
  const counts = entryCounts(resume)
  const skills = skillCount(resume)

  const countOf = (section: SectionRef) => (section === "profile" ? 0 : section === "skills" ? skills : counts[section])

  // Keep the chosen tab in view in the row on narrow screens.
  useEffect(() => {
    const nav = navRef.current
    const tab = nav?.querySelector<HTMLElement>("[aria-current]")
    if (!nav || !tab || nav.scrollWidth <= nav.clientWidth) return
    const box = tab.getBoundingClientRect()
    const view = nav.getBoundingClientRect()
    const by = box.left < view.left + 16 ? box.left - view.left - 16 : box.right > view.right - 16 ? box.right - view.right + 16 : 0
    if (by) nav.scrollBy({ left: by, behavior: "smooth" })
  }, [active])

  // The grey tab behind the chosen section slides from the last one. It's put
  // in place without sliding when the list itself changes size, as when the
  // font loads or the window is resized across the wide-screen width.
  useLayoutEffect(() => {
    const nav = navRef.current
    const tab = tabRef.current
    if (!nav || !tab) return
    const place = (slide: boolean) => {
      const chosen = nav.querySelector<HTMLElement>("button[aria-current]")
      if (!chosen) return
      tab.style.transitionDuration = slide ? "" : "0s"
      tab.style.transform = `translate(${chosen.offsetLeft}px, ${chosen.offsetTop}px)`
      tab.style.width = `${chosen.offsetWidth}px`
      tab.style.height = `${chosen.offsetHeight}px`
    }
    place(tabAt.current !== null && tabAt.current !== active)
    tabAt.current = active
    const chosen = nav.querySelector<HTMLElement>("button[aria-current]")
    const sizes = () => `${nav.clientWidth}x${nav.clientHeight} ${chosen?.offsetWidth}x${chosen?.offsetHeight}`
    let size = sizes()
    // The observer also reports the sizes as it starts, which isn't a change.
    const observer = new ResizeObserver(() => {
      if (sizes() !== size) place(false)
      size = sizes()
    })
    observer.observe(nav)
    if (chosen) observer.observe(chosen)
    return () => observer.disconnect()
  }, [active])

  // Arrows move from section to section, opening each as they go: up and down
  // in the list on wide screens, either way along the row on narrow ones.
  const onArrowKey = (event: React.KeyboardEvent) => {
    const target = event.target as HTMLElement
    if (!target.matches("button[data-section-ref]")) return
    const buttons = [...(navRef.current?.querySelectorAll<HTMLButtonElement>("button[data-section-ref]") ?? [])]
    const index = buttons.indexOf(target as HTMLButtonElement)
    const moves: Record<string, number> = {
      ArrowDown: index + 1,
      ArrowRight: index + 1,
      ArrowUp: index - 1,
      ArrowLeft: index - 1,
      Home: 0,
      End: buttons.length - 1,
    }
    const next = buttons[moves[event.key]]
    if (moves[event.key] === undefined || !next) return
    event.preventDefault()
    next.focus()
    next.click()
  }

  return (
    <nav
      ref={navRef}
      onKeyDown={onArrowKey}
      aria-label="Resume sections"
      className="relative isolate flex gap-1 overflow-x-auto px-2 py-2 no-scrollbar @6xl/studio:flex-col @6xl/studio:overflow-visible @6xl/studio:p-0"
    >
      <span
        ref={tabRef}
        aria-hidden="true"
        className="absolute left-0 top-0 -z-10 rounded-full bg-fill transition-[transform,width] duration-300 ease-glide motion-reduce:transition-none @6xl/studio:rounded-[12px]"
      />
      {SECTION_ORDER.map((section) => {
        const isActive = active === section
        const Icon = SECTION_ICONS[section]
        const count = countOf(section)
        const notes = notesBySection?.[section] ?? 0
        return (
          <button
            key={section}
            type="button"
            data-section-ref={section}
            aria-current={isActive || undefined}
            onClick={() => onSelect(section)}
            // Keyboard focus shows as a soft shade rather than a ring, which
            // would box the row in. The chosen one has the grey tab behind it
            // already, so a shade there would draw a second one inside it.
            // In the row on narrow screens each tab is only as wide as its
            // words; down the column it fills the width.
            className={`flex h-9 min-w-0 shrink-0 items-center gap-3 whitespace-nowrap rounded-full px-3.5 text-left text-[15px] tracking-[-0.01em] transition-colors focus-visible:outline-none @6xl/studio:h-10 @6xl/studio:w-full @6xl/studio:shrink @6xl/studio:rounded-[12px] ${
              isActive ? "font-medium text-ink" : "text-ink-2 hover:bg-fill/70 hover:text-ink focus-visible:bg-ink/[0.05] focus-visible:text-ink"
            }`}
          >
            <Icon
              aria-hidden="true"
              className={`h-[18px] w-[18px] shrink-0 transition-colors ${isActive ? "text-brand" : "text-ink-3"}`}
            />
            <span className="min-w-0 truncate">{SECTION_TITLES[section]}</span>
            <span className="ml-auto hidden items-center gap-1.5 @6xl/studio:flex">
              {notes > 0 && (
                <span
                  aria-label={`${notes} review ${notes === 1 ? "note" : "notes"}`}
                  className="inline-flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-caution/15 px-1 text-[11px] font-medium tabular-nums text-caution"
                >
                  {notes}
                </span>
              )}
              {count > 0 && (
                <span aria-hidden="true" className="text-[13px] tabular-nums text-ink-3">
                  {count}
                </span>
              )}
            </span>
          </button>
        )
      })}
      <p className="mt-[19px] hidden px-3 text-[13px] leading-5 text-ink-3 @6xl/studio:block">
        Everything here is your master profile. Uploads stay separate until you accept them.
      </p>
    </nav>
  )
}
