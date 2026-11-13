"use client"

import { useCallback, useEffect, useRef, useState, type RefObject } from "react"
import { PAGE, PAGE_PADDING } from "./resume-paper"

/**
 * Where the page turns.
 *
 * The paper is one long article; a resume that runs past a sheet would just
 * carry on. This reads where each block (the header, a heading, an entry)
 * actually sits, and when one would cross the foot of a sheet, pushes it down
 * to the head of the next. A heading is kept with the entry under it, so a
 * sheet never ends on a title.
 *
 * The push is padding on the block, and the block's natural position is
 * recovered by taking the padding back off — so measuring after a push gives
 * the same answer, and the layout settles rather than drifting.
 */

export interface PageBreaks {
  /** Extra space above a block, by its `data-block` id, in page units. */
  extra: Record<string, number>
  pages: number
}

const NONE: PageBreaks = { extra: {}, pages: 1 }

export function usePageBreaks(paper: RefObject<HTMLElement | null>, deps: unknown): PageBreaks {
  const [breaks, setBreaks] = useState<PageBreaks>(NONE)
  const last = useRef("")

  const measure = useCallback(() => {
    const root = paper.current?.querySelector<HTMLElement>("[data-resume-paper]")
    if (!root) return
    const origin = root.getBoundingClientRect()
    if (!origin.width) return
    const scale = origin.width / PAGE.width

    const blocks = [...root.querySelectorAll<HTMLElement>("[data-block]")]
    // Natural position of each block: what's measured, less the pushes before it.
    let pushed = 0
    const natural = blocks.map((block) => {
      const rect = block.getBoundingClientRect()
      const applied = parseFloat(block.style.paddingTop) || 0
      const top = (rect.top - origin.top) / scale - pushed
      const height = rect.height / scale - applied
      pushed += applied
      return { id: block.dataset.block!, keepWithNext: block.dataset.keepNext !== undefined, top, height }
    })

    const extra: Record<string, number> = {}
    let page = 0
    let shift = 0
    let firstOnPage = 0
    for (let i = 0; i < natural.length; i++) {
      const block = natural[i]
      const top = block.top + shift
      const foot = (page + 1) * PAGE.height - PAGE_PADDING.y
      if (top + block.height <= foot || i === firstOnPage) continue

      // Break before this block — or before the heading above it, if that
      // heading would otherwise be left alone at the foot of the sheet.
      const previous = natural[i - 1]
      const at = previous?.keepWithNext && i - 1 > firstOnPage ? i - 1 : i
      const head = (page + 1) * PAGE.height + PAGE_PADDING.y
      const push = head - (natural[at].top + shift)
      extra[natural[at].id] = push
      shift += push
      page += 1
      firstOnPage = at
    }

    const next = { extra, pages: page + 1 }
    const print = JSON.stringify(next)
    if (print === last.current) return
    last.current = print
    setBreaks(next)
  }, [paper])

  useEffect(() => {
    let frame = requestAnimationFrame(measure)
    const onFonts = () => measure()
    document.fonts?.ready.then(onFonts).catch(() => {})
    const root = paper.current
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(measure)
    })
    if (root) {
      observer.observe(root)
      for (const child of root.querySelectorAll("[data-block]")) observer.observe(child)
    }
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
    // `deps` is the resume: a new one has new blocks to watch.
  }, [measure, paper, deps])

  return breaks
}
