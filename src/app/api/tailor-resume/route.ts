import { aiErrorMessage } from "@/lib/ai"
import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import type { Resume } from "@/app/api/parse/resumeSchema"
import { getCurrentResumeData, getMasterProfileData } from "@/lib/supabase/user-data"
import { SelectionLimitError, selectForRole } from "@/lib/resume/select"

/**
 * A one-page resume for one job, chosen from the master profile. The choosing
 * lives in `selectForRole`, shared with the general resume on /profile; the
 * same posting against the same profile is served from the AI cache.
 */

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    const { jobTitle, jobDescription, jobCompany } = await request.json()
    if (!jobDescription?.trim()) {
      return NextResponse.json({ success: false, error: "No job description provided" }, { status: 400 })
    }

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
    const base: Resume = {
      ...bank,
      basics: currentResume?.basics ?? bank.basics,
      education: currentResume?.education ?? bank.education,
    }

    const selected = await selectForRole({
      userId,
      base,
      experiences,
      projects,
      job: { title: jobTitle, company: jobCompany, description: jobDescription },
    })
    if (!selected) return NextResponse.json({ success: false, error: "Selection failed" }, { status: 500 })

    const tailoredResume = selected.resume
    return NextResponse.json({
      success: true,
      aiProvider: selected.provider,
      cached: selected.cached,
      data: {
        tailoredResume,
        reasoning: selected.reasoning,
        selected: {
          experiences: tailoredResume.experience.map((e) => e.company + " – " + e.position),
          projects: tailoredResume.projects.map((p) => p.name),
        },
      },
    })
  } catch (error) {
    if (error instanceof SelectionLimitError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 429 })
    }
    console.error("tailor-resume error:", error)
    return NextResponse.json({ success: false, error: aiErrorMessage(error, "Failed to tailor resume") }, { status: 500 })
  }
}
