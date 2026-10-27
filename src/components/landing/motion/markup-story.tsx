"use client"

import { useEffect, useRef, useState } from "react"
import { motion, useMotionValueEvent, useTransform, type MotionValue } from "framer-motion"
import { Check, RefreshCw } from "lucide-react"
import { useScrub } from "./use-scrub"

const STEPS = [
  { at: 0, title: "Read", body: "Upload a PDF, DOCX or TXT. Every line lands in the studio, where you can check it and change it." },
  { at: 0.17, title: "Marked up", body: "Weak lines get a pen mark and a note in the margin: what is wrong with it, in plain words." },
  { at: 0.43, title: "Rewritten", body: "Each suggestion keeps your facts and leads with what changed. Tick to use it, cross to skip it." },
  { at: 0.74, title: "Scored", body: "The score moves with what you can change, so every accepted line shows up in it." },
]

const BULLETS = [
  {
    ink: "fix" as const,
    original: "Worked on the data ingestion service with two other interns",
    rewrite: "Rebuilt the data ingestion service with two other interns, cutting nightly load time from 50 to 12 minutes",
    note: "Says you were there, not what changed.",
  },
  {
    ink: "fix" as const,
    original: "Helped migrate reporting jobs off the legacy scheduler",
    rewrite: "Migrated 14 reporting jobs onto Airflow, retiring the last cron box",
    note: "“Helped” hides your share. Name the count.",
  },
  {
    ink: "look" as const,
    original: "Attended daily standups and wrote documentation",
    rewrite: "Wrote the service runbook the team used to onboard two engineers without pairing",
    note: "Attendance isn’t an accomplishment.",
  },
]

const SCORE_FROM = 71
const SCORE_TO = 84

function StoryBullet({ progress, index, bullet }: { progress: MotionValue<number>; index: number; bullet: (typeof BULLETS)[number] }) {
  const markFrom = 0.19 + index * 0.06
  const fixFrom = 0.46 + index * 0.085
  const draw = useTransform(progress, [markFrom, markFrom + 0.1], [100, 0])
  const penClip = useTransform(draw, (value) => `inset(-4px ${value}% -4px 0)`)
  const markOpacity = useTransform(progress, [markFrom, markFrom + 0.02, fixFrom + 0.04, fixFrom + 0.08], [0, 1, 1, 0])
  const noteOpacity = useTransform(progress, [markFrom + 0.04, markFrom + 0.1, fixFrom + 0.04, fixFrom + 0.08], [0, 1, 1, 0])
  const noteX = useTransform(progress, [markFrom + 0.04, markFrom + 0.1], [-14, 0])
  const strike = useTransform(progress, [fixFrom, fixFrom + 0.04], [0, 1])
  const fade = useTransform(progress, [fixFrom + 0.03, fixFrom + 0.08], [1, 0.38])
  const reveal = useTransform(progress, [fixFrom + 0.03, fixFrom + 0.09], [100, 0])
  const clipPath = useTransform(reveal, (value) => `inset(0 ${value}% 0 0)`)
  const tick = useTransform(progress, [fixFrom + 0.07, fixFrom + 0.09], [0, 1])

  return (
    <li className="lm-story-bullet">
      <span className="lm-story-original">
        <motion.span style={{ opacity: fade }}>{bullet.original}</motion.span>
        <motion.i className="lm-story-strike" style={{ scaleX: strike }} />
        <motion.span className="lm-story-pen" style={{ opacity: markOpacity }}>
          <motion.svg className="lm-pen lm-pen-live" data-ink={bullet.ink} viewBox="0 0 200 8" preserveAspectRatio="none" style={{ clipPath: penClip }}>
            <path
              d="M1 5 C 12 1, 18 8, 30 4 S 50 1, 62 5 S 84 8, 96 4 S 118 1, 130 5 S 152 8, 164 4 S 186 1, 199 5"
            />
          </motion.svg>
        </motion.span>
      </span>
      <motion.span className="lm-story-note" data-ink={bullet.ink} style={{ opacity: noteOpacity, x: noteX }}>
        {bullet.note}
      </motion.span>
      <motion.span className="lm-story-rewrite" style={{ clipPath }}>
        <motion.i style={{ scale: tick, opacity: tick }}><Check size={13} strokeWidth={3} /></motion.i>
        {bullet.rewrite}
      </motion.span>
    </li>
  )
}

/**
 * How the studio reads a resume, as one entry seen close up. The section is
 * tall and its scene is pinned: the page scrolls, the scene plays — read,
 * marked, rewritten, scored — and plays back in reverse on the way up.
 */
export function MarkupStory() {
  const { ref, progress } = useScrub<HTMLElement>()
  const [step, setStep] = useState(0)
  const score = useRef<HTMLSpanElement>(null)

  const sync = (value: number) => {
    let next = 0
    STEPS.forEach((item, index) => {
      if (value >= item.at) next = index
    })
    setStep((current) => (current === next ? current : next))
    if (score.current) {
      const t = Math.min(1, Math.max(0, (value - 0.76) / 0.18))
      score.current.textContent = String(Math.round(SCORE_FROM + (SCORE_TO - SCORE_FROM) * t))
    }
  }
  useMotionValueEvent(progress, "change", sync)
  useEffect(() => sync(progress.get()), [progress])

  const scanY = useTransform(progress, [0.01, 0.16], ["0%", "100%"])
  const scanOpacity = useTransform(progress, [0, 0.02, 0.14, 0.17], [0, 1, 1, 0])
  const meter = useTransform(progress, [0.76, 0.94], [SCORE_FROM, SCORE_TO])
  const meterWidth = useTransform(meter, (value) => `${value}%`)
  const synced = useTransform(progress, [0.93, 0.98], [0, 1])
  const rail = useTransform(progress, [0, 1], [0, 1])

  return (
    <section ref={ref} id="how-it-works" className="lm-pin lm-story" aria-labelledby="lm-story-title">
      <div className="lm-pin-sticky">
        <div className="public-container lm-story-grid">
          <div className="lm-story-copy">
            <span className="label-mono lm-brand-text">How Vistern works</span>
            <h2 id="lm-story-title">
              Your resume, read <em>line by line.</em>
            </h2>
            <ol className="lm-steps">
              <motion.i className="lm-steps-rail" style={{ scaleY: rail }} aria-hidden="true" />
              {STEPS.map((item, index) => (
                <li key={item.title} data-state={index < step ? "done" : index === step ? "current" : undefined}>
                  <span className="label-mono">0{index + 1}</span>
                  <div>
                    <b>{item.title}</b>
                    <p>{item.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="lm-story-paper" aria-label="Example: three lines of a sample resume being marked and rewritten">
            <motion.i className="lm-story-scan" style={{ top: scanY, opacity: scanOpacity }} aria-hidden="true" />
            <div className="lm-story-head">
              <span className="label-mono">Sample resume · Alex Rivera</span>
              <span className="label-mono">Experience 1 of 2</span>
            </div>
            <h3>Software Engineering Intern</h3>
            <p className="lm-story-meta">
              <i>Sabal Analytics</i> · Tampa, FL · May – Aug 2025
            </p>
            <ul className="lm-story-list">
              {BULLETS.map((bullet, index) => (
                <StoryBullet key={bullet.original} progress={progress} index={index} bullet={bullet} />
              ))}
              <li className="lm-story-bullet lm-story-keep">
                <span className="lm-story-original">Shipped the ingestion rewrite a sprint early</span>
              </li>
            </ul>
            <div className="lm-story-score">
              <div>
                <span className="label-mono">Resume score</span>
                <b>
                  <span ref={score}>{SCORE_FROM}</span>
                  <small>/ 100</small>
                </b>
              </div>
              <div className="lm-meter">
                <motion.i style={{ width: meterWidth }} />
              </div>
              <motion.span className="lm-synced" style={{ opacity: synced }}>
                <RefreshCw size={13} /> Synced to profile
              </motion.span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
