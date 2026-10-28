import { generateObject, aiErrorMessage } from "@/lib/ai"
import { resolveAiProvider } from "@/lib/ai/resolve"
import { z } from "zod"
import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { checkAndIncrementLimit } from "@/lib/usageLimits"
import type { Resume } from "@/app/api/parse/resumeSchema"
import { getCurrentResumeData, getMasterProfileData } from "@/lib/supabase/user-data"
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

// Long postings put requirements well past the opening paragraphs.
const JOB_DESCRIPTION_CHARS = 4000
// Bullets shown per entry; profiles merged from several uploads can carry many.
const BULLETS_SHOWN = 10

const PickSchema = z.object({
  index: z.number().describe("0-based index of the entry"),
  bulletIndices: z.array(z.number()).describe("0-based indices of this entry's bullets to keep, most relevant first"),
})

const SelectionSchema = z.object({
  selectedExperiences: z
    .array(PickSchema)
    .describe("Experiences to include, most relevant first"),
  selectedProjects: z
    .array(PickSchema)
    .describe("Projects to include, most relevant first. Never empty when the candidate has projects"),
  selectionReasoning: z
    .array(z.string())
    .describe("One short sentence per selected item explaining why it was chosen for this role"),
})

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    const { jobTitle, jobDescription, jobCompany } = await request.json()
    if (!jobDescription?.trim()) {
      return NextResponse.json({ success: false, error: "No job description provided" }, { status: 400 })
    }

    const { allowed, remaining } = await checkAndIncrementLimit(userId, "tailorResume")
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: "Daily tailor resume limit reached (10/day). Try again tomorrow." },
        { status: 429 }
      )
    }
    void remaining

    // Master profile is the bank of all experiences; current resume has latest basics/education
    const [masterProfile, currentResume] = await Promise.all([
      getMasterProfileData(userId),
      getCurrentResumeData(userId),
    ])

    const bank = masterProfile || currentResume
    if (!bank) {
      return NextResponse.json({ success: false, error: "No resume data found. Upload a resume first." }, { status: 400 })
    }

    // A master profile can be missing a section the latest resume has (e.g. its project
    // items were never verified), so fall back per section rather than per document.
    const experiences = bank.experience?.length ? bank.experience : currentResume?.experience || []
    const projects = bank.projects?.length ? bank.projects : currentResume?.projects || []

    // Everything but experience and projects: latest basics + education, the bank's other sections.
    const baseResume: Resume = {
      ...bank,
      basics: currentResume?.basics ?? bank.basics,
      education: currentResume?.education ?? bank.education,
      experience: [],
      projects: [],
    }
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

    const { provider } = await resolveAiProvider(userId)
    const result = await generateObject({
      provider,
      system: `You are an expert technical recruiter tailoring a ONE-PAGE resume for a student or early-career candidate.
You choose which experiences AND which projects go on the page, and the page has a hard space limit. A strong early-career resume always has a Projects section alongside Experience: projects show hands-on skill with the job's stack even when no job did. Never drop the Projects section when the candidate has projects.`,
      prompt: `TARGET ROLE: ${jobTitle || "Software Engineer"} at ${jobCompany || "the company"}
JOB DESCRIPTION:
${jobDescription.slice(0, JOB_DESCRIPTION_CHARS)}

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
- For each selected entry, pick its bullets by their {number}: 2–${MAX_EXPERIENCE_BULLETS} per experience and 1–${MAX_PROJECT_BULLETS} per project (all of them if it has fewer). Keep the bullets that best show the job's required skills, technologies and responsibilities, prefer ones with measurable results, and skip near-duplicates. Order them most relevant first. Leave bulletIndices empty for an entry with no bullets.
- Judge each item on its own merits: overlap between its technologies/bullets and the job description, demonstrated impact (metrics, users, scale), and recency.
- A project that uses the job's languages, frameworks or domain usually beats an unrelated job; it is fine to pick fewer experiences when a project is the stronger evidence.
- If no project is a close match, still include the most technically impressive one(s).
- Order each list from most to least relevant.
- Give one short reason per selected item, experiences first, then projects.`,
      schema: SelectionSchema,
      name: "selection",
      temperature: 0.3,
    })

    const selection = result.data
    if (!selection) return NextResponse.json({ success: false, error: "Selection failed" }, { status: 500 })

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
    const tailoredExperience = experiencePicks.map(({ index, bulletIndices }) => {
      const entry = experiences[index]
      const bullets = experienceBullets(entry).slice(0, BULLETS_SHOWN)
      const chosen = pick(bulletIndices, bullets.length, MAX_EXPERIENCE_BULLETS).map((j) => bullets[j])
      return chosen.length ? { ...entry, responsibilities: chosen, achievements: [] } : capExperienceBullets(entry)
    })
    const tailoredProjects = projectPicks.map(({ index, bulletIndices }) => {
      const entry = projects[index]
      const bullets = (entry.highlights || []).slice(0, BULLETS_SHOWN)
      const chosen = pick(bulletIndices, bullets.length, MAX_PROJECT_BULLETS).map((j) => bullets[j])
      return chosen.length ? { ...entry, highlights: chosen } : capProjectBullets(entry)
    })

    // The model's arithmetic is approximate, so trim to the page budget as a backstop.
    const tailoredResume = fitToOnePage({
      ...baseResume,
      experience: tailoredExperience,
      projects: tailoredProjects,
    })

    return NextResponse.json({
      success: true,
      aiProvider: provider,
      data: {
        tailoredResume,
        reasoning: selection.selectionReasoning,
        selected: {
          experiences: tailoredResume.experience.map((e) => e.company + " – " + e.position),
          projects: tailoredResume.projects.map((p) => p.name),
        },
      },
    })
  } catch (error) {
    console.error("tailor-resume error:", error)
    return NextResponse.json({ success: false, error: aiErrorMessage(error, "Failed to tailor resume") }, { status: 500 })
  }
}
