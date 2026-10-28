import { randomUUID } from "node:crypto"
import {
  workspaceUpdateSchema,
  updateWorkspace,
  WorkspaceConflict,
  type CareerWorkspace,
} from "./workspace"
import { careers, guides, organizations } from "./catalog"

export function createCareerHandler(deps: {
  userId: () => Promise<string | null>
  read: (
    userId: string,
  ) => Promise<{ data: CareerWorkspace; etag: string | null }>
  write: (
    userId: string,
    data: CareerWorkspace,
    etag: string | null,
  ) => Promise<void>
}) {
  return async function POST(request: Request) {
    try {
      const userId = await deps.userId()
      if (!userId)
        return Response.json(
          { success: false, error: "Please sign in again." },
          { status: 401 },
        )
      let payload: unknown
      try {
        payload = await request.json()
      } catch {
        return Response.json(
          { success: false, error: "Check your activity and try again." },
          { status: 400 },
        )
      }
      const parsed = workspaceUpdateSchema.safeParse(payload)
      if (!parsed.success)
        return Response.json(
          {
            success: false,
            error: "Check your activity and date, then try again.",
          },
          { status: 400 },
        )
      const update = parsed.data
      const source = "activity" in update ? update.activity.source : null
      if (
        source &&
        !(
          source.type === "career"
            ? careers
            : source.type === "guide"
              ? guides
              : organizations
        ).some((item) => item.id === source.id)
      ) {
        return Response.json(
          { success: false, error: "That resource is no longer available." },
          { status: 400 },
        )
      }
      const stored = await deps.read(userId)
      let data: CareerWorkspace
      try {
        data = updateWorkspace(
          stored.data,
          update,
          randomUUID(),
          new Date().toISOString(),
        )
      } catch (error) {
        if (error instanceof WorkspaceConflict) throw error
        return Response.json(
          {
            success: false,
            error:
              error instanceof Error ? error.message : "Check your activity.",
          },
          { status: 400 },
        )
      }
      await deps.write(userId, data, stored.etag)
      return Response.json({ success: true, data })
    } catch (error) {
      if (error instanceof WorkspaceConflict)
        return Response.json(
          { success: false, error: error.message },
          { status: 409 },
        )
      return Response.json(
        {
          success: false,
          error:
            "Your plan couldn’t be saved. Keep this page open and try again.",
        },
        { status: 500 },
      )
    }
  }
}
