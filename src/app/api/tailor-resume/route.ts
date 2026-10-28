import { generateObject, aiErrorMessage } from "@/lib/ai"
import { resolveAiProvider } from "@/lib/ai/resolve"
import { z } from "zod"
import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { checkAndIncrementLimit } from "@/lib/usageLimits"
import type { Resume } from "@/app/api/parse/resumeSchema"
import { getCurrentResumeData, getMasterProfileData } from "@/lib/supabase/user-data"
import {
  PAGE_LINES,
  capExperienceBullets,
  capProjectBullets,
  experienceLines,
  fitToOnePage,
  fixedLines,
  projectLines,
} from "@/lib/resumePageBudget"

const SelectionSchema = z.object({
  selectedExperienceIndices: z
    .array(z.number())
    .describe("0-based indices into the experiences array, most relevant first"),
  selectedProjectIndices: z
    .array(z.number())
    .describe("0-based indices into the projects array, most relevant first. Never empty when the candidate has projects"),
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
    // Bullets are capped up front so the model sees exactly what would go on the page.
    const experiences = (bank.experience?.length ? bank.experience : currentResume?.experience || []).map((e) => capExperienceBullets(e))
    const projects = (bank.projects?.length ? bank.projects : currentResume?.projects || []).map((p) => capProjectBullets(p))

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

    const expList = experiences
      .map((e, i) => {
        const bullets = [...(e.responsibilities || []), ...(e.achievements || [])].map((b) => `    - ${b}`).join("\n")
        return `[${i}] (~${Math.round(experienceLines(e))} lines) ${e.position} at ${e.company} (${e.start_date || "?"} – ${e.end_date || "Present"})\n    Technologies: ${(e.technologies || []).join(", ") || "n/a"}\n${bullets}`
      })
      .join("\n\n")

    // Parsed projects often keep their substance in highlights with a blank description,
    // so show both; otherwise every project looks empty next to the experiences.
    const projList = projects
      .map((p, i) => {
        const bullets = (p.highlights || []).map((h) => `    - ${h}`).join("\n")
        return `[${i}] (~${Math.round(projectLines(p))} lines) ${p.name}\n    Technologies: ${(p.technologies || []).join(", ") || "n/a"}${p.description ? `\n    ${p.description}` : ""}${bullets ? `\n${bullets}` : ""}`
      })
      .join("\n\n")

    const { provider } = await resolveAiProvider(userId)
    const result = await generateObject({
      provider,
      system: `You are an expert technical recruiter tailoring a ONE-PAGE resume for a student or early-career candidate.
You choose which experiences AND which projects go on the page, and the page has a hard space limit. A strong early-career resume always has a Projects section alongside Experience: projects show hands-on skill with the job's stack even when no job did. Never drop the Projects section when the candidate has projects.`,
      prompt: `TARGET ROLE: ${jobTitle || "Software Engineer"} at ${jobCompany || "the company"}
JOB DESCRIPTION:
${jobDescription.slice(0, 1200)}

CANDIDATE EXPERIENCES (all of them):
${expList || "None listed"}

CANDIDATE PROJECTS (all of them):
${projList || "None listed"}

SPACE BUDGET:
The resume must fit on ONE page. After the header, education, skills and other sections, ${entryBudget} lines are left for experiences and projects together. Each item above shows its approximate size, e.g. "(~6 lines)". The sizes of everything you select must add up to ${entryBudget} lines or less — leaving a few lines spare is better than going over. Choosing fewer, stronger items is better than cramming.

SELECTION RULES:
- Select experiences and projects by index, staying within the space budget.${minProjects > 0 ? ` Include at least ${minProjects} project(s); the projects list must not be empty.` : ""}
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
    const experienceIndices = pick(selection.selectedExperienceIndices, experiences.length, 4)
    const projectIndices = pick(selection.selectedProjectIndices, projects.length, 4)
    // The model sometimes still returns no projects; top up in profile order so the
    // Projects section never silently disappears.
    for (let i = 0; projectIndices.length < minProjects && i < projects.length; i++) {
      if (!projectIndices.includes(i)) projectIndices.push(i)
    }

    // The model's arithmetic is approximate, so trim to the page budget as a backstop.
    const tailoredResume = fitToOnePage({
      ...baseResume,
      experience: experienceIndices.map((i) => experiences[i]),
      projects: projectIndices.map((i) => projects[i]),
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
