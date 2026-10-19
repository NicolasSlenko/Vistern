import { z } from "zod"

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
      type: z.enum(["career", "guide", "organization"]),
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
export const workspaceSchema = z.object({
  version: z.literal(1).default(1),
  revision: z.number().int().nonnegative().default(0),
  activities: z.array(activitySchema).max(250).default([]),
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
  if (update.intent === "create") {
    if (current.activities.length >= 250)
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
