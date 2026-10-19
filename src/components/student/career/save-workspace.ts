import {
  workspaceSchema,
  type CareerWorkspace,
  type WorkspaceUpdate,
} from "@/lib/career/workspace"

export async function saveWorkspace(
  update: WorkspaceUpdate,
): Promise<CareerWorkspace> {
  const fallback =
    "Your plan couldn’t be saved. Keep this page open and try again."
  const response = await fetch("/api/career", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(update),
  }).catch(() => {
    throw new Error(fallback)
  })
  const result = await response.json().catch(() => null)
  if (!response.ok || !result?.success) {
    throw new Error(typeof result?.error === "string" ? result.error : fallback)
  }
  const saved = workspaceSchema.safeParse(result?.data)
  if (!saved.success) throw new Error(fallback)
  return saved.data
}
