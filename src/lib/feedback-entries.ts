import type { Resume } from "@/app/api/parse/resumeSchema"

/**
 * Ties the XYZ review's per-entry feedback to the entries it is about.
 *
 * The model returns feedback keyed by position ("experience 0"), which only
 * holds for the exact list it was shown. The master profile orders its
 * entries differently from any one resume, and entries get reordered,
 * added and removed after a review. So each entry's feedback is labelled
 * with who it is about when it's saved, and matched back by that label when
 * it's shown: better no note than a note on the wrong job.
 */

export type EntrySection = "projects" | "experience"
const SECTIONS: EntrySection[] = ["projects", "experience"]

type Feedback = Partial<Record<EntrySection, Record<string, unknown>>> & Record<string, unknown>

const normalize = (value: unknown) => (typeof value === "string" ? value.trim().toLowerCase().replace(/\s+/g, " ") : "")

/** Who an entry is: company and role for experience, the name for a project. */
export function entryLabel(section: EntrySection, entry: unknown): string {
  if (!entry || typeof entry !== "object") return ""
  const fields = entry as Record<string, unknown>
  return section === "experience" ? `${normalize(fields.company)}|${normalize(fields.position)}` : normalize(fields.name)
}

const entriesOf = (resume: Resume | null, section: EntrySection): unknown[] =>
  Array.isArray(resume?.[section]) ? (resume![section] as unknown[]) : []

/** Labels each entry's feedback with the entry it was written for. Used when a review is saved. */
export function labelFeedback<T>(feedback: T, resume: Resume): T {
  if (!feedback || typeof feedback !== "object") return feedback
  const labelled = { ...(feedback as Feedback) }
  for (const section of SECTIONS) {
    const items = labelled[section]
    if (!items || typeof items !== "object") continue
    const entries = entriesOf(resume, section)
    labelled[section] = Object.fromEntries(
      Object.entries(items).map(([key, item]) => {
        const label = entryLabel(section, entries[Number(key)])
        return [key, item && typeof item === "object" && label ? { ...item, entry: label } : item]
      }),
    )
  }
  return labelled as T
}

/**
 * Re-keys labelled feedback to where each entry now sits in `resume`, and
 * drops any whose entry isn't there. Feedback saved before labels existed
 * keeps its position, as it always did.
 */
export function alignFeedback<T>(feedback: T, resume: Resume | null): T {
  if (!feedback || typeof feedback !== "object" || !resume) return feedback
  const aligned = { ...(feedback as Feedback) }
  for (const section of SECTIONS) {
    const items = aligned[section]
    if (!items || typeof items !== "object") continue
    const labels = entriesOf(resume, section).map((entry) => entryLabel(section, entry))
    const taken = new Set<number>()
    const next: Record<string, unknown> = {}
    for (const [key, item] of Object.entries(items)) {
      const label = item && typeof item === "object" ? (item as { entry?: unknown }).entry : undefined
      if (typeof label !== "string") {
        next[key] = item
        continue
      }
      // Two entries can share a label (the same role twice); each claims the first free one.
      const index = labels.findIndex((candidate, at) => candidate === label && !taken.has(at))
      if (index === -1) continue
      taken.add(index)
      next[String(index)] = item
    }
    aligned[section] = next
  }
  return aligned as T
}
