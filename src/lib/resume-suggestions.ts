import type { Resume } from "@/app/api/parse/resumeSchema"

/**
 * Line-level rewrites: the AI's suggested replacement for one bullet, which
 * the student accepts with a tick or turns down with a cross.
 *
 * A rewrite points at a bullet by section, entry and line. The line can move
 * between the AI reading the resume and the student answering, so `original`
 * is kept too and matched against the text that's actually there — a rewrite
 * whose line no longer says what the AI read is dropped rather than applied
 * to the wrong words.
 */

export type BulletSection = "experience" | "projects"

/** Which array of strings on the entry the bullet lives in. */
export type BulletField = "responsibilities" | "achievements" | "highlights"

export type Severity = "fix" | "look" | "optional"

export interface BulletRewrite {
  id: string
  section: BulletSection
  entryIndex: number
  field: BulletField
  bulletIndex: number
  /** The bullet as the AI read it. */
  original: string
  /** What to put there instead. */
  suggested: string
  /** One sentence on why, shown under the rewrite. */
  why: string
  severity: Severity
}

export interface BulletReview {
  rewrites: BulletRewrite[]
  generatedAt: string
}

/** Which fields hold bullets, per section. */
export const BULLET_FIELDS: Record<BulletSection, BulletField[]> = {
  experience: ["responsibilities", "achievements"],
  projects: ["highlights"],
}

/** The key a rewrite is filed under while the UI tracks what's been answered. */
export const rewriteKey = (rewrite: Pick<BulletRewrite, "section" | "entryIndex" | "field" | "bulletIndex">) =>
  `${rewrite.section}.${rewrite.entryIndex}.${rewrite.field}.${rewrite.bulletIndex}`

const normalise = (text: string) => text.trim().replace(/\s+/g, " ").toLowerCase()

/** Reads the bullets of one field, whatever shape the stored JSON is in. */
export function bulletsOf(resume: Resume | null, section: BulletSection, entryIndex: number, field: BulletField): string[] {
  const entry = (resume?.[section] as Record<string, unknown>[] | undefined)?.[entryIndex]
  const value = entry?.[field]
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []
}

/**
 * The rewrites that still line up with the resume in front of us. One whose
 * bullet has been edited, moved or deleted since the AI read it is dropped:
 * better no suggestion than a suggestion that replaces the wrong line.
 */
export function liveRewrites(resume: Resume | null, rewrites: BulletRewrite[]): BulletRewrite[] {
  if (!resume) return []
  return rewrites.filter((rewrite) => {
    const bullets = bulletsOf(resume, rewrite.section, rewrite.entryIndex, rewrite.field)
    const current = bullets[rewrite.bulletIndex]
    return typeof current === "string" && normalise(current) === normalise(rewrite.original)
  })
}

/** The resume with one rewrite applied in place. */
export function applyRewrite(resume: Resume, rewrite: BulletRewrite): Resume {
  const entries = [...((resume[rewrite.section] ?? []) as Record<string, unknown>[])]
  const entry = entries[rewrite.entryIndex]
  if (!entry) return resume
  const bullets = [...bulletsOf(resume, rewrite.section, rewrite.entryIndex, rewrite.field)]
  if (bullets[rewrite.bulletIndex] === undefined) return resume
  bullets[rewrite.bulletIndex] = rewrite.suggested
  entries[rewrite.entryIndex] = { ...entry, [rewrite.field]: bullets }
  return { ...resume, [rewrite.section]: entries } as Resume
}

/** The rewrites for one entry, keyed by field and line, for the form to look up as it draws each bullet. */
export function rewritesForEntry(rewrites: BulletRewrite[], section: BulletSection, entryIndex: number) {
  const byField = new Map<string, BulletRewrite>()
  for (const rewrite of rewrites) {
    if (rewrite.section !== section || rewrite.entryIndex !== entryIndex) continue
    byField.set(`${rewrite.field}.${rewrite.bulletIndex}`, rewrite)
  }
  return byField
}

/** How many live rewrites each section has, for the counts in the left bar. */
export function rewriteCounts(rewrites: BulletRewrite[]): Partial<Record<BulletSection, number>> {
  const counts: Partial<Record<BulletSection, number>> = {}
  for (const rewrite of rewrites) counts[rewrite.section] = (counts[rewrite.section] ?? 0) + 1
  return counts
}
