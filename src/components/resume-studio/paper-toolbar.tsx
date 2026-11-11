/**
 * The small bar over the page in Review and Suggestions: how many marks are
 * on it, and the button that asks the AI for them. It used to be the top of
 * a side panel; with the marks on the page, it sits with them.
 */

const BASE = "inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-[13px] font-medium transition-colors disabled:opacity-60"

export const TOOLBAR_BRAND = `${BASE} bg-brand text-sheet transition-[filter] hover:brightness-110`
export const TOOLBAR_QUIET = `${BASE} text-ink-2 hover:text-ink`

export function MarksCount({ count, one, many, empty }: { count: number; one: string; many: string; empty: string }) {
  return (
    <span className="whitespace-nowrap px-2.5 text-[13px] tabular-nums text-ink-2" aria-live="polite">
      {count === 0 ? empty : `${count} ${count === 1 ? one : many} on the page`}
    </span>
  )
}
