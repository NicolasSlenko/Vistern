import { z } from "zod"
import { generateObject, type AiProvider } from "@/lib/ai"
import { resolveAiProvider } from "@/lib/ai/resolve"
import { withAiCache } from "@/lib/ai/cache"
import { checkAndIncrementLimit } from "@/lib/usageLimits"
import type { Resume } from "@/app/api/parse/resumeSchema"
import {
  MAX_EXPERIENCE_BULLETS,
  MAX_PROJECT_BULLETS,
  PAGE_LINES,
  capExperienceBullets,
  capProjectBullets,
  experienceBullets,
  fitToOnePage,
  fixedLines,
  textLines,
} from "@/lib/resumePageBudget"
import { RESUME_STANDARD_PROMPT, normalizeResume } from "./standard"

/**
 * Which experiences, projects and bullets go on one page, chosen by the AI.
 *
 * With a job it ranks for that job (/api/tailor-resume); without one it ranks
 * for a general software internship (Save as resume on /profile). The model
 * only picks by index — it never rewrites — so nothing can be invented, and
 * `fitToOnePage` trims behind it in case its arithmetic is off.
 */

// Long postings put requirements well past the opening paragraphs.
const JOB_DESCRIPTION_CHARS = 4000
// Bullets shown per entry; profiles merged from several uploads can carry many.
const BULLETS_SHOWN = 10

const PickSchema = z.object({
  index: z.number().describe("0-based index of the entry"),
  bulletIndices: z.array(z.number()).describe("0-based indices of this entry's bullets to keep, most relevant first"),
})

const SelectionSchema = z.object({
  selectedExperiences: z.array(PickSchema).describe("Experiences to include, most relevant first"),
  selectedProjects: z
    .array(PickSchema)
    .describe("Projects to include, most relevant first. Never empty when the candidate has projects"),
  selectionReasoning: z.array(z.string()).describe("One short sentence per selected item explaining why it was chosen for this role"),
})

type Selection = z.infer<typeof SelectionSchema>

export interface TargetJob {
  title?: string
  company?: string
  description: string
}

/** The daily limit is used up. Only thrown on a cache miss: a cached answer is free. */
export class SelectionLimitError extends Error {
  constructor() {
    super("Daily tailor resume limit reached (10/day). Try again tomorrow.")
    this.name = "SelectionLimitError"
  }
}

export interface SelectOptions {
  userId: string
  /** Basics, education, skills and the other sections; its experience and projects are ignored. */
  base: Resume
  experiences: Resume["experience"]
  projects: Resume["projects"]
  /** Null ranks for a general software internship. */
  job: TargetJob | null
}

export interface SelectResult {
  resume: Resume
  reasoning: string[]
  provider?: AiProvider
  cached: boolean
}

export async function selectForRole({ userId, base, experiences, projects, job }: SelectOptions): Promise<SelectResult | null> {
  const baseResume: Resume = { ...base, experience: [], projects: [] }
  // Two section headings (Experience, Projects) come out of what's left of the page.
  const entryBudget = Math.max(12, Math.floor(PAGE_LINES - fixedLines(baseResume) - 4))
  const minProjects = Math.min(projects.length, 2)

  // Bullets are numbered so the model can pick them; long ones show their size.
  const bulletList = (bullets: string[]) =>
    bullets
      .slice(0, BULLETS_SHOWN)
      .map((b, j) => {
        const lines = textLines(b)
        return `    {${j}} ${b}${lines > 1 ? ` (${lines} lines)` : ""}`
      })
      .join("\n")

  const expList = experiences
    .map((e, i) => {
      const bullets = bulletList(experienceBullets(e))
      return `[${i}] ${e.position} at ${e.company} (${e.start_date || "?"} – ${e.end_date || "Present"})\n    Technologies: ${(e.technologies || []).join(", ") || "n/a"}${bullets ? `\n${bullets}` : ""}`
    })
    .join("\n\n")

  // Parsed projects often keep their substance in highlights with a blank description,
  // so show both; otherwise every project looks empty next to the experiences.
  const projList = projects
    .map((p, i) => {
      const bullets = bulletList(p.highlights || [])
      return `[${i}] ${p.name}\n    Technologies: ${(p.technologies || []).join(", ") || "n/a"}${p.description ? `\n    ${p.description}` : ""}${bullets ? `\n${bullets}` : ""}`
    })
    .join("\n\n")

  const target = job
    ? `TARGET ROLE: ${job.title || "Software Engineer"} at ${job.company || "the company"}
JOB DESCRIPTION:
${job.description.slice(0, JOB_DESCRIPTION_CHARS)}`
    : `TARGET ROLE: a general software engineering internship (no specific posting). Rank by technical depth, measurable impact and recency.`

  const system = `You are an expert technical recruiter choosing what goes on a ONE-PAGE resume for a student or early-career candidate.
You choose which experiences AND which projects go on the page, and the page has a hard space limit. A strong early-career resume always has a Projects section alongside Experience: projects show hands-on skill with the job's stack even when no job did. Never drop the Projects section when the candidate has projects.
You only choose by index. You never rewrite, merge or add anything.

${RESUME_STANDARD_PROMPT}`

  const prompt = `${target}

CANDIDATE EXPERIENCES (all of them):
${expList || "None listed"}

CANDIDATE PROJECTS (all of them):
${projList || "None listed"}

SPACE BUDGET:
The resume must fit on ONE page. After the header, education, skills and other sections, ${entryBudget} lines are left for experiences and projects together.
Cost: each experience heading = 2 lines, each project heading = 1.5 lines, each bullet = 1 line unless marked "(2 lines)". A project with no bullets shows its description as 1 bullet.
Everything you select must add up to ${entryBudget} lines or less — leaving a few lines spare is better than going over. Fewer, stronger items beat cramming.

SELECTION RULES:
- Select experiences and projects by index, staying within the space budget.${minProjects > 0 ? ` Include at least ${minProjects} project(s); the projects list must not be empty.` : ""}
- For each selected entry, pick its bullets by their {number}: 2–${MAX_EXPERIENCE_BULLETS} per experience and 1–${MAX_PROJECT_BULLETS} per project (all of them if it has fewer). Keep the bullets that best show the ${job ? "job's required skills, technologies and responsibilities" : "candidate's strongest technical work"}, prefer ones with measurable results, and skip near-duplicates. Order them most relevant first. Leave bulletIndices empty for an entry with no bullets.
- Judge each item on its own merits: ${job ? "overlap between its technologies/bullets and the job description" : "technical depth"}, demonstrated impact (metrics, users, scale), and recency.
- A project that uses the ${job ? "job's" : "most in-demand"} languages, frameworks or domain usually beats an unrelated job; it is fine to pick fewer experiences when a project is the stronger evidence.
- If no project is a close match, still include the most technically impressive one(s).
- Order each list from most to least relevant.
- Give one short reason per selected item, experiences first, then projects.`

  // The prompt is the whole question, so it is the key. The limit and the paid
  // request are only spent when the model is actually asked.
  let provider: AiProvider | undefined
  const { value: selection, cached } = await withAiCache<Selection>(userId, "resume_selection", { system, prompt }, async () => {
    const { allowed } = await checkAndIncrementLimit(userId, "tailorResume")
    if (!allowed) throw new SelectionLimitError()
    const resolved = await resolveAiProvider(userId)
    provider = resolved.provider
    const result = await generateObject({ provider: resolved.provider, system, prompt, schema: SelectionSchema, name: "selection", temperature: 0.3 })
    return result.data
  })
  if (!selection) return null

  const pick = (indices: number[], length: number, max: number) =>
    [...new Set(indices)].filter((i) => Number.isInteger(i) && i >= 0 && i < length).slice(0, max)
  const pickEntries = (picks: z.infer<typeof PickSchema>[], length: number) => {
    const seen = new Set<number>()
    return picks.filter((p) => Number.isInteger(p.index) && p.index >= 0 && p.index < length && !seen.has(p.index) && seen.add(p.index)).slice(0, 4)
  }
  const experiencePicks = pickEntries(selection.selectedExperiences, experiences.length)
  const projectPicks = pickEntries(selection.selectedProjects, projects.length)
  // The model sometimes still returns no projects; top up in profile order so the
  // Projects section never silently disappears.
  for (let i = 0; projectPicks.length < minProjects && i < projects.length; i++) {
    if (!projectPicks.some((p) => p.index === i)) projectPicks.push({ index: i, bulletIndices: [] })
  }

  // Chosen bullets go in the model's order; an entry with no valid picks keeps its first bullets.
  const chosenExperience = experiencePicks.map(({ index, bulletIndices }) => {
    const entry = experiences[index]
    const bullets = experienceBullets(entry).slice(0, BULLETS_SHOWN)
    const chosen = pick(bulletIndices, bullets.length, MAX_EXPERIENCE_BULLETS).map((j) => bullets[j])
    return chosen.length ? { ...entry, responsibilities: chosen, achievements: [] } : capExperienceBullets(entry)
  })
  const chosenProjects = projectPicks.map(({ index, bulletIndices }) => {
    const entry = projects[index]
    const bullets = (entry.highlights || []).slice(0, BULLETS_SHOWN)
    const chosen = pick(bulletIndices, bullets.length, MAX_PROJECT_BULLETS).map((j) => bullets[j])
    return chosen.length ? { ...entry, highlights: chosen } : capProjectBullets(entry)
  })

  // Standard dates and order, then the page budget as a backstop for the model's arithmetic.
  const resume = fitToOnePage(normalizeResume({ ...baseResume, experience: chosenExperience, projects: chosenProjects }))
  return { resume, reasoning: selection.selectionReasoning, provider, cached }
}
