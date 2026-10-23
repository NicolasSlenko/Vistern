import { test } from "node:test"
import assert from "node:assert/strict"
import { emptyWorkspace, sampleWorkspace } from "../src/lib/resume/mock-data"
import {
  bulletUsedIn,
  effectiveVisibility,
  liveSuggestions,
  sectionOrder,
  workspaceReducer,
} from "../src/lib/resume/workspace"
import type { WorkspaceState } from "../src/lib/resume/types"

function bulletText(state: WorkspaceState, bulletId: string) {
  for (const section of ["education", "experience", "projects"] as const) {
    for (const entry of state.profile.sections[section].items) {
      const bullet = entry.bullets.find((item) => item.id === bulletId)
      if (bullet) return bullet.text
    }
  }
  return undefined
}

test("skipping a suggestion leaves the profile exactly as it was", () => {
  const state = sampleWorkspace()
  const next = workspaceReducer(state, { type: "suggestion/reject", id: "seed-contribution-cache" })
  assert.deepEqual(next.profile, state.profile)
  assert.ok(!next.suggestions.some((item) => item.id === "seed-contribution-cache"))
  assert.ok(next.dismissed.includes("seed-contribution-cache"))
})

test("accepting a suggestion edits the profile and records it in history", () => {
  const state = sampleWorkspace()
  const next = workspaceReducer(state, { type: "suggestion/accept", id: "seed-contribution-cache" })
  assert.equal(bulletText(next, "b-cache-ttl"), "Designed and built an in-memory cache in Go with TTL eviction and LRU fallback.")
  assert.equal(next.history.length, state.history.length + 1)
})

test("an edited suggestion saves the student's version", () => {
  const next = workspaceReducer(sampleWorkspace(), { type: "suggestion/accept", id: "seed-contribution-cache", text: "  Built my own cache.  " })
  assert.equal(bulletText(next, "b-cache-ttl"), "Built my own cache.")
})

test("accept all only touches the chosen section", () => {
  const state = sampleWorkspace()
  const next = workspaceReducer(state, { type: "suggestion/accept-all", section: "experience" })
  assert.ok(next.suggestions.every((item) => item.section !== "experience"))
  assert.equal(next.suggestions.length, state.suggestions.filter((item) => item.section !== "experience").length)
  assert.equal(bulletText(next, "b-cache-ttl"), bulletText(state, "b-cache-ttl"))
})

test("accepting an add-skill suggestion adds the skill once", () => {
  const next = workspaceReducer(sampleWorkspace(), { type: "suggestion/accept", id: "seed-skill-docker" })
  const tools = next.profile.sections.skills.items.find((item) => item.id === "skill-tools")
  assert.deepEqual(tools?.skills, ["Git", "Linux", "Docker"])
})

test("tailored wording never writes back to the profile", () => {
  const state = sampleWorkspace()
  const next = workspaceReducer(state, { type: "tailored/accept", id: "tailor-backend", suggestionId: "seed-role-rest" })
  assert.deepEqual(next.profile, state.profile)
  const tailored = next.tailored.find((item) => item.id === "tailor-backend")
  assert.equal(tailored?.overrides["b-cache-ttl"], "Built an in-memory cache in Go with TTL eviction, served over a REST API.")
})

test("deleting an entry retires its suggestions and drops it from tailored resumes", () => {
  const state = workspaceReducer(sampleWorkspace(), { type: "entry/delete", section: "projects", id: "proj-cache" })
  const live = liveSuggestions(state.profile, state.suggestions)
  assert.ok(!live.some((item) => item.change.entryId === "proj-cache"))
  const tailored = state.tailored[0]
  assert.ok(!tailored.entryIds.includes("proj-cache"))
  assert.ok(!tailored.bulletIds.includes("b-cache-ttl"))
})

test("used in names every resume that draws on a bullet", () => {
  const state = sampleWorkspace()
  assert.deepEqual(bulletUsedIn(state, "b-cache-ttl"), ["Master resume", "Backend engineering intern"])
  assert.deepEqual(bulletUsedIn(state, "b-discord-sched"), ["Master resume"])
})

test("reordering moves an entry within its section and stops at the ends", () => {
  const state = sampleWorkspace()
  const moved = workspaceReducer(state, { type: "entry/move", section: "projects", id: "proj-discord", direction: -1 })
  assert.deepEqual(moved.profile.sections.projects.items.map((item) => item.id), ["proj-discord", "proj-cache"])
  assert.equal(workspaceReducer(moved, { type: "entry/move", section: "projects", id: "proj-discord", direction: -1 }), moved)
})

test("a new profile starts private at every level", () => {
  const { profile } = emptyWorkspace()
  assert.equal(profile.contact.visibility, "private")
  for (const section of sectionOrder) assert.equal(profile.sections[section].visibility, "private")
  assert.equal(effectiveVisibility("public", "private"), "private")
  assert.equal(effectiveVisibility("public", "public"), "public")
})

test("checking for suggestions does not stack a second one on a line already under review", () => {
  const refreshed = workspaceReducer(sampleWorkspace(), { type: "suggestion/refresh" })
  const onGrader = refreshed.suggestions.filter(
    (item) => item.change.type === "replace-bullet" && item.change.bulletId === "b-cise-grader",
  )
  assert.equal(onGrader.length, 1)
})

test("checking for suggestions skips ones already decided", () => {
  const state = workspaceReducer(sampleWorkspace(), { type: "suggestion/reject-all" })
  const refreshed = workspaceReducer(state, { type: "suggestion/refresh" })
  assert.ok(refreshed.suggestions.every((item) => !state.dismissed.includes(item.id)))
  assert.ok(refreshed.suggestions.some((item) => item.id === "metric:b-discord-sched"))
})
