import { createHash } from "node:crypto"
import { createClerkSupabaseServerClient } from "@/lib/supabase/server"
import type { Json } from "@/lib/supabase/database.types"

const FEEDBACK_TYPE = "live_jobs"
export const LIVE_JOBS_TTL_MS = 24 * 60 * 60 * 1000

export interface LiveJobsCacheEntry<T> {
  jobs: T[]
  cachedAt: number
  /** The preferences these were found for: changing them means a new search. */
  prefsKey: string
  /** The resume they were scored against: editing it means a new analysis. */
  resumeKey: string
}

/** The current resume's id and a fingerprint of its content, or null if there is none. */
async function currentResume(userId: string) {
  const supabase = await createClerkSupabaseServerClient()
  const { data, error } = await supabase
    .from("resume_documents")
    .select("id,structured_content")
    .eq("clerk_user_id", userId)
    .eq("is_current", true)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  const resumeKey = createHash("sha1").update(JSON.stringify(data.structured_content ?? null)).digest("hex")
  return { supabase, id: data.id, resumeKey }
}

/** Live matches found for this resume and these preferences within the last day, if any. */
export async function readLiveJobsCache<T>(userId: string, prefsKey: string): Promise<LiveJobsCacheEntry<T> | null> {
  const resume = await currentResume(userId)
  if (!resume) return null
  const { data, error } = await resume.supabase
    .from("resume_feedback")
    .select("result")
    .eq("clerk_user_id", userId)
    .eq("resume_document_id", resume.id)
    .eq("feedback_type", FEEDBACK_TYPE)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  const entry = data?.result as unknown as LiveJobsCacheEntry<T> | undefined
  if (!entry || !Array.isArray(entry.jobs)) return null
  const fresh = Date.now() - entry.cachedAt < LIVE_JOBS_TTL_MS
  return fresh && entry.prefsKey === prefsKey && entry.resumeKey === resume.resumeKey ? entry : null
}

/** Keeps the newest result only, so the table doesn't grow with every refresh. Never throws: a missed save just means a fresh search next time. */
export async function writeLiveJobsCache<T>(userId: string, jobs: T[], prefsKey: string): Promise<LiveJobsCacheEntry<T> | null> {
  try {
    const resume = await currentResume(userId)
    if (!resume) return null
    const entry: LiveJobsCacheEntry<T> = { jobs, cachedAt: Date.now(), prefsKey, resumeKey: resume.resumeKey }
    await resume.supabase
      .from("resume_feedback")
      .delete()
      .eq("clerk_user_id", userId)
      .eq("resume_document_id", resume.id)
      .eq("feedback_type", FEEDBACK_TYPE)
    const { error } = await resume.supabase.from("resume_feedback").insert({
      clerk_user_id: userId,
      resume_document_id: resume.id,
      feedback_type: FEEDBACK_TYPE,
      result: entry as unknown as Json,
    })
    if (error) throw error
    return entry
  } catch (error) {
    console.error("Couldn't cache live job matches:", error)
    return null
  }
}
