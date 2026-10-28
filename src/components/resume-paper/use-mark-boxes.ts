"use client"

import { useCallback, useEffect, useRef, useState, type RefObject } from "react"
import type { Box } from "./rough"
import { PAGE } from "./resume-paper"

/**
 * Where each marked line actually sits on the page.
 *
 * The paper is HTML, so a bullet's rectangle can simply be read off the DOM
 * rather than inferred from a rendered PDF. A bullet that wraps gets one box
 * per visual line — `Range.getClientRects()` returns a rectangle per line box,
 * which is what lets an underline follow wrapped text instead of drawing one
 * long line through the middle of a paragraph.
 *
 * Boxes come back in the paper's own coordinate space (PAGE.width across), so
 * the mark layer can be an SVG with a fixed viewBox and the whole thing scales
 * with the zoom without re-measuring anything.
 */

export type MarkBoxes = Map<string, Box[]>

/** The rectangles of one marked element, one per visual line of its text. */
function boxesOf(element: HTMLElement, origin: DOMRect, scale: number): Box[] {
  // The span inside excludes the bullet glyph and its indent, so a line is
  // drawn under the words rather than out into the margin.
  const target = element.querySelector<HTMLElement>("[data-mark-text]") ?? element
  const range = document.createRange()
  range.selectNodeContents(target)
  const rects = [...range.getClientRects()].filter((rect) => rect.width > 1 && rect.height > 1)
  range.detach()

  const source = rects.length ? rects : [target.getBoundingClientRect()]
  return source.map((rect) => [
    (rect.left - origin.left) / scale,
    (rect.top - origin.top) / scale,
    (rect.right - origin.left) / scale,
    (rect.bottom - origin.top) / scale,
  ])
}

export interface Measured {
  boxes: MarkBoxes
  /**
   * How tall the page actually is, in its own units. A resume that runs past
   * one nominal page is taller than PAGE.height, and the mark layer's viewBox
   * has to match it exactly or every mark drifts — further the lower it sits.
   */
  height: number
}

export function useMarkBoxes(paper: RefObject<HTMLElement | null>, keys: readonly string[]): Measured {
  const [measured, setMeasured] = useState<Measured>({ boxes: new Map(), height: PAGE.height })
  // Measuring writes state, which re-renders, which could measure again. The
  // last result is kept so an unchanged measurement stops the loop.
  const last = useRef("")

  const measure = useCallback(() => {
    const root = paper.current
    if (!root) return
    const origin = root.getBoundingClientRect()
    if (!origin.width) return
    // The paper may be zoomed with a CSS transform; everything is reported in
    // screen pixels, so divide back out to the page's own units.
    const scale = origin.width / PAGE.width

    const next: MarkBoxes = new Map()
    for (const key of keys) {
      const element = root.querySelector<HTMLElement>(`[data-mark="${CSS.escape(key)}"]`)
      if (element) next.set(key, boxesOf(element, origin, scale))
    }

    const height = origin.height / scale
    const print = JSON.stringify([Math.round(height), [...next].map(([key, value]) => [key, value.map((box) => box.map(Math.round))])])
    if (print === last.current) return
    last.current = print
    setMeasured({ boxes: next, height })
  }, [paper, keys])

  useEffect(() => {
    // Fonts land after first paint and shift every line; measuring before they
    // do would put every mark a few pixels out.
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
      // Reflow inside the paper moves lines without changing the paper's own
      // size, so the children are watched too.
      for (const child of root.children) observer.observe(child)
    }
    window.addEventListener("resize", measure)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      window.removeEventListener("resize", measure)
    }
  }, [measure, paper])

  return measured
}
