import { OpenAI } from "openai"
import { z } from "zod"
import { zodTextFormat } from "openai/helpers/zod.mjs"
import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import type { Resume } from "@/app/api/parse/resumeSchema"
import { createClerkSupabaseServerClient } from "@/lib/supabase/server"
import { BULLET_FIELDS, type BulletRewrite, type BulletSection } from "@/lib/resume-suggestions"
import type { Json } from "@/lib/supabase/database.types"

/**
 * Line-level rewrites: for each weak bullet, the exact words to put there
 * instead, and one sentence on why. The studio shows these over the bullet
 * itself with a tick and a cross, so a student answers one line at a time
 * rather than reading a list of advice and doing the work by hand.
 *
 * This is deliberately narrower than /api/analyze/xyz-batch, which scores
 * whole entries and plans a career. Here: one bullet in, one bullet out.
 */

const MODEL = "gpt-4.1-mini"
const FEEDBACK_TYPE = "bullets"

const RewriteSchema = z.object({
  section: z.enum(["experience", "projects"]),
  entryIndex: z.number().int().describe("The entry's index, exactly as given in the prompt"),
  field: z.enum(["responsibilities", "achievements", "highlights"]),
  bulletIndex: z.number().int().describe("The bullet's index within that field, exactly as given"),
  original: z.string().describe("The bullet's current words, copied exactly, so the edit can be matched back"),
  suggested: z.string().describe("The replacement bullet. One line. Starts with a strong past-tense verb, carries a number where one is honest."),
  why: z.string().describe("One short sentence on what the rewrite fixes. No preamble."),
  severity: z.enum(["fix", "look", "optional"]),
})

const ResultSchema = z.object({
  rewrites: z.array(RewriteSchema).describe("One entry per bullet worth changing. Leave strong bullets alone."),
})

const SYSTEM = `You rewrite resume bullets for undergraduate computer science students.

Rules:
- Rewrite only bullets that are genuinely weak. A bullet that already names a technique and a measured result is fine — leave it out.
- Every rewrite is ONE line, starts with a past-tense verb, and follows "accomplished X, measured by Y, by doing Z".
- NEVER invent numbers, employers, technologies or scope the student did not state. If a bullet has no number and you cannot infer one honestly, improve the verb and the specificity instead, and say in "why" that a number would make it stronger.
- "original" must be copied character for character from the bullet you were given.
- "why" is one sentence, plain, no flattery, no "consider".
- severity: "fix" for a bullet that says nothing (duties, "worked on", "helped with"); "look" for a real bullet missing impact; "optional" for polish.`

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    const { resumeData, resumeDocumentId } = (await request.json()) as {
      resumeData?: Resume
      resumeDocumentId?: string
    }
    if (!resumeData) return NextResponse.json({ success: false, error: "No resume data provided" }, { status: 400 })

    // Every bullet, labelled with the coordinates the model must echo back.
    const lines: string[] = []
    for (const section of Object.keys(BULLET_FIELDS) as BulletSection[]) {
      const entries = (resumeData[section] ?? []) as Record<string, unknown>[]
      entries.forEach((entry, entryIndex) => {
        const name =
          section === "experience"
            ? `${entry.position || "Role"} at ${entry.company || "a company"}`
            : String(entry.name || "Project")
        const entryLines: string[] = []
        for (const field of BULLET_FIELDS[section]) {
          const bullets = Array.isArray(entry[field]) ? (entry[field] as unknown[]) : []
          bullets.forEach((bullet, bulletIndex) => {
            if (typeof bullet !== "string" || !bullet.trim()) return
            entryLines.push(`  [${section} ${entryIndex} ${field} ${bulletIndex}] ${bullet}`)
          })
        }
        if (entryLines.length) lines.push(`${section.toUpperCase()} ${entryIndex} — ${name}\n${entryLines.join("\n")}`)
      })
    }

    if (lines.length === 0) {
      const empty = { rewrites: [], generatedAt: new Date().toISOString() }
      return NextResponse.json({ success: true, data: empty })
    }

    const client = new OpenAI()
    const result = await client.responses.parse({
      model: MODEL,
      input: [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content: `Rewrite the weak bullets below. Each is tagged [section entryIndex field bulletIndex] — echo those back exactly.\n\n${lines.join("\n\n")}`,
        },
      ],
      text: { format: zodTextFormat(ResultSchema, "bullet_rewrites") },
      temperature: 0.3,
    })

    const rewrites: BulletRewrite[] = (result.output_parsed?.rewrites ?? []).map((rewrite, index) => ({
      ...rewrite,
      // The model reuses ids across runs; the index and the clock make one that doesn't collide.
      id: `${rewrite.section}-${rewrite.entryIndex}-${rewrite.field}-${rewrite.bulletIndex}-${index}`,
    }))
    const data = { rewrites, generatedAt: new Date().toISOString() }

    await cacheReview(userId, resumeDocumentId, data)
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Error rewriting bullets:", error)
    return NextResponse.json({ success: false, error: "Failed to review the bullets" }, { status: 500 })
  }
}

/** The rewrites last generated for a resume, so reopening it doesn't pay for the model again. */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    const documentId = request.nextUrl.searchParams.get("resumeDocumentId")
    const supabase = await createClerkSupabaseServerClient()
    const id = documentId ?? (await currentDocumentId(supabase, userId))
    if (!id) return NextResponse.json({ success: true, data: null })

    const { data, error } = await supabase
      .from("resume_feedback")
      .select("result")
      .eq("clerk_user_id", userId)
      .eq("resume_document_id", id)
      .eq("feedback_type", FEEDBACK_TYPE)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) throw error
    return NextResponse.json({ success: true, data: data?.result ?? null })
  } catch (error) {
    console.error("Error reading cached bullet rewrites:", error)
    return NextResponse.json({ success: true, data: null })
  }
}

async function currentDocumentId(
  supabase: Awaited<ReturnType<typeof createClerkSupabaseServerClient>>,
  userId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("resume_documents")
    .select("id")
    .eq("clerk_user_id", userId)
    .eq("is_current", true)
    .maybeSingle()
  return data?.id ?? null
}

/** Caching is best-effort: a student who has no resume document yet still gets their rewrites. */
async function cacheReview(userId: string, documentId: string | undefined, data: unknown) {
  try {
    const supabase = await createClerkSupabaseServerClient()
    const id = documentId ?? (await currentDocumentId(supabase, userId))
    if (!id) return
    await supabase.from("resume_feedback").insert({
      clerk_user_id: userId,
      resume_document_id: id,
      feedback_type: FEEDBACK_TYPE,
      result: data as Json,
    })
  } catch (error) {
    console.error("Couldn't cache bullet rewrites:", error)
  }
}
