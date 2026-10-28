import { allowedLevels, searchTerms, SENIOR_EXCLUDE, type Level } from "./listing-filter"

/* Where live listings come from: Adzuna (keyed) and The Muse (open). Each
   is asked for only the levels the student wants, as far as the board's
   own filters allow; listing-filter.ts then checks every listing anyway. */

/** Listings older than this are usually filled. */
const MAX_DAYS_OLD = "60"

export interface AdzunaJob {
  id: string
  title: string
  company: { display_name: string }
  location: { display_name: string }
  description: string
  salary_min?: number
  salary_max?: number
  redirect_url: string
  contract_type?: string
  created: string
}

export const LOCATION_TO_COUNTRY: Record<string, string> = {
  "United States": "us",
  "Canada": "ca",
  "United Kingdom": "gb",
  "Europe": "de",
  "Asia Pacific": "au",
  "Latin America": "br",
  "Remote (Anywhere)": "us",
}

async function adzunaSearch(
  appId: string,
  appKey: string,
  what: string,
  country: string,
  extra: Record<string, string> = {},
  page = 1
): Promise<AdzunaJob[]> {
  const params = new URLSearchParams({ app_id: appId, app_key: appKey, results_per_page: "50", what, max_days_old: MAX_DAYS_OLD, ...extra })
  const url = `https://api.adzuna.com/v1/api/jobs/${country}/search/${page}?${params.toString()}`
  try {
    const res = await fetch(url, { cache: "no-store" })
    if (!res.ok) return []
    const data = await res.json()
    return (data.results as AdzunaJob[]) || []
  } catch {
    return []
  }
}

// ─── The Muse (free, no auth) ────────────────────────────────────────────────

interface MuseJob {
  id: number
  name: string
  company: { name: string }
  locations: Array<{ name: string }>
  contents: string
  refs: { landing_page: string }
}

const ROLE_TO_MUSE_CATEGORY: Record<string, string> = {
  "software": "Software Engineering",
  "frontend": "Software Engineering",
  "backend": "Software Engineering",
  "full-stack": "Software Engineering",
  "fullstack": "Software Engineering",
  "mobile": "Software Engineering",
  "ios": "Software Engineering",
  "android": "Software Engineering",
  "devops": "Software Engineering",
  "data science": "Data Science",
  "data analyst": "Data & Analytics",
  "machine learning": "Data Science",
  "product manager": "Product",
  "ux": "Design & UX",
  "ui": "Design & UX",
  "cybersecurity": "IT",
  "security": "IT",
  "qa": "Software Engineering",
  "data engineer": "Data Science",
  "designer": "Design & UX",
  "cloud": "Software Engineering",
}

function roleToMuseCategory(role: string): string {
  const lower = (role || "").toLowerCase()
  for (const [key, cat] of Object.entries(ROLE_TO_MUSE_CATEGORY)) {
    if (lower.includes(key)) return cat
  }
  return "Software Engineering"
}

/** The Muse's own level names for the levels a student asked for. */
const MUSE_LEVELS: Record<Level, string> = {
  intern: "Internship",
  entry: "Entry Level",
  mid: "Mid Level",
  senior: "Senior Level",
}

export async function fetchMuseJobs(roleTypes: string[], isRemote: boolean, levels: Set<Level>): Promise<AdzunaJob[]> {
  const categories = [...new Set(roleTypes.slice(0, 4).map(roleToMuseCategory))]
  const searches = categories.flatMap((cat) => [0, 1].map(async (page): Promise<AdzunaJob[]> => {
    try {
      const params = new URLSearchParams({ category: cat, page: String(page), descending: "true" })
      // Asked of the board itself, so senior roles never arrive in the first place.
      for (const level of levels) params.append("level", MUSE_LEVELS[level])
      if (isRemote) params.set("location", "Flexible / Remote")
      const res = await fetch(`https://www.themuse.com/api/public/jobs?${params}`, { cache: "no-store" })
      if (!res.ok) return []
      const data = await res.json()
      return ((data.results || []) as MuseJob[]).map(j => ({
        id: `muse_${j.id}`,
        title: j.name,
        company: { display_name: j.company.name },
        location: { display_name: j.locations[0]?.name || "Remote" },
        description: j.contents.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
        redirect_url: j.refs.landing_page,
        created: new Date().toISOString(),
      }))
    } catch {
      return []
    }
  }))
  const results = await Promise.all(searches)
  return results.flat()
}

export function dedupeJobs(jobs: AdzunaJob[]): AdzunaJob[] {
  const seenIds = new Set<string>()
  const seenTitleCompany = new Set<string>()
  return jobs.filter(j => {
    if (seenIds.has(j.id)) return false
    seenIds.add(j.id)
    const key = `${(j.title || "").toLowerCase().replace(/\s+/g, " ").trim()}|${(j.company?.display_name || "").toLowerCase().trim()}`
    if (seenTitleCompany.has(key)) return false
    seenTitleCompany.add(key)
    return true
  })
}

/** The senior words to exclude, less any the role's own titles use ("product manager"). */
function excludeFor(role: string) {
  const words = [role, ...searchTerms(role)].join(" ").toLowerCase()
  return SENIOR_EXCLUDE.split(" ").filter((word) => !words.includes(word)).join(" ")
}

export async function fetchAdzunaJobs(prefs: Record<string, string[]>): Promise<AdzunaJob[]> {
  const appId = process.env.ADZUNA_APP_ID
  const appKey = process.env.ADZUNA_APP_KEY
  if (!appId || !appKey) {
    throw new Error("Adzuna API credentials not configured. Add ADZUNA_APP_ID and ADZUNA_APP_KEY to your .env.")
  }

  const roleTypes: string[] = prefs.roleTypes || []
  const location: string[] = prefs.location || []
  const workEnvironment: string[] = prefs.workEnvironment || []
  const degreeLevel: string[] = prefs.degreeLevel || []

  const isRemote = workEnvironment.some(e => (e || "").toLowerCase().includes("remote")) || location.includes("Remote (Anywhere)")

  // Degree-level search tag appended to queries for signal (soft filter via LLM scoring)
  const degreeTags: string[] = []
  if (degreeLevel.includes("Undergraduate / Associate") && !degreeLevel.includes("PhD / Doctorate")) degreeTags.push("entry level")
  if (degreeLevel.includes("Master's Degree")) degreeTags.push("masters")
  if (degreeLevel.includes("PhD / Doctorate")) degreeTags.push("phd research scientist")

  const remoteTag = isRemote ? " remote" : ""

  // Derive the exact set of countries from the user's location preferences — no cross-contamination
  const selectedCountries = [...new Set(
    location.map(l => LOCATION_TO_COUNTRY[l]).filter((c): c is string => Boolean(c))
  )]
  const countries = selectedCountries.length > 0 ? selectedCountries : ["us"]

  const levels = allowedLevels(prefs)
  const roles = roleTypes.length ? roleTypes.slice(0, 3) : ["Full Stack Developer"]
  const searches: Promise<AdzunaJob[]>[] = []

  if (levels.has("intern")) {
    // "intern" must be in the title: anywhere else it matches senior
    // postings that mention mentoring interns or "internal" tools.
    const intern = (role: string, title = "intern") => ({ title_only: title, what_exclude: excludeFor(role) })
    for (const country of countries) {
      for (const [index, role] of roles.entries()) {
        for (const term of searchTerms(role).slice(0, index === 0 ? 3 : 2)) {
          searches.push(adzunaSearch(appId, appKey, `${term}${remoteTag}`, country, intern(role)))
        }
      }
      // Titles that say "internship" rather than "intern".
      const main = searchTerms(roles[0])[0]
      searches.push(adzunaSearch(appId, appKey, `${main}${remoteTag}`, country, intern(roles[0], "internship")))
    }
    // One step deeper on the main role in the main country, where most listings are.
    const main = searchTerms(roles[0])[0]
    searches.push(adzunaSearch(appId, appKey, `${main}${remoteTag}`, countries[0], intern(roles[0]), 2))
    // Co-ops are internships by another name.
    searches.push(adzunaSearch(appId, appKey, `co-op ${main}`, countries[0], { what_exclude: excludeFor(roles[0]) }))
  }

  if (levels.has("entry") || levels.has("mid") || levels.has("senior")) {
    const extra: Record<string, string> = {}
    if (!levels.has("intern")) extra.full_time = "1"
    const exclude = (role: string): Record<string, string> => (levels.has("senior") ? {} : { what_exclude: excludeFor(role) })
    const tag = levels.has("mid") || levels.has("senior") ? "" : " entry level"
    for (const country of countries) {
      for (const role of roles) {
        const [term, alternate] = searchTerms(role)
        searches.push(adzunaSearch(appId, appKey, `${term}${remoteTag}`, country, { ...extra, ...exclude(role) }))
        if (tag) searches.push(adzunaSearch(appId, appKey, `${term}${tag}${remoteTag}`, country, { ...extra, ...exclude(role) }))
        if (alternate && country === countries[0]) searches.push(adzunaSearch(appId, appKey, `${alternate}${remoteTag}`, country, { ...extra, ...exclude(role) }))
      }
    }
    if (tag && degreeTags.length) {
      const term = searchTerms(roles[0])[0]
      searches.push(adzunaSearch(appId, appKey, `${term} ${degreeTags[0]}`, countries[0], { ...extra, ...exclude(roles[0]) }))
    }
  }

  const results = await Promise.all(searches)
  return dedupeJobs(results.flat())
}
