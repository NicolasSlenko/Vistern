import "server-only"
import { currentUser } from "@clerk/nextjs/server"
import { createClerkSupabaseServerClient } from "@/lib/supabase/server"
import type { Json } from "@/lib/supabase/database.types"
import { resumeFromProfileItems } from "@/lib/profile/profile-data"
import type { Resume } from "@/app/api/parse/resumeSchema"
import { readStudentProfile } from "@/lib/student-profile-store"
import {
  cardSource,
  pickCard,
  publicCardSchema,
  readSharing,
  type CardSource,
  type PublicCard,
  type Sharing,
} from "./public-card"

export interface DirectoryEntry {
  id: string
  card: PublicCard
  updatedAt: string
  mine: boolean
}

/** Everything the signed-in student could share, read from their own tables. */
export async function loadCardSource(userId: string): Promise<CardSource> {
  const supabase = await createClerkSupabaseServerClient()
  const [{ data: profile, error }, onboarding, account] = await Promise.all([
    supabase.from("student_profiles").select("id, basics").eq("clerk_user_id", userId).maybeSingle(),
    readStudentProfile(userId).catch(() => null),
    currentUser().catch(() => null),
  ])
  if (error) throw error

  let resume: Resume | null = null
  if (profile) {
    const { data: rows, error: itemsError } = await supabase
      .from("profile_items")
      .select("item_type, title, content, sort_order")
      .eq("profile_id", profile.id)
      .eq("clerk_user_id", userId)
      .neq("verification_status", "archived")
      .order("item_type")
      .order("sort_order")
    if (itemsError) throw itemsError
    resume = resumeFromProfileItems(profile.basics, rows ?? [])
  }

  return cardSource(resume, onboarding, {
    firstName: account?.firstName,
    lastName: account?.lastName,
    imageUrl: account?.imageUrl,
    hasImage: account?.hasImage,
  })
}

export async function readMySharing(userId: string): Promise<{ sharing: Sharing; card: PublicCard | null }> {
  const supabase = await createClerkSupabaseServerClient()
  const { data, error } = await supabase
    .from("public_profiles")
    .select("sharing, card")
    .eq("clerk_user_id", userId)
    .maybeSingle()
  if (error) throw error
  const card = publicCardSchema.safeParse(data?.card)
  return { sharing: readSharing(data?.sharing), card: card.success ? card.data : null }
}

/**
 * Store the student's choices and the card they produce. Without a name the
 * card can't be listed, whatever the switch says.
 */
export async function saveMySharing(userId: string, sharing: Sharing, source?: CardSource) {
  const card = pickCard(source ?? (await loadCardSource(userId)), sharing)
  const listed = sharing.listed && card !== null
  const supabase = await createClerkSupabaseServerClient()
  const { error } = await supabase.from("public_profiles").upsert(
    {
      clerk_user_id: userId,
      listed,
      sharing: { ...sharing, listed } as unknown as Json,
      card: (card ?? {}) as unknown as Json,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "clerk_user_id" },
  )
  if (error) throw error
  return { sharing: { ...sharing, listed }, card }
}

/**
 * Rebuild a student's card from their profile as it is now, so an edit to the
 * profile (a new role, a removed link) reaches the directory. Only for a
 * student who has a card; best effort, since it rides along on other saves.
 */
export async function refreshMyCard(userId: string) {
  try {
    const supabase = await createClerkSupabaseServerClient()
    const { data, error } = await supabase.from("public_profiles").select("sharing, card").eq("clerk_user_id", userId).maybeSingle()
    if (error) throw error
    if (!data) return
    const sharing = readSharing(data.sharing)
    const source = await loadCardSource(userId)
    const next = pickCard(source, sharing)
    if (JSON.stringify(next ?? {}) === JSON.stringify(data.card ?? {})) return
    await saveMySharing(userId, sharing, source)
  } catch (error) {
    console.error("[people] card refresh failed:", error instanceof Error ? error.message : error)
  }
}

/** The listed cards, newest first. RLS returns only listed rows, plus the reader's own. */
export async function listDirectory(userId: string, limit = 300): Promise<DirectoryEntry[]> {
  const supabase = await createClerkSupabaseServerClient()
  const { data, error } = await supabase
    .from("public_profiles")
    .select("id, clerk_user_id, card, updated_at")
    .eq("listed", true)
    .order("updated_at", { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []).flatMap((row) => {
    const card = publicCardSchema.safeParse(row.card)
    return card.success ? [{ id: row.id, card: card.data, updatedAt: row.updated_at, mine: row.clerk_user_id === userId }] : []
  })
}
