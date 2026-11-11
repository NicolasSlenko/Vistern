import type { Resume } from "@/app/api/parse/resumeSchema"
import { fitToOnePage } from "@/lib/resumePageBudget"

/**
 * What a Vistern-generated resume must look like: Jake Gutierrez's one-page
 * template, written for undergraduate CS students.
 *
 * One list, two readers. `applyResumeStandard` enforces the rules code can
 * check for free (dates, order, punctuation, length); the AI is handed
 * `RESUME_STANDARD_PROMPT` for the rules only words can follow (verbs, XYZ,
 * honesty). Both read from `RESUME_STANDARD`, so they cannot drift apart.
 */

export interface StandardRule {
  id: string
  title: string
  rule: string
  /** True when the rule is about wording, so the AI needs to be told it. */
  forAi: boolean
}

export const RESUME_STANDARD: readonly StandardRule[] = [
  { id: "one-page", title: "One page", rule: "Exactly one US Letter page. Cut the weakest lines; never shrink the type.", forAi: true },
  { id: "order", title: "Section order", rule: "Education, Experience, Projects, Technical Skills, then optional sections (certifications, awards, activities).", forAi: false },
  { id: "header", title: "Header", rule: "Name, then phone | email | LinkedIn | GitHub (| site). No photo, no street address, no \"References available\".", forAi: false },
  { id: "dates", title: "Dates", rule: "\"Mon YYYY – Mon YYYY\" with three-letter months (e.g. \"Aug 2024 – May 2026\") and \"Present\" for current roles. The same form everywhere.", forAi: true },
  { id: "chronology", title: "Order of entries", rule: "Reverse chronological within each section; current entries first.", forAi: false },
  { id: "headings", title: "Entry headings", rule: "Experience: Role and Company, with Dates and Location. Projects: Name | Tech, Tech, with its date.", forAi: false },
  {
    id: "bullets",
    title: "Bullets",
    rule: "3–4 per role, 2–3 per project. Each starts with a strong action verb, past tense (present tense only for a current role), follows \"Accomplished X, measured by Y, by doing Z\", has no first person, no trailing period, and is at most 200 characters (two printed lines).",
    forAi: true,
  },
  { id: "honesty", title: "Honesty", rule: "Never invent numbers, employers, technologies or scope. Use only facts the student gave.", forAi: true },
  { id: "skills", title: "Technical skills", rule: "Grouped (Languages, Frameworks, Developer Tools, Libraries), comma separated, no duplicates.", forAi: false },
  { id: "education", title: "Education", rule: "School, location, degree and major, expected graduation. GPA only if the student gave it.", forAi: false },
]

/** The wording rules, ready to append to a system prompt. Static, so it sits in the cacheable prefix. */
export const RESUME_STANDARD_PROMPT = [
  "Resume standard (Jake Gutierrez one-page template). Every line you write must follow it:",
  ...RESUME_STANDARD.filter((rule) => rule.forAi).map((rule) => `- ${rule.title}: ${rule.rule}`),
].join("\n")

export const MAX_BULLET_CHARS = 200

// ---- Dates ------------------------------------------------------------------

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const MONTH_NAMES: Record<string, number> = {
  jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2, apr: 3, april: 3, may: 4, jun: 5, june: 5,
  jul: 6, july: 6, aug: 7, august: 7, sep: 8, sept: 8, september: 8, oct: 9, october: 9, nov: 10, november: 10,
  dec: 11, december: 11,
}
// A term names the month it usually starts in.
const SEASONS: Record<string, number> = { spring: 0, summer: 4, fall: 7, autumn: 7, winter: 11 }
const PRESENT = /^(present|current(ly)?|now|ongoing|today|expected)$/i

export interface ParsedDate {
  year: number
  /** 0–11, or null when only a year was given. */
  month: number | null
  present?: boolean
}

/** Reads the forms students actually type. Null when it can't tell. */
export function parseResumeDate(value: string | null | undefined): ParsedDate | null {
  const text = (value ?? "").trim().replace(/[.,]/g, " ").replace(/\s+/g, " ")
  if (!text) return null
  if (PRESENT.test(text)) return { year: Number.POSITIVE_INFINITY, month: null, present: true }

  let match = text.match(/^(\d{4})[-/](\d{1,2})(?:[-/]\d{1,2})?$/) // 2024-08, 2024/08/15
  if (match) return monthYear(Number(match[1]), Number(match[2]) - 1)

  match = text.match(/^(\d{1,2})[-/](\d{4})$/) // 08/2024
  if (match) return monthYear(Number(match[2]), Number(match[1]) - 1)

  match = text.match(/^(\d{1,2})[-/]\d{1,2}[-/](\d{4})$/) // 08/15/2024
  if (match) return monthYear(Number(match[2]), Number(match[1]) - 1)

  match = text.match(/^(?:expected |exp )?([a-z]+) (?:of )?'?(\d{2}|\d{4})$/i) // Aug 2024, August '24, Fall 2024
  if (match) {
    const word = match[1].toLowerCase()
    const year = toYear(match[2])
    if (word in MONTH_NAMES) return monthYear(year, MONTH_NAMES[word])
    if (word in SEASONS) return monthYear(year, SEASONS[word])
    return null
  }

  match = text.match(/^(?:expected |exp )?(\d{4})$/i)
  if (match) return { year: Number(match[1]), month: null }
  return null
}

function toYear(text: string) {
  const year = Number(text)
  return text.length === 2 ? 2000 + year : year
}

function monthYear(year: number, month: number): ParsedDate | null {
  if (month < 0 || month > 11 || year < 1950 || year > 2100) return null
  return { year, month }
}

/** "Aug 2024", "2024" or "Present". Anything unreadable is left as the student wrote it. */
export function formatResumeDate(value: string | null | undefined, { yearOnly = false } = {}): string {
  const parsed = parseResumeDate(value)
  if (!parsed) return (value ?? "").trim()
  if (parsed.present) return "Present"
  if (parsed.month === null || yearOnly) return String(parsed.year)
  return `${MONTHS[parsed.month]} ${parsed.year}`
}

/** Sort key: later is larger; "Present" beats everything; unknown sorts last. */
function dateKey(value: string | null | undefined): number {
  const parsed = parseResumeDate(value)
  if (!parsed) return Number.NEGATIVE_INFINITY
  if (parsed.present) return Number.POSITIVE_INFINITY
  return parsed.year * 12 + (parsed.month ?? 0)
}

// ---- Text -------------------------------------------------------------------

/** One clean line: no stray whitespace, no bullet glyph, no trailing period. */
export function cleanBullet(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/^[\s•·\-–*]+/, "")
    .trim()
    .replace(/(?<!\b(?:etc|Inc|Ltd|Co|Jr|Sr))\.+$/, "")
    .trim()
}

const cleanList = (list: string[] | undefined) => (list ?? []).map(cleanBullet).filter(Boolean)

/** Removes repeats within and across skill groups, keeping the first place each appears. */
function dedupeSkills(skills: Resume["skills"]): Resume["skills"] {
  const seen = new Set<string>()
  const out = {} as Resume["skills"]
  for (const [group, list] of Object.entries(skills) as [keyof Resume["skills"], string[]][]) {
    out[group] = (list ?? [])
      .map((skill) => skill.trim())
      .filter((skill) => {
        const key = skill.toLowerCase()
        if (!skill || seen.has(key)) return false
        seen.add(key)
        return true
      })
  }
  return out
}

/** Reverse chronological: by end date, then by start date. Stable for ties. */
function newestFirst<T extends { start_date: string; end_date: string }>(items: T[]): T[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const end = dateKey(b.item.end_date) - dateKey(a.item.end_date)
      if (end !== 0 && !Number.isNaN(end)) return end
      const start = dateKey(b.item.start_date) - dateKey(a.item.start_date)
      if (start !== 0 && !Number.isNaN(start)) return start
      return a.index - b.index
    })
    .map(({ item }) => item)
}

/** True when any dated field in the resume names a month; otherwise every date is shown as a year. */
function anyMonth(resume: Resume): boolean {
  const dates = [
    ...resume.experience.flatMap((e) => [e.start_date, e.end_date]),
    ...resume.education.flatMap((e) => [e.start_date, e.end_date]),
    ...resume.extracurriculars.flatMap((e) => [e.start_date, e.end_date]),
  ]
  return dates.some((date) => {
    const parsed = parseResumeDate(date)
    return parsed !== null && !parsed.present && parsed.month !== null
  })
}

// ---- The whole thing -------------------------------------------------------

/**
 * The mechanical half of the standard: same date form everywhere, newest
 * first, clean bullets, no repeated skills. Nothing is reworded and nothing
 * is cut. Use `applyResumeStandard` for the one-page version.
 */
export function normalizeResume(input: Resume): Resume {
  // Mixed forms ("Aug 2024" beside "2023") read as careless; if any entry names
  // a month the rest keep theirs, and a year alone stays a year rather than
  // gaining a month nobody gave.
  const yearOnly = !anyMonth(input)
  const date = (value: string) => formatResumeDate(value, { yearOnly })

  return {
    ...input,
    education: newestFirst(
      input.education.map((ed) => ({ ...ed, start_date: date(ed.start_date), end_date: date(ed.end_date), achievements: cleanList(ed.achievements) })),
    ),
    experience: newestFirst(
      input.experience.map((e) => ({
        ...e,
        start_date: date(e.start_date),
        end_date: date(e.end_date),
        responsibilities: cleanList(e.responsibilities),
        achievements: cleanList(e.achievements),
      })),
    ),
    projects: input.projects.map((p) => ({ ...p, description: p.description.trim(), highlights: cleanList(p.highlights) })),
    extracurriculars: newestFirst(
      input.extracurriculars.map((x) => ({ ...x, start_date: date(x.start_date), end_date: date(x.end_date), achievements: cleanList(x.achievements) })),
    ),
    achievements: input.achievements.map((a) => ({ ...a, date: date(a.date) })),
    certifications: input.certifications.map((c) => ({ ...c, date: date(c.date) })),
    publications: input.publications.map((p) => ({ ...p, date: date(p.date) })),
    skills: dedupeSkills(input.skills),
  }
}

/** The full standard: normalised, then fitted to one page. */
export function applyResumeStandard(input: Resume): Resume {
  return fitToOnePage(normalizeResume(input))
}

/** How much a one-page save would leave out, for the note under the preview. */
export function trimSummary(full: Resume, fitted: Resume) {
  const count = (resume: Resume) => ({
    entries: resume.experience.length + resume.projects.length + resume.extracurriculars.length,
    bullets:
      resume.experience.reduce((sum, e) => sum + e.responsibilities.length + e.achievements.length, 0) +
      resume.projects.reduce((sum, p) => sum + p.highlights.length, 0) +
      resume.extracurriculars.reduce((sum, x) => sum + x.achievements.length, 0),
  })
  const before = count(full)
  const after = count(fitted)
  return { entries: before.entries - after.entries, bullets: before.bullets - after.bullets }
}
