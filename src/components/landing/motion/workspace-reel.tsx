"use client"

import { useLayoutEffect, useRef, useState, type ReactNode } from "react"
import { motion, useTransform, type MotionValue } from "framer-motion"
import { ScaledStage } from "./scaled-stage"
import { CareerScreen, HomeScreen, JobsScreen, ProfileScreen, StudioScreen, STUDIO_H, STUDIO_W } from "./screens"
import { useScrub } from "./use-scrub"

const SCREENS: { title: string; body: string; screen: ReactNode }[] = [
  { title: "Home", body: "The next thing worth doing, and how far this semester has come.", screen: <HomeScreen /> },
  { title: "Career", body: "Pick a track and get stages and project ideas to work through.", screen: <CareerScreen /> },
  { title: "Resume studio", body: "One resume per kind of role, each with its own rewrites.", screen: <StudioScreen /> },
  { title: "Master profile", body: "One record of everything you have done, merged across uploads.", screen: <ProfileScreen /> },
  { title: "Jobs", body: "Saved roles and where each application stands.", screen: <JobsScreen /> },
]

function ReelCard({
  progress,
  index,
  count,
  reduced,
  children,
}: {
  progress: MotionValue<number>
  index: number
  count: number
  reduced: boolean
  children: ReactNode
}) {
  const center = index / (count - 1)
  const reach = 1 / (count - 1)
  const scale = useTransform(progress, [center - reach, center, center + reach], [0.9, 1, 0.9])
  const opacity = useTransform(progress, [center - reach * 1.2, center, center + reach * 1.2], [0.45, 1, 0.45])
  return (
    <motion.figure className="lm-reel-card" style={reduced ? undefined : { scale, opacity }}>
      {children}
    </motion.figure>
  )
}

/**
 * Every part of the workspace in one pass. Scrolling down slides the row of
 * screens sideways under a pinned frame; scrolling up slides it back.
 */
export function WorkspaceReel() {
  const { ref, progress, reduced } = useScrub<HTMLElement>()
  const track = useRef<HTMLDivElement>(null)
  const [distance, setDistance] = useState(0)

  useLayoutEffect(() => {
    const element = track.current
    if (!element) return
    const measure = () => setDistance(Math.max(0, element.scrollWidth - element.clientWidth))
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const x = useTransform(progress, (value) => (reduced ? 0 : -value * distance))

  return (
    <section ref={ref} className="lm-pin lm-reel" aria-labelledby="lm-reel-title">
      <div className="lm-pin-sticky">
        <div className="public-container lm-reel-head">
          <span className="label-mono lm-brand-text">One workspace</span>
          <h2 id="lm-reel-title">
            From where you are to <em>what&apos;s next.</em>
          </h2>
          <p>A place to understand your progress and keep moving, one decision at a time.</p>
        </div>
        <div ref={track} className="lm-reel-track" data-reduced={reduced || undefined}>
          <motion.div className="lm-reel-row" style={{ x }}>
            {SCREENS.map((item, index) => (
              <ReelCard key={item.title} progress={progress} index={index} count={SCREENS.length} reduced={reduced}>
                <ScaledStage width={STUDIO_W} height={STUDIO_H} className="lm-reel-stage">
                  {item.screen}
                </ScaledStage>
                <figcaption>
                  <span className="label-mono">0{index + 1}</span>
                  <b>{item.title}</b>
                  <span>{item.body}</span>
                </figcaption>
              </ReelCard>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  )
}
