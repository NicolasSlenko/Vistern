import { embed, generateObject, type AiProvider } from "@/lib/ai"
import { resolveAiProvider } from "@/lib/ai/resolve"
import { z } from "zod"
import { type NextResponse as NR, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getCurrentResumeData, getUserPreferences } from "@/lib/supabase/user-data"
import { searchSimilarDocuments } from "@/lib/vectorSearch"
import { checkAndIncrementLimit } from "@/lib/usageLimits"
import type { Resume } from "@/app/api/parse/resumeSchema"
import { allowedLevels, keepListing } from "@/lib/jobs/listing-filter"
import { dedupeJobs, fetchAdzunaJobs, fetchMuseJobs, type AdzunaJob } from "@/lib/jobs/sources"

const CACHE_TTL_MS = 24 * 60 * 60 * 1000
const liveJobsCache = new Map<string, CachedLiveJobs>()

const CompareResultSchema = z.object({
  overallMatch: z.number().describe("0-100 overall alignment score"),
  breakdown: z.object({
    skillsMatch: z.number().describe("0-100 skills alignment"),
    experienceMatch: z.number().describe("0-100 experience alignment"),
    educationMatch: z.number().describe("0-100 education alignment"),
  }),
  strengths: z.array(z.string()).describe("3-5 specific strengths the candidate brings to this role"),
  gaps: z.array(z.string()).describe("2-4 specific gaps between resume and job requirements"),
  recommendations: z.array(z.string()).describe("3-5 actionable steps to improve alignment"),
})

export interface LiveJob {
  id: string
  title: string
  company: string
  location: string
  description: string
  salaryMin?: number
  salaryMax?: number
  applyUrl: string
  contractType?: string
  created: string
  matchScore: number
  analysis: {
    breakdown: { skillsMatch: number; experienceMatch: number; educationMatch: number }
    strengths: string[]
    gaps: string[]
    recommendations: string[]
  }
}

interface CachedLiveJobs {
  jobs: LiveJob[]
  cachedAt: number
  /** The preferences these were found for: changing them means a new search. */
  prefsKey?: string
}

const prefsKeyOf = (prefs: Record<string, string[]> | null) =>
  JSON.stringify(["roleTypes", "jobType", "experienceLevel", "location", "workEnvironment", "degreeLevel"].map((key) => prefs?.[key] ?? []))

function buildResumeSummary(resume: Resume): string {
  const skills = resume.skills
    ? Object.entries(resume.skills)
        .map(([cat, items]) => `${cat}: ${Array.isArray(items) ? items.join(", ") : ""}`)
        .join("; ")
    : ""
  const projects = (resume.projects || [])
    .map(p => `${p.name} [${(p.technologies || []).join(", ")}]: ${p.description || ""}`)
    .join(". ")
  const experience = (resume.experience || [])
    .map(e => {
      const bullets = [...(e.responsibilities || []), ...(e.achievements || [])].slice(0, 2).join("; ")
      return `${e.position} at ${e.company}: ${bullets}`
    })
    .join(". ")
  const education = (resume.education || [])
    .map(e => `${e.degree} in ${e.field} at ${e.school}${e.gpa ? ` GPA ${e.gpa}` : ""}`)
    .join("; ")
  return `SKILLS: ${skills}\n\nPROJECTS: ${projects}\n\nEXPERIENCE: ${experience}\n\nEDUCATION: ${education}`.trim()
}

async function analyzeJobFit(
  provider: AiProvider,
  resumeSummary: string,
  job: AdzunaJob,
  degreeLevel: string[] = [],
  seeking: string[] = []
): Promise<z.infer<typeof CompareResultSchema>> {
  const degreeLine = degreeLevel.length && !degreeLevel.includes("No Preference")
    ? `\nCANDIDATE DEGREE LEVEL: ${degreeLevel.join(", ")} — factor this into the education alignment score.`
    : ""
  const seekingLine = seeking.length
    ? `\nTHE CANDIDATE IS A STUDENT LOOKING FOR: ${seeking.join(", ")}. Judge experience against what this level of role expects, not against a senior hire.`
    : ""
  const result = await generateObject({
    provider,
    system: `You are a strict, honest technical recruiter. Score how well this candidate matches the job.${degreeLine}${seekingLine}

SCORING CALIBRATION — do not inflate scores:
- 80-100: Near-perfect fit. Candidate has nearly all required skills AND relevant experience.
- 65-79: Good fit. Most hard requirements met, only minor gaps.
- 50-64: Moderate fit. Core skills present but notable gaps in key requirements.
- 35-49: Partial fit. Some relevant skills but missing several important requirements.
- Below 35: Poor fit. Most critical requirements are missing.

Most candidates score 40-65. A score above 75 is rare and must be fully justified.
Always identify at least 2 concrete gaps even for strong candidates. Be specific — name exact missing tools, frameworks, or experience types.`,
    prompt: `Evaluate this candidate for the job below.

=== CANDIDATE RESUME ===
${resumeSummary}

=== JOB POSTING ===
Title: ${job.title}
Company: ${job.company.display_name}
${job.description.slice(0, 900)}`,
    schema: CompareResultSchema,
    name: "job_match",
    temperature: 0.2,
  })
  return result.data!
}

export async function GET(): Promise<NR> {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    const cached = liveJobsCache.get(userId)
    const prefsKey = cached ? prefsKeyOf(await getUserPreferences(userId)) : null
    if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS && cached.prefsKey === prefsKey) {
      return NextResponse.json({ success: true, data: cached })
    }
    return NextResponse.json({ success: false, data: null })
  } catch {
    return NextResponse.json({ success: false, data: null })
  }
}

export async function POST(): Promise<NR> {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    const { allowed } = await checkAndIncrementLimit(userId, "analyzeMatch")
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: "Daily analyze match limit reached (10/day). Try again tomorrow." },
        { status: 429 }
      )
    }

    const [resume, prefs] = await Promise.all([
      getCurrentResumeData(userId),
      getUserPreferences(userId),
    ])
    if (!resume) {
      return NextResponse.json({ success: false, error: "No resume found. Upload a resume first." }, { status: 400 })
    }

    if (!prefs?.roleTypes?.length) {
      return NextResponse.json(
        { success: false, error: "No preferences found. Complete the questionnaire first." },
        { status: 400 }
      )
    }

    const isRemote = (prefs.workEnvironment || []).some(e => (e || "").toLowerCase().includes("remote")) ||
      (prefs.location || []).includes("Remote (Anywhere)")

    const levels = allowedLevels(prefs)
    const [adzunaJobs, museJobs] = await Promise.all([
      fetchAdzunaJobs(prefs),
      fetchMuseJobs(prefs.roleTypes || [], isRemote, levels),
    ])
    // The boards' own filters are loose; every listing is checked against
    // the level asked for before anything is ranked or scored.
    const allJobs = dedupeJobs([...adzunaJobs, ...museJobs]).filter(job => keepListing(job.title, job.description, levels))
    if (allJobs.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: levels.has("intern") && levels.size === 1
            ? "No internship listings found right now. Try more role types or locations in your preferences."
            : "No listings found for your preferences. Try adjusting your questionnaire.",
        },
        { status: 404 }
      )
    }

    const resumeSummary = buildResumeSummary(resume)

    // Stage 1: embed the resume and jobs in one request, then rank the top 10.
    const jobTexts = allJobs.map(j =>
      `${j.title} at ${j.company.display_name}. ${j.description.slice(0, 600)}`.replace(/\n/g, " ")
    )
    const vectors = await embed([resumeSummary.replace(/\n/g, " "), ...jobTexts])
    const resumeVector = vectors[0]
    const jobDocs = allJobs.map((job, i) => ({ id: job.id, vector: vectors[i + 1], job }))
    const topMatches = searchSimilarDocuments(resumeVector, jobDocs, 10)

    // Stage 2: run LLM analysis on top 10 in parallel — strengths/gaps inform the final score.
    // Resolved once, so the 10 calls count as a single paid request.
    const { provider } = await resolveAiProvider(userId)
    const analysisResults = await Promise.allSettled(
      topMatches.map(m => analyzeJobFit(provider, resumeSummary, m.job, prefs.degreeLevel || [], prefs.jobType || []))
    )
    // A failed analysis falls back to the similarity score below; log why so it isn't silent.
    analysisResults.forEach((result, i) => {
      if (result.status === "rejected") {
        console.error(`match-live: fit analysis failed for "${topMatches[i].job.title}":`, result.reason)
      }
    })

    const liveJobs: LiveJob[] = topMatches.map((match, i) => {
      const ar = analysisResults[i]
      const analysis =
        ar.status === "fulfilled" && ar.value
          ? ar.value
          : {
              overallMatch: Math.round(match.similarity * 100),
              breakdown: { skillsMatch: 0, experienceMatch: 0, educationMatch: 0 },
              strengths: [],
              gaps: [],
              recommendations: [],
            }
      return {
        id: match.job.id,
        title: match.job.title,
        company: match.job.company.display_name,
        location: match.job.location.display_name,
        description: match.job.description.slice(0, 500),
        salaryMin: match.job.salary_min,
        salaryMax: match.job.salary_max,
        applyUrl: match.job.redirect_url,
        contractType: match.job.contract_type,
        created: match.job.created,
        matchScore: analysis.overallMatch,
        analysis: {
          breakdown: analysis.breakdown,
          strengths: analysis.strengths,
          gaps: analysis.gaps,
          recommendations: analysis.recommendations,
        },
      }
    })

    // Sort by matchScore (LLM score) descending
    liveJobs.sort((a, b) => b.matchScore - a.matchScore)

    const result: CachedLiveJobs = { jobs: liveJobs, cachedAt: Date.now(), prefsKey: prefsKeyOf(prefs) }
    liveJobsCache.set(userId, result)
    return NextResponse.json({ success: true, data: result, aiProvider: provider })
  } catch (error) {
    console.error("match-live error:", error)
    const message = error instanceof Error ? error.message : "Failed to fetch live jobs"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
