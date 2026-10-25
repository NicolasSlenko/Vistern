import type { Resume } from "@/app/api/parse/resumeSchema"

/**
 * How much of a resume describes results rather than duties.
 *
 * This is the one axis that separates "Worked on the data ingestion service"
 * from "Cut nightly load time from 50 to 12 minutes", and it is the thing a
 * student can actually act on — unlike a GPA, which is fixed, or a list of
 * coursework, which is the easiest line on a resume to pad.
 *
 * It is measured, not asked of a model: a bullet scores on whether it opens
 * with a strong verb, carries a number, and names an outcome. Deterministic
 * means the score does not drift between runs, and a student who rewrites a
 * line can watch it move.
 */

/** Verbs that describe building or changing something, rather than being present for it. */
const STRONG_VERBS = new Set([
  "architected", "automated", "built", "created", "cut", "delivered", "deployed", "designed", "developed",
  "doubled", "drove", "eliminated", "engineered", "expanded", "generated", "grew", "implemented", "improved",
  "increased", "introduced", "launched", "led", "migrated", "optimised", "optimized", "rebuilt", "reduced",
  "refactored", "resolved", "saved", "scaled", "shipped", "simplified", "streamlined", "tripled", "wrote",
])

/** Openings that describe presence or intention rather than a result. */
const WEAK_OPENINGS = [
  "worked on", "helped", "assisted", "responsible for", "participated", "involved in", "contributed to",
  "attended", "tasked with", "duties included", "familiar with", "exposure to", "learned",
]

/** A number that means something: a quantity, a percentage, a money figure, a multiple. */
const HAS_NUMBER = /(\d+(\.\d+)?\s?(%|x\b|k\b|m\b|bn\b)|[$£€]\s?\d|\b\d{2,}\b|\b\d+(\.\d+)?\s*(users|people|students|hours|minutes|seconds|days|weeks|months|records|rows|requests|queries|tests|points|times)\b)/i

/** Words that name a consequence, which is what turns an action into a result. */
const OUTCOME_WORDS =
  /\b(cut|reduc\w+|increas\w+|improv\w+|sav\w+|grew|grow\w*|rais\w+|boost\w+|accelerat\w+|elimina\w+|enabl\w+|unlock\w+|won|ranked|adopted|shipped|launched|resulting|leading to|so that)\b/i

export interface BulletImpact {
  text: string
  /** Opens with a verb that describes doing something. */
  strongVerb: boolean
  /** Carries a figure worth reading. */
  quantified: boolean
  /** Names what came of it. */
  outcome: boolean
  /** Opens with a phrase that hides the student's part in it. */
  weakOpening: boolean
  /** 0–100 for this line alone. */
  score: number
}

/** Reads one bullet. */
export function readBullet(text: string): BulletImpact {
  const trimmed = text.trim()
  const lower = trimmed.toLowerCase()
  const first = lower.split(/[^a-z]+/).filter(Boolean)[0] ?? ""

  const strongVerb = STRONG_VERBS.has(first)
  const weakOpening = WEAK_OPENINGS.some((phrase) => lower.startsWith(phrase))
  const quantified = HAS_NUMBER.test(trimmed)
  const outcome = OUTCOME_WORDS.test(trimmed)

  // A number is the strongest single signal, so it carries the most; a weak
  // opening is penalised rather than merely unrewarded, because it actively
  // costs a line that could have said something.
  let score = 0
  if (strongVerb) score += 30
  if (quantified) score += 40
  if (outcome) score += 30
  if (weakOpening) score -= 25
  // A line too short to say anything cannot have said anything.
  if (trimmed.split(/\s+/).length < 5) score = Math.min(score, 25)

  return { text: trimmed, strongVerb, quantified, outcome, weakOpening, score: Math.max(0, Math.min(100, score)) }
}

export interface ImpactAnalysis {
  /** 0–100 across every bullet on the resume. */
  score: number
  /** How many bullets were read. */
  total: number
  quantified: number
  strongVerbs: number
  weak: number
  /** The weakest lines, worst first, for the review to point at. */
  weakest: BulletImpact[]
}

/** Every bullet on the resume, wherever it lives. */
export function allBullets(resume: Resume): string[] {
  const lines: string[] = []
  for (const role of resume.experience ?? []) {
    lines.push(...(role.responsibilities ?? []), ...(role.achievements ?? []))
  }
  for (const project of resume.projects ?? []) lines.push(...(project.highlights ?? []))
  return lines.map((line) => (typeof line === "string" ? line.trim() : "")).filter((line) => line.length > 0)
}

export function analyzeImpact(resume: Resume): ImpactAnalysis {
  const bullets = allBullets(resume).map(readBullet)
  if (!bullets.length) {
    return { score: 0, total: 0, quantified: 0, strongVerbs: 0, weak: 0, weakest: [] }
  }

  const mean = bullets.reduce((sum, bullet) => sum + bullet.score, 0) / bullets.length
  return {
    score: Math.round(mean),
    total: bullets.length,
    quantified: bullets.filter((bullet) => bullet.quantified).length,
    strongVerbs: bullets.filter((bullet) => bullet.strongVerb).length,
    weak: bullets.filter((bullet) => bullet.score < 40).length,
    weakest: [...bullets].sort((a, b) => a.score - b.score).slice(0, 5),
  }
}
