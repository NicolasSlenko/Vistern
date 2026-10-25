import type { Resume } from "@/app/api/parse/resumeSchema"
import type { ListSection, SectionRef } from "./sections"

/**
 * Everything the AI has to say about a resume, flattened into one list the
 * review panel can show and point into.
 *
 * Two things feed it. The XYZ pass (api/analyze/xyz-batch) scores each
 * project and role out of 100 and suggests rewrites for it, so those notes
 * can point at the very card they're about. The actionable insights from the
 * same pass are about the resume as a whole; the ones marked `goal` aren't
 * edits at all but things to go and do, so they're kept apart.
 */

/** How serious a note is, borrowed from resumezip's three tiers. */
export type Tier = "fix" | "look" | "optional"

export const TIER_NAMES: Record<Tier, { one: string; many: string }> = {
  fix: { one: "Must fix", many: "Must fix" },
  look: { one: "Worth a look", many: "Worth a look" },
  optional: { one: "Nice to have", many: "Nice to have" },
}

/** Each tier's colour, as the dot beside a note. */
export const TIER_DOT: Record<Tier, string> = { fix: "bg-alert", look: "bg-caution", optional: "bg-brand" }

export const TIERS: Tier[] = ["fix", "look", "optional"]

export interface ReviewNote {
  id: string
  tier: Tier
  /** The note itself: what to change. */
  text: string
  /** Why, when the AI said: the XYZ reading of the entry it's about. */
  why?: string
  /** Where it points, so choosing it opens that section. */
  section?: SectionRef
  /** Which card in that section, when the note is about one entry. */
  entryIndex?: number
  /** That entry's name, shown as the note's eyebrow. */
  entryName?: string
}

export interface CareerGoal {
  id: string
  text: string
  tier: Tier
  targetYear: number | null
  category: string
}

interface XyzEntry {
  score: number
  xyz_analysis: string
  improvements: string[]
}

export interface XyzFeedback {
  projects?: Record<number | string, XyzEntry>
  experience?: Record<number | string, XyzEntry>
  actionableInsights?: {
    id: string
    category: string
    insight: string
    priority: "high" | "medium" | "low"
    checked?: boolean
    type?: "tweak" | "goal"
    targetYear?: number | null
  }[]
}

const PRIORITY_TIER: Record<"high" | "medium" | "low", Tier> = { high: "fix", medium: "look", low: "optional" }

/** Which section of the form an insight's category belongs to. */
const CATEGORY_SECTION: Record<string, SectionRef | undefined> = {
  projects: "projects",
  experience: "experience",
  skills: "skills",
  gpa: "education",
  coursework: "education",
  links: "profile",
  formatting: undefined,
}

/** A per-entry score becomes a tier: a weak entry is worth fixing, a strong one is only worth a look. */
const scoreTier = (score: number): Tier => (score < 60 ? "fix" : score < 80 ? "look" : "optional")

function entryNotes(
  section: Extract<ListSection, "projects" | "experience">,
  feedback: Record<number | string, XyzEntry> | undefined,
  names: string[],
): ReviewNote[] {
  if (!feedback) return []
  return Object.entries(feedback).flatMap(([key, entry]) => {
    const index = Number(key)
    if (!Number.isInteger(index) || !entry || !Array.isArray(entry.improvements)) return []
    const tier = scoreTier(Number(entry.score) || 0)
    return entry.improvements.map((improvement, at) => ({
      id: `${section}-${index}-${at}`,
      tier,
      text: improvement,
      why: entry.xyz_analysis,
      section,
      entryIndex: index,
      entryName: names[index] || `Entry ${index + 1}`,
    }))
  })
}

/** Every note the AI has about this resume, must-fix first. */
export function reviewNotes(resume: Resume | null, feedback: XyzFeedback | null): ReviewNote[] {
  if (!feedback) return []
  const notes = [
    ...entryNotes("experience", feedback.experience, (resume?.experience ?? []).map((item) => item.company || item.position)),
    ...entryNotes("projects", feedback.projects, (resume?.projects ?? []).map((item) => item.name)),
    ...(feedback.actionableInsights ?? [])
      .filter((insight) => insight.type !== "goal")
      .map((insight) => ({
        id: insight.id,
        tier: PRIORITY_TIER[insight.priority] ?? "look",
        text: insight.insight,
        section: CATEGORY_SECTION[insight.category],
      })),
  ]
  return notes.sort((a, b) => TIERS.indexOf(a.tier) - TIERS.indexOf(b.tier))
}

/** The insights that aren't edits but things to go and do, by academic year. */
export function careerGoals(feedback: XyzFeedback | null): CareerGoal[] {
  return (feedback?.actionableInsights ?? [])
    .filter((insight) => insight.type === "goal")
    .map((insight) => ({
      id: insight.id,
      text: insight.insight,
      tier: PRIORITY_TIER[insight.priority] ?? "look",
      targetYear: insight.targetYear ?? null,
      category: insight.category,
    }))
    .sort((a, b) => (a.targetYear ?? 9) - (b.targetYear ?? 9))
}

/** How many notes point into each section, for the counts in the left bar. */
export function notesBySection(notes: ReviewNote[]): Partial<Record<SectionRef, number>> {
  const counts: Partial<Record<SectionRef, number>> = {}
  for (const note of notes) {
    if (!note.section) continue
    counts[note.section] = (counts[note.section] ?? 0) + 1
  }
  return counts
}

/** Which cards in a section a note points at, so they can carry a dot. */
export function flaggedEntries(notes: ReviewNote[], section: SectionRef): number[] {
  return [...new Set(notes.filter((note) => note.section === section && note.entryIndex !== undefined).map((note) => note.entryIndex!))]
}

export const YEAR_NAMES: Record<number, string> = { 1: "Freshman year", 2: "Sophomore year", 3: "Junior year", 4: "Senior year" }
