import { z } from "zod"

/**
 * Writing bullets with the AI while the student decides.
 *
 * Two jobs share these rules. "fix" takes one existing bullet and offers three
 * rewrites of it; "draft" takes a new entry the student described in a few
 * guided answers and offers three versions of each bullet it should have. In
 * both, the AI only proposes: nothing lands on the resume until the student
 * picks an option (and can edit it first).
 */

/** The sections whose entries carry achievement bullets worth rewriting. */
export type WritableSection = "experience" | "projects" | "extracurriculars"

export const WRITABLE_SECTIONS: readonly WritableSection[] = ["experience", "projects", "extracurriculars"]

export function isWritableSection(section: string): section is WritableSection {
  return (WRITABLE_SECTIONS as readonly string[]).includes(section)
}

/** Three options per bullet: enough to compare, few enough to read. */
export const OPTIONS_PER_BULLET = 3

export const BulletOptionSchema = z.object({
  text: z.string().describe("The bullet. One line. Starts with an action verb. Use [square brackets] for a fact the student must supply."),
  angle: z.string().describe("Two or three words naming what this version emphasises, e.g. 'Impact first', 'Technical depth', 'Concise'"),
  why: z.string().describe("One short sentence on what makes this version strong. No preamble."),
})
export type BulletOption = z.infer<typeof BulletOptionSchema>

export const FixResultSchema = z.object({
  options: z.array(BulletOptionSchema).describe(`Exactly ${OPTIONS_PER_BULLET} rewrites, each taking a different angle`),
})

export const DraftResultSchema = z.object({
  bullets: z.array(
    z.object({
      options: z.array(BulletOptionSchema).describe(`Exactly ${OPTIONS_PER_BULLET} versions of this bullet, each taking a different angle`),
    }),
  ),
})

/** What the student told the walkthrough about a new entry. */
export interface DraftAnswers {
  what: string
  problem: string
  result: string
}

/** A fact the student still has to fill in, written as [like this]. */
export const PLACEHOLDER = /\[[^\]]+\]/g

export function hasPlaceholder(text: string) {
  return /\[[^\]]+\]/.test(text)
}

export const BULLET_WRITING_SYSTEM = `You write resume bullets for undergraduate computer science students.

Every bullet you write:
- is ONE line and starts with a strong action verb: past tense, or present tense if the role or project is ongoing (no end date, or "Present");
- follows Google's XYZ formula where the facts allow: "accomplished X, as measured by Y, by doing Z";
- uses only facts the student gave. NEVER invent numbers, users, employers, technologies or scope.
  Every number the student gave ("about 40 students", "cut it to 2 seconds") MUST appear as given.
  Only when a number would help and the student gave none, write a short placeholder in square
  brackets for them to fill in, e.g. "[number] users" or "[percent]%";
- contains no dates (dates live in their own fields).

When you give several options for one bullet, make them genuinely different, not rewordings:
one leads with the measurable impact, one with the technical work, one is the most concise.
Label each with a two- or three-word "angle" and say in one sentence what makes it strong.`

const SECTION_NOUN: Record<WritableSection, string> = {
  experience: "work experience",
  projects: "project",
  extracurriculars: "leadership or activity role",
}

const text = (value: unknown) => (typeof value === "string" ? value.trim() : "")
const list = (value: unknown) => (Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim() !== "") : [])

function isOngoing(entry: Record<string, unknown>) {
  if (!("end_date" in entry)) return false
  const end = text(entry.end_date).toLowerCase()
  return end === "" || end === "present" || end === "current"
}

/** The entry as context lines for the model: who, where, when, with what, and its other bullets. */
export function describeEntry(section: WritableSection, entry: Record<string, unknown>, exclude?: string): string {
  const lines: string[] = [`Kind: ${SECTION_NOUN[section]}`]
  if (section === "experience") {
    lines.push(`Role: ${text(entry.position) || "(not given)"} at ${text(entry.company) || "(not given)"}`)
  } else if (section === "projects") {
    lines.push(`Project: ${text(entry.name) || "(not given)"}`)
    if (text(entry.description)) lines.push(`What it is: ${text(entry.description)}`)
  } else {
    lines.push(`Role: ${text(entry.role) || "(not given)"} at ${text(entry.organization) || "(not given)"}`)
  }
  const dates = [text(entry.start_date), text(entry.end_date)].filter(Boolean).join(" to ")
  if (dates) lines.push(`Dates: ${dates}`)
  lines.push(`Ongoing: ${isOngoing(entry) ? "yes (use present tense)" : "no (use past tense)"}`)
  const tools = list(entry.technologies)
  if (tools.length) lines.push(`Tools: ${tools.join(", ")}`)

  const others = ["responsibilities", "achievements", "highlights"]
    .flatMap((field) => list(entry[field]))
    .filter((bullet) => bullet !== exclude)
  if (others.length) lines.push(`Its other bullets (don't repeat them):\n${others.map((b) => `- ${b}`).join("\n")}`)
  return lines.join("\n")
}

export function buildFixPrompt({
  section,
  entry,
  bullet,
  context,
  avoid,
}: {
  section: WritableSection
  entry: Record<string, unknown>
  bullet: string
  context?: string
  avoid?: string[]
}): string {
  const parts = [
    `Rewrite this bullet in ${OPTIONS_PER_BULLET} different ways.`,
    `ENTRY\n${describeEntry(section, entry, bullet)}`,
    `BULLET TO REWRITE\n${bullet}`,
  ]
  if (context?.trim()) parts.push(`EXTRA CONTEXT FROM THE STUDENT (use these facts)\n${context.trim()}`)
  if (avoid?.length) parts.push(`The student has already seen these options and wants new ones. Don't repeat them:\n${avoid.map((a) => `- ${a}`).join("\n")}`)
  return parts.join("\n\n")
}

export function buildDraftPrompt({
  section,
  entry,
  answers,
  count,
}: {
  section: WritableSection
  entry: Record<string, unknown>
  answers: DraftAnswers
  count: number
}): string {
  return [
    `Draft ${count} bullets for this new ${SECTION_NOUN[section]}, each with ${OPTIONS_PER_BULLET} versions.`,
    `Each bullet should cover a different part of the work, so together they tell the whole story.`,
    `ENTRY\n${describeEntry(section, entry)}`,
    `WHAT THE STUDENT DID OR BUILT\n${answers.what.trim() || "(not given)"}`,
    `THE PROBLEM, AND WHO IT WAS FOR\n${answers.problem.trim() || "(not given)"}`,
    `RESULTS OR NUMBERS\n${answers.result.trim() || "(none given: use [placeholders] where a number belongs)"}`,
  ].join("\n\n")
}

/**
 * How many bullets a new entry should get: as many as the student's other
 * entries in that section usually have, so the resume reads evenly. The median
 * ignores one unusually long or empty entry; 3 when there's nothing to go on.
 */
export function bulletTarget(entries: Record<string, unknown>[], section: WritableSection): number {
  const fields = section === "projects" ? ["highlights"] : section === "experience" ? ["responsibilities", "achievements"] : ["achievements"]
  const counts = entries
    .map((entry) => fields.reduce((sum, field) => sum + list(entry[field]).length, 0))
    .filter((count) => count > 0)
    .sort((a, b) => a - b)
  if (counts.length === 0) return 3
  const median = counts[Math.floor((counts.length - 1) / 2)]
  return Math.min(5, Math.max(2, median))
}

/** Keeps the model's options usable: trimmed, non-empty, and no more than three. */
export function cleanOptions(options: BulletOption[] | undefined): BulletOption[] {
  return (options ?? [])
    .map((option) => ({ text: option.text.trim(), angle: option.angle.trim(), why: option.why.trim() }))
    .filter((option) => option.text !== "")
    .slice(0, OPTIONS_PER_BULLET)
}
