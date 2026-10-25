// The studio's buttons. Each look comes without a size, which `pill` adds, so
// one button's size never has to beat another's: Tailwind orders utilities
// that set the same thing by value, not by the order they're written in, so
// `px-4` after `px-5` would lose.
//
// Adapted from resumezip (MIT, © 2025 Ian Hoang).

const LOOKS = {
  /** The main action: a green pill in a halo of its own colour. */
  brand: "brand-button disabled:opacity-50",
  /** Any other button standing on the sheet: a white pill. */
  white: "white-button disabled:opacity-50",
  /** Only its words, as Cancel beside Save: grey, shaded under the pointer. */
  text: "text-ink-2 transition-colors duration-150 hover:bg-fill hover:text-ink disabled:opacity-50 disabled:hover:bg-transparent",
  /** For a choice that deletes something. */
  danger: "bg-alert text-white transition-colors duration-150 hover:brightness-110",
}

/** A button in one of the studio's looks, at a size: 40px tall with 15px words unless told otherwise. */
export function pill(look: keyof typeof LOOKS, size = "h-10 px-5 text-[15px] font-medium") {
  return `inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full tracking-[-0.01em] disabled:cursor-not-allowed [&_svg]:size-4 ${size} ${LOOKS[look]}`
}

export const BRAND_PILL = pill("brand")
export const WHITE_PILL = pill("white")
export const TEXT_PILL = pill("text")
export const SMALL_WHITE_PILL = pill("white", "h-9 px-4 text-[14px] font-medium")

/**
 * A grey track of choices, 46px tall, with the chosen one on a white pill
 * (use-thumb) 5px in from its edge. SEGMENT is each choice, with its own
 * padding across.
 */
export const SEGMENTS = "segment-track h-[46px] max-w-full gap-0.5 p-[5px]"
export const SEGMENT =
  "relative inline-flex h-9 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full text-[15px] font-medium tracking-[-0.01em] transition-colors duration-150 focus-visible:outline-none [&_svg]:size-4"
