/**
 * Brings the form to one entry, or one bullet in it, after the section it
 * lives in has been opened.
 *
 * The section's form mounts on the next render and a collapsed card only
 * draws its fields once expanded, so the target isn't there to find yet.
 * This looks again on each frame, for about half a second, rather than
 * guessing how many frames that takes.
 */
export function revealInForm(
  form: HTMLElement | null,
  { entryIndex, field, line }: { entryIndex?: number; field?: string; line?: number },
) {
  if (entryIndex === undefined) return
  let tries = 0
  let expanded = false

  const look = () => {
    const root = form ?? document
    const card = root.querySelector<HTMLElement>(`[data-entry-index="${entryIndex}"]`)
    if (card && !expanded) {
      const toggle = card.querySelector<HTMLButtonElement>("button[aria-expanded]")
      // Only ever opens a card: clicking one that's already open would shut it.
      if (toggle?.getAttribute("aria-expanded") === "false") toggle.click()
      expanded = true
    }

    const bullet =
      card && field !== undefined && line !== undefined
        ? card.querySelector<HTMLElement>(`[data-field="${CSS.escape(field)}"] [data-line="${line}"]`)
        : null
    const target = bullet ?? (field === undefined ? card : null)

    if (target) {
      target.scrollIntoView({ block: "center", behavior: "smooth" })
      if (bullet) flash(bullet)
      return
    }
    if (++tries < 30) requestAnimationFrame(look)
    // Out of tries: settle for the card, if there is one.
    else card?.scrollIntoView({ block: "center", behavior: "smooth" })
  }
  requestAnimationFrame(look)
}

/** A brief ring round the line, so the eye lands on it after the scroll. */
function flash(element: HTMLElement) {
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return
  element.animate?.(
    [
      { boxShadow: "0 0 0 2px color-mix(in oklab, var(--color-caution) 70%, transparent)" },
      { boxShadow: "0 0 0 2px transparent" },
    ],
    { duration: 1400, easing: "ease-out", delay: 250 },
  )
}
