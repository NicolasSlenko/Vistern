"use client"

import { useRef, type RefObject } from "react"
import { useMotionValue, useReducedMotion, useScroll, useSpring, type MotionValue, type UseScrollOptions } from "framer-motion"

/**
 * Scroll progress through a section, 0 → 1, eased by a light spring so the
 * scene glides rather than ticks with each wheel notch. It is scrubbed, not
 * triggered: scroll back up and the scene plays backwards.
 *
 * With reduced motion asked for, progress is pinned at 1 — every scene shows
 * its finished state and nothing moves with the scroll.
 */
export function useScrub<T extends HTMLElement>(
  offset: UseScrollOptions["offset"] = ["start start", "end end"],
): { ref: RefObject<T | null>; progress: MotionValue<number>; reduced: boolean } {
  const ref = useRef<T>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset })
  const smooth = useSpring(scrollYProgress, { stiffness: 140, damping: 30, mass: 0.35, restDelta: 0.0005 })
  const done = useMotionValue(1)
  const reduced = Boolean(useReducedMotion())
  return { ref, progress: reduced ? done : smooth, reduced }
}
