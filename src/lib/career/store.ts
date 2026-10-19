import "server-only"
import { getJsonFromS3 } from "@/lib/aws/s3"
import { createClerkSupabaseServerClient } from "@/lib/supabase/server"
import { hasImportedLegacyDataset, markLegacyDatasetImported } from "@/lib/supabase/legacy-import"
import type { Json } from "@/lib/supabase/database.types"
import { workspaceSchema, WorkspaceConflict, type CareerWorkspace } from "./workspace"

const conflictMessage = "Your plan changed in another window. Reload it before saving."
const emptyWorkspace = () => workspaceSchema.parse({})
const legacyKey = (userId: string) => `uploads/${userId}/career-workspace.json`

function canReadLegacyS3() {
  return Boolean(process.env.AWS_BUCKET_NAME && process.env.IAM_AWS_ACCESS_KEY && process.env.IAM_AWS_SECRET_ACCESS_KEY)
}

export async function readCareerWorkspace(userId: string) {
  const supabase = await createClerkSupabaseServerClient()
  const { data: row, error } = await supabase.from("career_workspaces")
    .select("data,revision")
    .eq("clerk_user_id", userId)
    .maybeSingle()
  if (error) throw error
  if (row) {
    const data = workspaceSchema.parse(row.data)
    if (data.revision !== row.revision) throw new Error("Career workspace revision mismatch")
    return { data, etag: String(row.revision) }
  }

  if (await hasImportedLegacyDataset(supabase, userId, "career_workspace") || !canReadLegacyS3())
    return { data: emptyWorkspace(), etag: null }

  const legacy = await getJsonFromS3<unknown>(legacyKey(userId))
  if (!legacy) {
    await markLegacyDatasetImported(supabase, userId, "career_workspace", 0)
    return { data: emptyWorkspace(), etag: null }
  }
  const data = workspaceSchema.parse(legacy)
  const { error: insertError } = await supabase.from("career_workspaces").insert({
    clerk_user_id: userId,
    revision: data.revision,
    data: data as unknown as Json,
  })
  if (insertError && insertError.code !== "23505") throw insertError
  await markLegacyDatasetImported(supabase, userId, "career_workspace", 1)
  if (insertError) return readCareerWorkspace(userId)
  return { data, etag: String(data.revision) }
}

export async function writeCareerWorkspace(
  userId: string,
  data: CareerWorkspace,
  etag: string | null,
) {
  const supabase = await createClerkSupabaseServerClient()
  const workspace = workspaceSchema.parse(data)
  if (etag === null) {
    const { error } = await supabase.from("career_workspaces").insert({
      clerk_user_id: userId,
      revision: workspace.revision,
      data: workspace as unknown as Json,
    })
    if (error?.code === "23505") throw new WorkspaceConflict(conflictMessage)
    if (error) throw error
    return
  }

  const expectedRevision = Number(etag)
  if (!Number.isSafeInteger(expectedRevision) || workspace.revision !== expectedRevision + 1)
    throw new WorkspaceConflict(conflictMessage)
  const { data: updated, error } = await supabase.from("career_workspaces")
    .update({
      revision: workspace.revision,
      data: workspace as unknown as Json,
      updated_at: new Date().toISOString(),
    })
    .eq("clerk_user_id", userId)
    .eq("revision", expectedRevision)
    .select("clerk_user_id")
    .maybeSingle()
  if (error) throw error
  if (!updated) throw new WorkspaceConflict(conflictMessage)
}
