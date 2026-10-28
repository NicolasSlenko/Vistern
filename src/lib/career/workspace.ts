import { z } from "zod"
import { roadmapStages, roadmapTaskKey, trackIds } from "./roadmap"

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T12:00:00Z`)
    return (
      !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
    )
  }, "Enter a valid date.")

export const activityKindSchema = z.enum([
  "project",
  "exploration",
  "learning",
  "practice",
  "community",
  "preparation",
])
export const activityStatusSchema = z.enum(["active", "paused", "completed"])
export const activityFieldsSchema = z.object({
  title: z.string().trim().min(1).max(180),
  kind: activityKindSchema,
  notes: z.string().max(4000).default(""),
  reflection: z.string().max(2000).default(""),
  scheduledOn: dateSchema.nullable().default(null),
  steps: z
    .array(
      z
        .object({ title: z.string().trim().min(1).max(240), done: z.boolean() })
        .strict(),
    )
    .max(6),
  source: z
    .object({
      type: z.enum(["career", "guide", "organization", "project"]),
      id: z.string().max(60),
    })
    .strict()
    .nullable()
    .default(null),
})
export const activitySchema = activityFieldsSchema.extend({
  id: z.string().uuid(),
  status: activityStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable(),
})
/** Activities still being worked on (active or paused). Finished ones don't count. */
export const OPEN_ACTIVITY_LIMIT = 250
/** Everything kept, finished work included: enough for years of steady use. */
export const ACTIVITY_LIMIT = 1000

export const workspaceSchema = z.object({
  version: z.literal(1).default(1),
  revision: z.number().int().nonnegative().default(0),
  selectedPathId: z.enum(trackIds).nullable().default(null),
  roadmapDone: z.array(z.string().max(80)).max(100).default([]),
  activities: z.array(activitySchema).max(ACTIVITY_LIMIT).default([]),
})
export type CareerActivity = z.infer<typeof activitySchema>
export type ActivityFields = z.infer<typeof activityFieldsSchema>
export type CareerWorkspace = z.infer<typeof workspaceSchema>

export const workspaceUpdateSchema = z.discriminatedUnion("intent", [
  z
    .object({
      intent: z.literal("create"),
      revision: z.number().int().nonnegative(),
      activity: activityFieldsSchema.strict(),
    })
    .strict(),
  z
    .object({
      intent: z.literal("edit"),
      revision: z.number().int().nonnegative(),
      id: z.string().uuid(),
      activity: activityFieldsSchema.strict(),
      status: activityStatusSchema,
    })
    .strict(),
  z.object({
    intent: z.literal("selectPath"),
    revision: z.number().int().nonnegative(),
    pathId: z.enum(trackIds),
  }).strict(),
  z.object({
    intent: z.literal("toggleRoadmapTask"),
    revision: z.number().int().nonnegative(),
    pathId: z.enum(trackIds),
    taskId: z.string().max(60),
    done: z.boolean(),
  }).strict(),
])
export type WorkspaceUpdate = z.infer<typeof workspaceUpdateSchema>

export class WorkspaceConflict extends Error {}

export function studentDate(now: Date = new Date()) {
  return now.toLocaleDateString("en-CA", { timeZone: "America/New_York" })
}

export function updateWorkspace(
  current: CareerWorkspace,
  update: WorkspaceUpdate,
  id: string,
  now: string,
): CareerWorkspace {
  if (current.revision !== update.revision)
    throw new WorkspaceConflict(
      "Your plan changed in another window. Reload it before saving.",
    )
  if (update.intent === "selectPath") {
    return { ...current, selectedPathId: update.pathId, revision: current.revision + 1 }
  }
  if (update.intent === "toggleRoadmapTask") {
    if (current.selectedPathId !== update.pathId)
      throw new Error("Choose this path before updating its roadmap.")
    if (!roadmapStages[update.pathId].some((stage) => stage.tasks.some((task) => task.id === update.taskId)))
      throw new Error("That roadmap step is no longer available.")
    const key = roadmapTaskKey(update.pathId, update.taskId)
    const done = new Set(current.roadmapDone)
    if (update.done) done.add(key)
    else done.delete(key)
    return { ...current, roadmapDone: [...done], revision: current.revision + 1 }
  }
  if (update.intent === "create") {
    // Finished work is a record, not a to-do: only what is still open
    // counts against the working limit, so a long history never blocks
    // planning something new.
    const open = current.activities.filter((activity) => activity.status !== "completed").length
    if (open >= OPEN_ACTIVITY_LIMIT)
      throw new Error(
        `You have ${OPEN_ACTIVITY_LIMIT} activities in progress. Finish or remove some before adding more.`,
      )
    if (current.activities.length >= ACTIVITY_LIMIT)
      throw new Error("Your plan has reached its activity limit.")
    return workspaceSchema.parse({
      ...current,
      revision: current.revision + 1,
      activities: [
        {
          ...update.activity,
          id,
          status: "active",
          createdAt: now,
          updatedAt: now,
          completedAt: null,
        },
        ...current.activities,
      ],
    })
  }
  const existing = current.activities.find(
    (activity) => activity.id === update.id,
  )
  if (!existing)
    throw new WorkspaceConflict(
      "This activity is no longer available. Reload your plan.",
    )
  if (
    update.status === "completed" &&
    update.activity.steps.some((step) => !step.done)
  ) {
    throw new Error(
      "Check off the remaining steps before completing this activity.",
    )
  }
  if (
    update.status === "completed" &&
    update.activity.scheduledOn &&
    update.activity.scheduledOn > studentDate(new Date(now)) &&
    update.activity.kind === "community"
  ) {
    throw new Error("Record participation after the activity takes place.")
  }
  const updated = {
    ...existing,
    ...update.activity,
    status: update.status,
    updatedAt: now,
    completedAt:
      update.status === "completed" ? existing.completedAt || now : null,
  }
  return {
    ...current,
    revision: current.revision + 1,
    activities: current.activities.map((activity) =>
      activity.id === update.id ? updated : activity,
    ),
  }
}

export function homeActivities(activities: CareerActivity[], today: string) {
  const active = activities.filter((activity) => activity.status === "active")
  const weekEnd = new Date(`${today}T12:00:00Z`)
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7)
  const dates = active
    .filter((activity) => activity.scheduledOn)
    .sort((a, b) => a.scheduledOn!.localeCompare(b.scheduledOn!))
  const attention = dates.find(
    (activity) =>
      activity.kind === "preparation" &&
      activity.scheduledOn! <= weekEnd.toISOString().slice(0, 10),
  )
  return {
    active,
    dates,
    primary: attention || active[0] || null,
    attention: Boolean(attention),
  }
}

export function formatActivityDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}
