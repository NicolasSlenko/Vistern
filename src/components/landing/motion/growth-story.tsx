"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { motion, useMotionValueEvent, useTransform, type MotionValue } from "framer-motion"
import { ArrowRight, Check } from "lucide-react"
import { GrowthTree } from "@/components/student/growth-tree"
import { useScrub } from "./use-scrub"

const PLAN = [
  { at: 18, label: "Resume reviewed", detail: "6 suggestions, 4 used" },
  { at: 40, label: "Experience verified", detail: "Merged into your master profile" },
  { at: 62, label: "Strengthen your project story", detail: "Add the result your work created" },
  { at: 84, label: "Explore matching roles", detail: "5 saved · 1 interview" },
]

const CHIPS = [
  { label: "Coursework", from: 10, side: -1, top: "16%" },
  { label: "Projects", from: 34, side: 1, top: "30%" },
  { label: "Recruiting", from: 58, side: -1, top: "58%" },
]

function Chip({ progress, chip }: { progress: MotionValue<number>; chip: (typeof CHIPS)[number] }) {
  const at = chip.from / 100
  const opacity = useTransform(progress, [at, at + 0.08], [0, 1])
  const x = useTransform(progress, [at, at + 0.12], [chip.side * -36, 0])
  return (
    <motion.span
      className="public-context-chip lm-growth-chip"
      data-side={chip.side < 0 ? "left" : "right"}
      style={{ opacity, x, top: chip.top }}
    >
      {chip.label}
    </motion.span>
  )
}

/**
 * The semester as the tree on the student's Home grows: scrolling down
 * checks off the plan and the tree grows with it; scrolling up undoes both.
 */
export function GrowthStory() {
  const { ref, progress } = useScrub<HTMLElement>()
  const [grown, setGrown] = useState(0)

  const sync = (value: number) => {
    const next = Math.round(Math.min(1, Math.max(0, (value - 0.04) / 0.86)) * 100)
    setGrown((current) => (current === next ? current : next))
  }
  useMotionValueEvent(progress, "change", sync)
  useEffect(() => sync(progress.get()), [progress])

  const done = PLAN.filter((item) => grown >= item.at).length

  return (
    <section ref={ref} id="student-context" className="lm-pin lm-growth" aria-labelledby="lm-growth-title">
      <div className="lm-pin-sticky">
        <div className="public-container lm-growth-grid">
          <div className="lm-growth-copy">
            <span className="label-mono lm-brand-text">Built for student life</span>
            <h2 id="lm-growth-title">
              Your semester <em>matters.</em>
            </h2>
            <p>
              Courses, projects, campus opportunities, and recruiting seasons all shape your path. Vistern keeps that
              context close, so your next steps make sense for where you are now.
            </p>
            <Link className="lm-text-link" href="/sign-up">
              Start with your experience <ArrowRight size={17} />
            </Link>
          </div>

          <div className="lm-growth-art" aria-hidden="true">
            {CHIPS.map((chip) => (
              <Chip key={chip.label} progress={progress} chip={chip} />
            ))}
            <GrowthTree progress={grown} decorative />
          </div>

          <div className="lm-growth-plan">
            <div className="lm-growth-plan-head">
              <span className="label-mono">Your plan</span>
              <span className="label-mono">
                {done} of {PLAN.length}
              </span>
            </div>
            <ul>
              {PLAN.map((item) => {
                const isDone = grown >= item.at
                return (
                  <li key={item.label} data-done={isDone || undefined}>
                    <span className="lm-check">{isDone && <Check size={13} strokeWidth={3} />}</span>
                    <div>
                      <b>{item.label}</b>
                      <small>{item.detail}</small>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
