import type { Resume } from "../../app/api/parse/resumeSchema"

// Models like to fill blanks with a stand-in rather than leaving them empty.
const PLACEHOLDERS = new Set([
  "n/a",
  "n.a.",
  "na",
  "none",
  "none provided",
  "none listed",
  "null",
  "nil",
  "nan",
  "undefined",
  "unknown",
  "not provided",
  "not listed",
  "not available",
  "not applicable",
  "not specified",
  "not mentioned",
  "not stated",
  "tbd",
  "tba",
  "-",
  "--",
  "–",
  "—",
  "?",
  "???",
])

const PARTICLES = new Set([
  "van",
  "von",
  "der",
  "den",
  "de",
  "del",
  "della",
  "di",
  "da",
  "dos",
  "das",
  "du",
  "la",
  "le",
  "bin",
  "ibn",
  "al",
  "af",
  "ter",
  "ten",
])

const ROMAN_SUFFIX = /^(?:II|III|IV|V|VI|VII|VIII|IX|X|XI|XII)$/

const MONTHS = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
]

const MONTH_NAMES: Record<string, string> = {
  jan: "Jan",
  january: "Jan",
  feb: "Feb",
  febuary: "Feb",
  february: "Feb",
  mar: "Mar",
  march: "Mar",
  apr: "Apr",
  april: "Apr",
  may: "May",
  jun: "Jun",
  june: "Jun",
  jul: "Jul",
  july: "Jul",
  aug: "Aug",
  august: "Aug",
  sep: "Sep",
  sept: "Sep",
  september: "Sep",
  oct: "Oct",
  october: "Oct",
  nov: "Nov",
  november: "Nov",
  dec: "Dec",
  december: "Dec",
}

const ONGOING = /^(?:present|presently|current|currently|ongoing|now|today|to date|till date|until now|date)$/i
const QUALIFIERS = /\b(?:expected|anticipated|estimated|projected|graduating|graduation|est\.?|starting|since|as of)\b/gi
const EDGE_PUNCTUATION = /^[\s\-–—,.:;|/]+|[\s\-–—,.:;|/]+$/g

function collapse(value: string): string {
  return value.replace(/\s+/g, " ").trim()
}

function isPlaceholder(value: string): boolean {
  const key = value.toLowerCase().replace(/[\s]+/g, " ").trim()
  return PLACEHOLDERS.has(key) || PLACEHOLDERS.has(key.replace(/\.$/, ""))
}

function cleanString(value: string): string {
  const collapsed = collapse(value)
  return isPlaceholder(collapsed) ? "" : collapsed
}

function cleanDeep(value: unknown): unknown {
  if (typeof value === "string") return cleanString(value)
  if (Array.isArray(value)) {
    return value
      .map(cleanDeep)
      .filter((item) => !(typeof item === "string" && item === ""))
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {}
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      out[key] = cleanDeep(item)
    }
    return out
  }
  return value
}

function capitaliseWord(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
}

function recaseNameToken(token: string, index: number): string {
  if (!/\p{L}/u.test(token)) return token
  if (token.includes(".")) return token // initials such as J.R.R.
  if (ROMAN_SUFFIX.test(token)) return token
  if (token.replace(/\P{L}/gu, "").length === 1) return token // a bare initial
  if (index > 0 && PARTICLES.has(token.toLowerCase())) return token.toLowerCase()

  return token.replace(/\p{L}+/gu, (run) => {
    // MCDONALD must not flatten to Mcdonald.
    if (/^MC\p{Lu}{2,}$/u.test(run)) return "Mc" + capitaliseWord(run.slice(2))
    return capitaliseWord(run)
  })
}

/** Only touch a name the resume typeset entirely in capitals; anything else is the author's own casing. */
function normalizeName(name: string): string {
  if (!name) return name
  if (/\p{Ll}/u.test(name)) return name
  const letters = name.replace(/\P{L}/gu, "")
  if (!letters) return name
  if (!/\s/.test(name) && letters.length <= 3) return name // likely an initialism

  return name
    .split(" ")
    .map((token, index) => recaseNameToken(token, index))
    .join(" ")
}

function formatDate(value: string): string {
  const monthYear = value.match(/^(\p{L}+)\.?\s*,?\s*(\d{4})$/u)
  if (monthYear) {
    const month = MONTH_NAMES[monthYear[1].toLowerCase()]
    if (month) return `${month} ${monthYear[2]}`
    return value
  }

  const dayed = value.match(/^(\p{L}+)\.?\s+\d{1,2}(?:st|nd|rd|th)?,?\s+(\d{4})$/u)
  if (dayed) {
    const month = MONTH_NAMES[dayed[1].toLowerCase()]
    if (month) return `${month} ${dayed[2]}`
    return value
  }

  const yearMonth = value.match(/^(\d{4})[/-](\d{1,2})$/)
  if (yearMonth) {
    const month = MONTHS[Number(yearMonth[2]) - 1]
    if (month) return `${capitaliseWord(month)} ${yearMonth[1]}`
    return value
  }

  const numeric = value.match(/^(\d{1,2})[/-](?:\d{1,2}[/-])?(\d{4})$/)
  if (numeric) {
    const month = MONTHS[Number(numeric[1]) - 1]
    if (month) return `${capitaliseWord(month)} ${numeric[2]}`
    return value
  }

  if (/^\d{4}$/.test(value)) return value
  return value
}

function cleanDate(value: string): string {
  let text = collapse(value).replace(EDGE_PUNCTUATION, "")
  if (!text || isPlaceholder(text)) return ""
  text = collapse(text.replace(QUALIFIERS, " ")).replace(EDGE_PUNCTUATION, "")
  if (!text || isPlaceholder(text) || ONGOING.test(text)) return ""
  return formatDate(text)
}

function looksDated(part: string): boolean {
  return /\d{4}/.test(part) || ONGOING.test(part)
}

/** Split "Aug 2023 – Dec 2026" without breaking ISO-ish values like "2023-08". */
function splitRange(value: string): [string, string] | null {
  const parts = value.split(/\s*(?:–|—|\bto\b|\buntil\b|\bthrough\b)\s*|\s+-\s+|\s*-\s*(?=\p{L})|(?<=\d{4})-(?=\d{4})/iu)
  if (parts.length !== 2) return null
  const [start, end] = parts.map((part) => part.replace(EDGE_PUNCTUATION, ""))
  if (!start || !end) return null
  if (!looksDated(start) || !looksDated(end)) return null
  return [start, end]
}

function normalizeDatePair(rawStart: unknown, rawEnd: unknown): { start_date: string; end_date: string } {
  let start = typeof rawStart === "string" ? collapse(rawStart) : ""
  let end = typeof rawEnd === "string" ? collapse(rawEnd) : ""

  if (!start || start === end) {
    const split = splitRange(end)
    if (split) [start, end] = split
  } else if (!end) {
    const split = splitRange(start)
    if (split) [start, end] = split
  }

  return { start_date: cleanDate(start), end_date: cleanDate(end) }
}

function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === "string") return value.trim() === ""
  if (Array.isArray(value)) return value.every(isEmptyValue)
  if (typeof value === "object") return Object.values(value as Record<string, unknown>).every(isEmptyValue)
  return false
}

function mapEntries<T>(value: unknown, fn: (entry: Record<string, unknown>) => Record<string, unknown>): T {
  if (!Array.isArray(value)) return [] as unknown as T
  return value
    .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object")
    .map(fn)
    .filter((entry) => !isEmptyValue(entry)) as unknown as T
}

function withDates(entry: Record<string, unknown>): Record<string, unknown> {
  return { ...entry, ...normalizeDatePair(entry.start_date, entry.end_date) }
}

/**
 * Deterministic cleanup of whatever the model returned. The prompt asks for all of this too,
 * but it is not reliable about it, and anything unrecognised is left exactly as it arrived.
 */
export function normalizeParsedResume(resume: Resume): Resume {
  try {
    const draft = cleanDeep(resume) as Record<string, unknown>
    const basics = (draft.basics ?? {}) as Record<string, unknown>

    return {
      ...(draft as unknown as Resume),
      basics: {
        ...basics,
        name: typeof basics.name === "string" ? normalizeName(basics.name) : basics.name,
      },
      education: mapEntries(draft.education, (entry) => {
        const dated = withDates(entry)
        return { ...dated, gpa: isEmptyValue(dated.gpa) ? null : dated.gpa }
      }),
      experience: mapEntries(draft.experience, withDates),
      extracurriculars: mapEntries(draft.extracurriculars, withDates),
      projects: mapEntries(draft.projects, (entry) => entry),
      achievements: mapEntries(draft.achievements, (entry) => entry),
      certifications: mapEntries(draft.certifications, (entry) => entry),
      publications: mapEntries(draft.publications, (entry) => entry),
    } as Resume
  } catch {
    return resume
  }
}
