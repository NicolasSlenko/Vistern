import type { Resume } from "@/app/api/parse/resumeSchema"
import { allBullets, readBullet } from "./impact"

/**
 * Whether the resume is well made, as opposed to whether there is enough in
 * it. The two are different questions and a student needs both answered: a
 * thin resume can be immaculate, and a strong one can be a mess.
 *
 * This is a checklist rather than a score, because every item names
 * something specific to go and fix. Presented as "5 of 8 clear" — the shape
 * is borrowed from resumezip's checks (MIT, © 2025 Ian Hoang), the rules are
 * our own.
 */

export type CheckState = "clear" | "warn" | "fail"

export interface Check {
  id: string
  /** What is being checked, as a heading. */
  title: string
  state: CheckState
  /** What is wrong, or a word of confirmation when it is clear. */
  detail: string
  /** Where to go to fix it. */
  section?: "profile" | "experience" | "projects" | "education" | "skills"
}

const MONTH = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i
const YEAR = /\b(19|20)\d{2}\b/

const pick = (ok: boolean, warn: boolean): CheckState => (ok ? "clear" : warn ? "warn" : "fail")

function contact(resume: Resume): Check {
  const { basics } = resume
  const has = (value?: string) => Boolean(value?.trim())
  const missing = [
    !has(basics.email) && "an email",
    !has(basics.phone) && "a phone number",
    !has(basics.location?.city) && "a location",
  ].filter(Boolean) as string[]

  return {
    id: "contact",
    title: "Contact details",
    state: pick(missing.length === 0, missing.length === 1),
    detail: missing.length ? `Add ${missing.join(", ")}.` : "Everything a recruiter needs to reach you.",
    section: "profile",
  }
}

function links(resume: Resume): Check {
  const { basics } = resume
  const count = [basics.linkedin, basics.github, basics.portfolio].filter((value) => value?.trim()).length
  return {
    id: "links",
    title: "Somewhere to see your work",
    state: pick(count >= 2, count === 1),
    detail: count === 0 ? "No GitHub, LinkedIn or site. For a technical role this is the first thing looked for." : count === 1 ? "One link. A second gives a fuller picture." : `${count} links.`,
    section: "profile",
  }
}

/** Dates in the same form throughout, and none that run backwards. */
function dates(resume: Resume): Check {
  const ranges = [
    ...(resume.experience ?? []).map((item) => ({ start: item.start_date, end: item.end_date, what: item.company })),
    ...(resume.education ?? []).map((item) => ({ start: item.start_date, end: item.end_date, what: item.school })),
  ].filter((range) => range.start?.trim() || range.end?.trim())

  if (!ranges.length) {
    return { id: "dates", title: "Dates", state: "warn", detail: "Nothing is dated, so none of it can be placed in time.", section: "experience" }
  }

  const given = ranges.flatMap((range) => [range.start, range.end]).filter((value): value is string => Boolean(value?.trim()))
  const withMonth = given.filter((value) => MONTH.test(value)).length
  // Either every date names a month or none does. A resume that mixes the
  // two reads as careless, which is the only reason it matters.
  const mixed = withMonth > 0 && withMonth < given.length
  const missingYear = given.filter((value) => !YEAR.test(value)).length

  const backwards = ranges.filter((range) => {
    const from = Number(range.start?.match(YEAR)?.[0])
    const to = Number(range.end?.match(YEAR)?.[0])
    return from && to && to < from
  })

  if (backwards.length) {
    return { id: "dates", title: "Dates", state: "fail", detail: `${backwards[0].what || "An entry"} ends before it starts.`, section: "experience" }
  }
  if (missingYear) {
    return { id: "dates", title: "Dates", state: "fail", detail: `${missingYear} ${missingYear === 1 ? "date has" : "dates have"} no year.`, section: "experience" }
  }
  return {
    id: "dates",
    title: "Dates",
    state: mixed ? "warn" : "clear",
    detail: mixed ? "Some dates name a month and some do not. Pick one and use it throughout." : "Consistent throughout.",
    section: "experience",
  }
}

/** Bullets that say what happened, not what you were there for. */
function bullets(resume: Resume): Check {
  const lines = allBullets(resume)
  if (!lines.length) {
    return { id: "bullets", title: "Bullets", state: "fail", detail: "Nothing is described. Each role and project needs a line or two of what you did.", section: "experience" }
  }
  const read = lines.map(readBullet)
  const weak = read.filter((bullet) => bullet.weakOpening).length
  const quantified = read.filter((bullet) => bullet.quantified).length
  const share = quantified / read.length

  if (weak > read.length / 3) {
    return { id: "bullets", title: "Bullets", state: "fail", detail: `${weak} start with “worked on”, “helped” or similar, which hides what you did.`, section: "experience" }
  }
  if (share < 0.3) {
    return { id: "bullets", title: "Bullets", state: "warn", detail: `Only ${quantified} of ${read.length} carry a number. Figures are what make a claim checkable.`, section: "experience" }
  }
  return { id: "bullets", title: "Bullets", state: "clear", detail: `${quantified} of ${read.length} carry a figure.`, section: "experience" }
}

/** Enough to fill a page, not so much that it runs past one. */
function length(resume: Resume): Check {
  const lines = allBullets(resume)
  const entries = (resume.experience?.length ?? 0) + (resume.projects?.length ?? 0)
  const words = lines.reduce((sum, line) => sum + line.split(/\s+/).length, 0)

  if (entries < 2) {
    return { id: "length", title: "Length", state: "fail", detail: "Too little to fill a page. Two or three roles or projects is the floor.", section: "projects" }
  }
  // Roughly a page: a student resume should not need a second one.
  if (words > 520) {
    return { id: "length", title: "Length", state: "warn", detail: "Likely over one page. Cut the weakest lines rather than shrinking the type.", section: "experience" }
  }
  if (words < 120) {
    return { id: "length", title: "Length", state: "warn", detail: "Short for one page. There is room to say more about what you did.", section: "experience" }
  }
  return { id: "length", title: "Length", state: "clear", detail: "About one page." }
}

/** Bullets of a readable size: a line or two, not a paragraph. */
function readable(resume: Resume): Check {
  const lines = allBullets(resume)
  if (!lines.length) return { id: "readable", title: "Readability", state: "warn", detail: "Nothing to read yet." }
  const long = lines.filter((line) => line.split(/\s+/).length > 34)
  const stubs = lines.filter((line) => line.split(/\s+/).length < 5)
  if (long.length) {
    return { id: "readable", title: "Readability", state: "warn", detail: `${long.length} ${long.length === 1 ? "bullet runs" : "bullets run"} long enough to be skipped. Split or trim.`, section: "experience" }
  }
  if (stubs.length) {
    return { id: "readable", title: "Readability", state: "warn", detail: `${stubs.length} ${stubs.length === 1 ? "bullet is" : "bullets are"} too short to say anything.`, section: "experience" }
  }
  return { id: "readable", title: "Readability", state: "clear", detail: "Every bullet is a readable length." }
}

function skills(resume: Resume): Check {
  const all = Object.values(resume.skills ?? {}).flat().filter((skill) => typeof skill === "string" && skill.trim())
  return {
    id: "skills",
    title: "Skills",
    state: pick(all.length >= 6, all.length >= 3),
    detail: all.length === 0 ? "No skills listed." : all.length < 6 ? `${all.length} listed. Name the languages and tools you have actually used.` : `${all.length} listed.`,
    section: "skills",
  }
}

function education(resume: Resume): Check {
  const entries = resume.education ?? []
  if (!entries.length) return { id: "education", title: "Education", state: "fail", detail: "No school listed.", section: "education" }
  const incomplete = entries.filter((entry) => !entry.school?.trim() || !entry.degree?.trim())
  return {
    id: "education",
    title: "Education",
    state: incomplete.length ? "warn" : "clear",
    detail: incomplete.length ? "An entry is missing its school or degree." : "Complete.",
    section: "education",
  }
}

export interface CraftReport {
  checks: Check[]
  clear: number
  total: number
}

/** Every check, in the order a reader would care about them. */
export function craftReport(resume: Resume): CraftReport {
  const checks = [contact(resume), links(resume), bullets(resume), dates(resume), readable(resume), length(resume), skills(resume), education(resume)]
  return { checks, clear: checks.filter((check) => check.state === "clear").length, total: checks.length }
}
