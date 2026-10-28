/**
 * Which listings a student should see, judged from the listing itself.
 *
 * Job boards match search words anywhere in a posting, so "intern software"
 * also finds a staff engineer whose description mentions mentoring interns
 * or "internal tools". Every listing is classified here from its title and
 * the experience it asks for, and kept only if that level is one the
 * student asked for.
 */

export type Level = "intern" | "entry" | "mid" | "senior"

export interface JobPreferences {
  jobType?: string[]
  experienceLevel?: string[]
}

const INTERN = /\b(intern|interns|internship|co-?op|apprentice(ship)?|summer (analyst|associate|engineer|scholar)|externship)\b/i
const SENIOR = /\b(senior|sr\.?|staff|principal|lead|director|head of|vp|vice president|chief|distinguished|architect|(?<!(product|program|project|associate|assistant) )manager|iii|iv)\b/i
const MID = /\b(mid[- ]?level|intermediate|ii)\b|\b(engineer|developer|scientist|analyst) 2\b/i
const ENTRY = /\b(new grad(uate)?|graduate|entry[- ]level|early career|junior|jr\.?|associate|university grad|recent grad|engineer i|developer i|level 1|apprentice)\b/i

/** The fewest years of experience a posting asks for, if it says. */
export function yearsRequired(description: string): number | null {
  const text = description.toLowerCase()
  let least: number | null = null
  for (const match of text.matchAll(/(\d{1,2})\s*\+?\s*(?:-|–|to)?\s*(?:\d{1,2}\s*)?\+?\s*years?(?:'s)?\s+(?:of\s+)?(?:[\w-]+\s+){0,4}?(?:experience|exp\b)/g)) {
    const years = Number(match[1])
    if (years > 0 && years < 30) least = least === null ? years : Math.min(least, years)
  }
  return least
}

export function levelOf(title: string, description = ""): Level | null {
  if (INTERN.test(title)) return "intern"
  if (SENIOR.test(title)) return "senior"
  if (MID.test(title)) return "mid"
  if (ENTRY.test(title)) return "entry"
  const years = yearsRequired(description)
  if (years === null) return null
  if (years >= 6) return "senior"
  if (years >= 3) return "mid"
  return "entry"
}

/**
 * The levels the student asked for. Job type decides internships against
 * jobs; experience level decides how far up full-time roles may go, and
 * stays at entry level when it was not answered — this is a student app.
 */
export function allowedLevels(prefs: JobPreferences): Set<Level> {
  const jobType = prefs.jobType ?? []
  const either = jobType.length === 0 || jobType.some((type) => /either|both/i.test(type)) ||
    (jobType.includes("Internship") && jobType.includes("Full-Time"))
  const internship = either || jobType.includes("Internship")
  const fullTime = either || jobType.includes("Full-Time")

  const levels = new Set<Level>()
  if (internship) levels.add("intern")
  if (fullTime) {
    levels.add("entry")
    const experience = (prefs.experienceLevel ?? []).join(" ").toLowerCase()
    if (experience.includes("mid")) levels.add("mid")
    if (/senior|lead|principal|executive/.test(experience)) levels.add("senior")
  }
  return levels
}

/**
 * Keep a listing when its level is one asked for. A listing whose level
 * can't be told is kept for full-time searches — most entry-level postings
 * don't say so — but not for internship-only ones, where the title must
 * say intern.
 */
export function keepListing(title: string, description: string, allowed: Set<Level>): boolean {
  const level = levelOf(title, description)
  if (level) return allowed.has(level)
  return allowed.has("entry")
}

/** What to type into a job board for each role a student can pick. */
const ROLE_TERMS: Record<string, string[]> = {
  "Frontend Developer": ["frontend", "front end developer", "web developer"],
  "Backend Developer": ["backend", "back end developer", "software engineer"],
  "Full Stack Developer": ["full stack", "software engineer", "software developer"],
  "Mobile Developer": ["mobile developer", "ios", "android"],
  "DevOps Engineer": ["devops", "site reliability", "cloud engineer"],
  "Data Engineer": ["data engineer", "data engineering"],
  "Data Scientist": ["data scientist", "data science", "data analyst"],
  "Machine Learning Engineer": ["machine learning", "ai engineer", "ml engineer"],
  "Security Engineer": ["security engineer", "cybersecurity", "information security"],
  "QA / Test Engineer": ["qa engineer", "software test", "quality assurance"],
  "Product Manager": ["product manager", "associate product manager", "product management"],
  // Nobody starts as a manager or an architect; search the work underneath.
  "Engineering Manager": ["software engineer", "technical program"],
  "Solutions Architect": ["solutions engineer", "cloud engineer"],
  "UI/UX Designer": ["ux designer", "product designer", "ui designer"],
}

export function searchTerms(role: string): string[] {
  return ROLE_TERMS[role] ?? [role.toLowerCase()]
}

/** Words that mark a posting above where a student starts, for the board's own exclude filter. */
export const SENIOR_EXCLUDE = "senior sr staff principal lead director manager architect"
