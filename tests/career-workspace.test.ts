import { test } from "node:test"
import assert from "node:assert/strict"
import { createCareerHandler } from "../src/lib/career/handler"
import { activityDraft, projectDraft } from "../src/lib/career/templates"
import {
  homeActivities,
  workspaceSchema,
  workspaceUpdateSchema,
  updateWorkspace,
  WorkspaceConflict,
  studentDate,
} from "../src/lib/career/workspace"

const id = "96a81b0a-8799-459f-963b-5037eb09745a"
const now = "2026-10-18T14:00:00.000Z"
const draft = { ...projectDraft("existing"), title: "Improve a class project" }
const create = { intent: "create" as const, revision: 0, activity: draft }
const request = (body: unknown) =>
  new Request("http://localhost/api/career", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })

test("an activity can be planned without a resume, imposed date, or focus", () => {
  const workspace = updateWorkspace(workspaceSchema.parse({}), create, id, now)
  assert.equal(workspace.activities[0].scheduledOn, null)
  assert.equal(workspace.activities[0].status, "active")
  assert.equal(workspace.activities[0].steps.length, 3)
  assert.equal("resume" in workspace, false)
  assert.equal(workspace.activities[0].completedAt, null)
})

test("pausing and resuming preserve steps, notes, reflection, and history", () => {
  const workspace = updateWorkspace(workspaceSchema.parse({}), create, id, now)
  const activity = {
    ...draft,
    notes: "Keep the existing test cases",
    reflection: "My own contribution",
    steps: draft.steps.map((step, i) => ({ ...step, done: i === 0 })),
  }
  const paused = updateWorkspace(
    workspace,
    { intent: "edit", revision: 1, id, activity, status: "paused" },
    id,
    now,
  )
  assert.equal(homeActivities(paused.activities, "2026-10-18").primary, null)
  const resumed = updateWorkspace(
    paused,
    { intent: "edit", revision: 2, id, activity, status: "active" },
    id,
    now,
  )
  assert.equal(resumed.activities.length, 1)
  assert.equal(resumed.activities[0].steps[0].done, true)
  assert.equal(resumed.activities[0].notes, activity.notes)
  assert.equal(resumed.activities[0].reflection, activity.reflection)
})

test("completion requires finished steps and does not write a resume", () => {
  const workspace = updateWorkspace(workspaceSchema.parse({}), create, id, now)
  assert.throws(
    () =>
      updateWorkspace(
        workspace,
        {
          intent: "edit",
          revision: 1,
          id,
          activity: draft,
          status: "completed",
        },
        id,
        now,
      ),
    /remaining steps/,
  )
  const completed = updateWorkspace(
    workspace,
    {
      intent: "edit",
      revision: 1,
      id,
      activity: {
        ...draft,
        steps: draft.steps.map((step) => ({ ...step, done: true })),
      },
      status: "completed",
    },
    id,
    now,
  )
  assert.equal(completed.activities[0].completedAt, now)
  assert.equal(
    homeActivities(completed.activities, "2026-10-18").active.length,
    0,
  )
  assert.deepEqual(Object.keys(completed).sort(), [
    "activities",
    "revision",
    "version",
  ])
})

test("recorded preparation dates take priority without removing other work", () => {
  let workspace = updateWorkspace(workspaceSchema.parse({}), create, id, now)
  workspace = updateWorkspace(
    workspace,
    {
      intent: "create",
      revision: 1,
      activity: {
        ...activityDraft("preparation"),
        title: "Interview",
        scheduledOn: "2026-10-20",
      },
    },
    "1ae458ed-203b-46c0-9b06-82067896f3b6",
    now,
  )
  const home = homeActivities(
    workspace.activities.slice().reverse(),
    "2026-10-18",
  )
  assert.equal(home.primary?.title, "Interview")
  assert.equal(home.active.length, 2)
  assert.equal(home.dates.length, 1)
  assert.equal(home.attention, true)
})

test("invalid dates and extra account fields are rejected", () => {
  assert.equal(
    workspaceUpdateSchema.safeParse({ ...create, userId: "someone-else" })
      .success,
    false,
  )
  assert.equal(
    workspaceUpdateSchema.safeParse({
      ...create,
      activity: { ...draft, scheduledOn: "2026-02-31" },
    }).success,
    false,
  )
  assert.equal(
    workspaceUpdateSchema.safeParse({
      ...create,
      activity: {
        ...draft,
        source: { type: "organization", id: "acm", url: "javascript:alert(1)" },
      },
    }).success,
    false,
  )
})

test("a stale form cannot overwrite a newer plan", () => {
  const workspace = updateWorkspace(workspaceSchema.parse({}), create, id, now)
  assert.throws(
    () => updateWorkspace(workspace, create, id, now),
    WorkspaceConflict,
  )
})

test("anonymous requests do not access storage", async () => {
  const handler = createCareerHandler({
    userId: async () => null,
    read: async () => {
      throw Error("Unexpected read")
    },
    write: async () => {
      throw Error("Unexpected write")
    },
  })
  assert.equal((await handler(request(create))).status, 401)
})

test("writes use authenticated identity and conditional storage revision", async () => {
  let written = false
  const handler = createCareerHandler({
    userId: async () => "student-a",
    read: async (userId) => {
      assert.equal(userId, "student-a")
      return { data: workspaceSchema.parse({}), etag: "original" }
    },
    write: async (userId, data, etag) => {
      assert.equal(userId, "student-a")
      assert.equal(etag, "original")
      assert.equal(data.revision, 1)
      written = true
    },
  })
  assert.equal((await handler(request(create))).status, 200)
  assert.equal(written, true)
})

test("storage conflicts and failures are visible, not success responses", async () => {
  const read = async () => ({ data: workspaceSchema.parse({}), etag: null })
  for (const [error, status] of [
    [new WorkspaceConflict("Reload your plan"), 409],
    [new Error("Storage unavailable"), 500],
  ] as const) {
    const handler = createCareerHandler({
      userId: async () => "student-a",
      read,
      write: async () => {
        throw error
      },
    })
    const response = await handler(request(create))
    assert.equal(response.status, status)
    assert.equal("data" in (await response.json()), false)
  }
})

test("future community participation cannot be marked completed", () => {
  const future = {
    ...activityDraft("community"),
    title: "Campus activity",
    scheduledOn: "2026-10-22",
  }
  const workspace = updateWorkspace(
    workspaceSchema.parse({}),
    { ...create, activity: future },
    id,
    now,
  )
  assert.throws(
    () =>
      updateWorkspace(
        workspace,
        {
          intent: "edit",
          revision: 1,
          id,
          activity: future,
          status: "completed",
        },
        id,
        now,
      ),
    /after the activity/,
  )
})

test("community completion uses the same UF calendar date as Home near midnight UTC", () => {
  const evening = "2026-10-19T01:00:00.000Z"
  assert.equal(studentDate(new Date(evening)), "2026-10-18")
  const activity = {
    ...activityDraft("community"),
    title: "Campus activity",
    scheduledOn: "2026-10-19",
    steps: [],
  }
  const workspace = updateWorkspace(
    workspaceSchema.parse({}),
    { ...create, activity },
    id,
    evening,
  )
  assert.throws(
    () =>
      updateWorkspace(
        workspace,
        { intent: "edit", revision: 1, id, activity, status: "completed" },
        id,
        evening,
      ),
    /after the activity/,
  )
})
