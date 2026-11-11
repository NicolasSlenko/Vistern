import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { z } from "zod"
import { generateObject, aiErrorMessage } from "@/lib/ai"
import { resolveAiProvider } from "@/lib/ai/resolve"
import { withAiCache } from "@/lib/ai/cache"
import {
  BULLET_WRITING_SYSTEM,
  DraftResultSchema,
  FixResultSchema,
  WRITABLE_SECTIONS,
  buildDraftPrompt,
  buildFixPrompt,
  cleanOptions,
} from "@/lib/bullet-writing"

/**
 * Three AI-written options for a bullet, for the student to choose between.
 *
 * - mode "fix": rewrite one existing bullet (optionally with extra context the
 *   student added, and avoiding options they've already seen).
 * - mode "draft": write the bullets of a new entry from the walkthrough's
 *   guided answers, three versions each.
 *
 * Nothing is saved here: the student picks, edits and saves in the studio.
 */

const Section = z.enum(WRITABLE_SECTIONS as [string, ...string[]])
const Entry = z.record(z.string(), z.unknown())

const RequestSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("fix"),
    section: Section,
    entry: Entry,
    bullet: z.string().min(1),
    context: z.string().max(1000).optional(),
    avoid: z.array(z.string()).max(12).optional(),
  }),
  z.object({
    mode: z.literal("draft"),
    section: Section,
    entry: Entry,
    answers: z.object({ what: z.string().max(2000), problem: z.string().max(1000), result: z.string().max(1000) }),
    count: z.number().int().min(1).max(5),
  }),
])

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    const parsed = RequestSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 })
    }
    const body = parsed.data
    const section = body.section as (typeof WRITABLE_SECTIONS)[number]

    // The prompt is the whole question, so it is the cache key. "More options" sends
    // the ones already seen as `avoid`, which changes the prompt, so it is never
    // served a repeat. The provider is resolved only on a miss.
    const ask = async <T extends z.ZodTypeAny>(name: string, prompt: string, schema: T) =>
      withAiCache(userId, name, { prompt }, async () => {
        const { provider } = await resolveAiProvider(userId)
        const result = await generateObject({ provider, system: BULLET_WRITING_SYSTEM, prompt, schema, name, temperature: 0.7 })
        return result.data as z.infer<T> | null
      }, { ttlDays: 7 })

    if (body.mode === "fix") {
      const prompt = buildFixPrompt({ section, entry: body.entry, bullet: body.bullet, context: body.context, avoid: body.avoid })
      const { value, cached } = await ask("bullet_options", prompt, FixResultSchema)
      const options = cleanOptions(value?.options)
      if (options.length === 0) throw new Error("The AI returned no options")
      return NextResponse.json({ success: true, data: { options }, cached })
    }

    const prompt = buildDraftPrompt({ section, entry: body.entry, answers: body.answers, count: body.count })
    const { value, cached } = await ask("bullet_draft", prompt, DraftResultSchema)
    const bullets = (value?.bullets ?? [])
      .map((bullet) => ({ options: cleanOptions(bullet.options) }))
      .filter((bullet) => bullet.options.length > 0)
      .slice(0, body.count)
    if (bullets.length === 0) throw new Error("The AI returned no bullets")
    return NextResponse.json({ success: true, data: { bullets }, cached })
  } catch (error) {
    console.error("Error writing bullet options:", error)
    return NextResponse.json({ success: false, error: aiErrorMessage(error, "The AI couldn't write options this time. Try again.") }, { status: 500 })
  }
}
