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
  OPEN_ACTIVITY_LIMIT,
} from "../src/lib/career/workspace"
import { careerProjectDraft, careerProjects, projectForActivity } from "../src/lib/career/projects"
import { careerGrowthProgress, completedTrackIds, roadmapStages, roadmapTaskKey } from "../src/lib/career/roadmap"

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
  const empty = workspaceSchema.parse({})
  const workspace = updateWorkspace(empty, create, id, now)
  assert.equal(workspace.activities[0].scheduledOn, null)
  assert.equal(workspace.activities[0].status, "active")
  assert.equal(workspace.activities[0].steps.length, 3)
  assert.equal("resume" in workspace, false)
  assert.equal(workspace.activities[0].completedAt, null)
  assert.ok(careerGrowthProgress(workspace) > careerGrowthProgress(empty))
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
    "roadmapDone",
    "selectedPathId",
    "version",
  ])
})

test("selecting a track and checking roadmap tasks persist without changing activities", () => {
  const oldWorkspace = workspaceSchema.parse({ revision: 0, activities: [] })
  assert.equal(oldWorkspace.selectedPathId, null)
  assert.deepEqual(oldWorkspace.roadmapDone, [])
  const selected = updateWorkspace(oldWorkspace, { intent: "selectPath", revision: 0, pathId: "data" }, id, now)
  const checked = updateWorkspace(selected, { intent: "toggleRoadmapTask", revision: 1, pathId: "data", taskId: "dataset", done: true }, id, now)
  assert.equal(checked.selectedPathId, "data")
  assert.deepEqual(checked.roadmapDone, ["data:dataset"])
  assert.deepEqual(checked.activities, [])
  assert.ok(careerGrowthProgress(checked) > careerGrowthProgress(selected))
  const reloaded = workspaceSchema.parse(JSON.parse(JSON.stringify(checked)))
  assert.deepEqual(reloaded.roadmapDone, ["data:dataset"])
  const switched = updateWorkspace(reloaded, { intent: "selectPath", revision: 2, pathId: "cyber" }, id, now)
  assert.deepEqual(switched.roadmapDone, ["data:dataset"])
  assert.throws(() => updateWorkspace(switched, { intent: "toggleRoadmapTask", revision: 3, pathId: "data", taskId: "dataset", done: false }, id, now), /Choose this path/)
  assert.throws(() => updateWorkspace(switched, { intent: "toggleRoadmapTask", revision: 3, pathId: "cyber", taskId: "unknown", done: true }, id, now), /no longer available/)
})

test("finished tracks remain in completed work after selecting another track", () => {
  const keys = roadmapStages.data.flatMap((stage) => stage.tasks.map((task) => roadmapTaskKey("data", task.id)))
  const finished = workspaceSchema.parse({ selectedPathId: "cyber", roadmapDone: keys })
  assert.deepEqual(completedTrackIds(finished), ["data"])
  const reopened = workspaceSchema.parse({ ...finished, roadmapDone: keys.slice(1) })
  assert.deepEqual(completedTrackIds(reopened), [])
})

test("the career API saves a selected track without an activity payload", async () => {
  let saved = workspaceSchema.parse({})
  const handler = createCareerHandler({
    userId: async () => "student-a",
    read: async () => ({ data: saved, etag: null }),
    write: async (_userId, data) => { saved = data },
  })
  const response = await handler(request({ intent: "selectPath", revision: 0, pathId: "product" }))
  assert.equal(response.status, 200)
  assert.equal(saved.selectedPathId, "product")
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

test("finished activities don't count against the limit on open ones", () => {
  const activity = (index: number, status: "active" | "completed") => ({
    ...draft,
    id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    status,
    createdAt: now,
    updatedAt: now,
    completedAt: status === "completed" ? now : null,
  })
  const finished = Array.from({ length: 400 }, (_, index) => activity(index, "completed"))
  const history = workspaceSchema.parse({ activities: finished })
  assert.equal(updateWorkspace(history, create, id, now).activities.length, 401)

  const open = Array.from({ length: OPEN_ACTIVITY_LIMIT }, (_, index) => activity(1000 + index, "active"))
  const busy = workspaceSchema.parse({ activities: [...open, ...finished] })
  assert.throws(() => updateWorkspace(busy, create, id, now), /in progress/)
})

test("a project activity keeps its link to the catalog, so its tools can be shown", () => {
  const project = careerProjects[0]
  const fields = careerProjectDraft(project)
  assert.deepEqual(fields.source, { type: "project", id: project.id })
  const saved = updateWorkspace(workspaceSchema.parse({}), { intent: "create", revision: 0, activity: fields }, id, now)
  assert.equal(projectForActivity(saved.activities[0])?.tools, project.tools)
  // Added before projects were linked: no source, matched on the title.
  assert.equal(projectForActivity({ title: project.title, source: null })?.id, project.id)
  assert.equal(projectForActivity({ title: project.title, source: { type: "guide", id: "careers" } }), null)
})

test("a catalog project can be added to the plan through the API", async () => {
  let saved = workspaceSchema.parse({})
  const handler = createCareerHandler({
    userId: async () => "student-a",
    read: async () => ({ data: saved, etag: null }),
    write: async (_userId, data) => { saved = data },
  })
  const response = await handler(request({ intent: "create", revision: 0, activity: careerProjectDraft(careerProjects[0]) }))
  assert.equal(response.status, 200)
  assert.deepEqual(saved.activities[0].source, { type: "project", id: careerProjects[0].id })

  const unknown = await handler(request({ intent: "create", revision: 1, activity: { ...careerProjectDraft(careerProjects[0]), source: { type: "project", id: "retired-project" } } }))
  assert.equal(unknown.status, 400)
})
