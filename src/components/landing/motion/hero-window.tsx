"use client"

import { motion, useTransform } from "framer-motion"
import { ScaledStage } from "./scaled-stage"
import { StudioScreen, STUDIO_H, STUDIO_W } from "./screens"
import { useScrub } from "./use-scrub"

/**
 * The resume studio, tipped back on the sky below the headline. Scrolling
 * stands it upright and brings it to full size; scrolling back lays it down
 * again. Two margin notes slide out from behind it once it faces you.
 */
export function HeroWindow() {
  const { ref, progress } = useScrub<HTMLDivElement>(["start 0.95", "start 0.12"])

  const rotateX = useTransform(progress, [0, 1], [26, 0])
  const scale = useTransform(progress, [0, 1], [0.84, 1])
  const y = useTransform(progress, [0, 1], [40, 0])
  const shade = useTransform(progress, [0, 1], [0.32, 0])
  const noteOpacity = useTransform(progress, [0.55, 0.95], [0, 1])
  const noteLeft = useTransform(progress, [0.55, 1], [60, 0])
  const noteRight = useTransform(progress, [0.55, 1], [-60, 0])

  return (
    <div ref={ref} className="lm-hero-stage">
      <motion.div className="lm-hero-tilt" style={{ rotateX, scale, y }}>
        <ScaledStage width={STUDIO_W} height={STUDIO_H} className="lm-hero-window">
          <StudioScreen />
        </ScaledStage>
        <motion.div className="lm-hero-shade" style={{ opacity: shade }} aria-hidden="true" />
      </motion.div>

      <motion.div className="lm-hero-note lm-hero-note-left" style={{ opacity: noteOpacity, x: noteLeft }} aria-hidden="true">
        <span className="lm-dot" data-ink="fix" />
        <div>
          <b>3 lines to fix</b>
          <small>“Worked on” says you were present, not what changed.</small>
        </div>
      </motion.div>
      <motion.div className="lm-hero-note lm-hero-note-right" style={{ opacity: noteOpacity, x: noteRight }} aria-hidden="true">
        <span className="label-mono">Resume score</span>
        <b>
          71 <span>→</span> 84
        </b>
      </motion.div>
    </div>
  )
}
