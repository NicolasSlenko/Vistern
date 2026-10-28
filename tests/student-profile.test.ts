import { test } from "node:test"
import assert from "node:assert/strict"
import { createStudentProfileHandler } from "../src/lib/student-profile-handler"
import {
  backgroundFollowup,
  studentEntryPath,
  studentProfileSchema,
  toggleBackground,
  updateStudentProfile,
  type StudentProfile,
} from "../src/lib/student-profile"

const onboarding = {
  intent: "onboarding",
  year: "unsure",
  backgroundAreas: [],
  backgroundNote: "",
  step: "done",
}
const request = (payload: unknown) =>
  new Request("http://localhost/api/student-profile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })

test("a student can finish with no resume, experience, name, or goal", () => {
  const profile = updateStudentProfile(null, onboarding)
  assert.equal(profile.completed, true)
  assert.equal(studentEntryPath(profile, false), "/home")
  assert.deepEqual(profile.backgroundAreas, [])
  assert.equal(profile.focus, null)
  assert.equal("resume" in profile, false)
})
test("new students enter setup; existing resume owners retain direct access", () => {
  assert.equal(studentEntryPath(null, false), "/onboarding")
  assert.equal(studentEntryPath(null, true), "/home")
  assert.equal(
    studentEntryPath(studentProfileSchema.parse({ step: "resume", year: "junior" }), false),
    "/onboarding",
  )
})
test("changing background keeps completion and the selected Home path", () => {
  const existing = updateStudentProfile(updateStudentProfile(null, onboarding), {
    intent: "focus",
    focus: "build",
  })
  const updated = updateStudentProfile(existing, {
    ...onboarding,
    backgroundAreas: ["projects"],
    backgroundNote: "  Built a class project  ",
    step: "detail",
  })
  assert.equal(updated.completed, true)
  assert.equal(updated.focus, "build")
  assert.equal(updated.backgroundNote, "Built a class project")
})
test("focus changes preserve background and can be cleared", () => {
  const profile = updateStudentProfile(null, {
    ...onboarding,
    backgroundAreas: ["classes"],
    backgroundNote: "Learning Python",
  })
  const updated = updateStudentProfile(profile, { intent: "focus", focus: "explore" })
  assert.deepEqual({ ...updated, focus: null }, profile)
  assert.deepEqual(updateStudentProfile(updated, { intent: "focus", focus: null }), profile)
})
test("just getting started is exclusive and never implies experience", () => {
  assert.deepEqual(toggleBackground(["classes", "projects"], "starting"), ["starting"])
  assert.deepEqual(toggleBackground(["starting"], "classes"), ["classes"])
  assert.deepEqual(toggleBackground(["classes"], "classes"), [])
  assert.deepEqual(
    updateStudentProfile(null, {
      ...onboarding,
      backgroundAreas: ["starting", "classes", "classes"],
    }).backgroundAreas,
    ["classes"],
  )
  assert.equal(backgroundFollowup(["classes"]), null)
  assert.equal(backgroundFollowup(["starting"]), null)
  assert.notEqual(backgroundFollowup(["projects"]), null)
})
test("invalid payloads cannot select another account or inject resume data", () => {
  for (const payload of [
    { ...onboarding, userId: "someone-else" },
    { ...onboarding, completed: true },
    { ...onboarding, year: "invalid" },
    { ...onboarding, backgroundNote: "x".repeat(601) },
    { ...onboarding, backgroundAreas: ["professional"] },
    { intent: "focus", focus: "made-up" },
    { ...onboarding, resume: { projects: ["invented"] } },
  ])
    assert.throws(() => updateStudentProfile(null, payload))
})

test("unauthenticated writes return 401 without reading or writing storage", async () => {
  const handler = createStudentProfileHandler({
    userId: async () => null,
    read: async () => {
      assert.fail("must not read")
    },
    write: async () => {
      assert.fail("must not write")
    },
  })
  assert.equal((await handler(request(onboarding))).status, 401)
})
test("invalid JSON and invalid fields return 400 before storage access", async () => {
  const handler = createStudentProfileHandler({
    userId: async () => "student-a",
    read: async () => {
      assert.fail("must not read")
    },
    write: async () => {
      assert.fail("must not write")
    },
  })
  assert.equal((await handler(request({ ...onboarding, userId: "student-b" }))).status, 400)
  assert.equal(
    (await handler(new Request("http://localhost", { method: "POST", body: "{" }))).status,
    400,
  )
})
test("accounts are isolated and reloads retain the saved profile", async () => {
  const storage = new Map<string, StudentProfile>()
  let user = "student-a"
  const handler = createStudentProfileHandler({
    userId: async () => user,
    read: async (key) => storage.get(key) || null,
    write: async (key, data) => {
      storage.set(key, structuredClone(data))
    },
  })
  assert.equal((await handler(request(onboarding))).status, 200)
  user = "student-b"
  await handler(request({ ...onboarding, year: "junior", backgroundNote: "B's project" }))
  user = "student-a"
  const response = await handler(request({ intent: "focus", focus: "prepare" }))
  assert.equal((await response.json()).data.focus, "prepare")
  assert.equal(storage.get("uploads/student-a/student-profile.json")?.backgroundNote, "")
  assert.equal(storage.get("uploads/student-b/student-profile.json")?.backgroundNote, "B's project")
  assert.equal(storage.size, 2)
})
test("storage failures return an actionable error without a false success", async () => {
  for (const phase of ["read", "write"]) {
    const handler = createStudentProfileHandler({
      userId: async () => "student-a",
      read: async () => {
        if (phase === "read") throw new Error("private storage detail")
        return null
      },
      write: async () => {
        throw new Error("private storage detail")
      },
    })
    const response = await handler(request(onboarding))
    assert.equal(response.status, 500)
    const result = await response.json()
    assert.equal(result.success, false)
    assert.match(result.error, /try again/)
    assert.doesNotMatch(result.error, /private storage detail/)
  }
})

test("corrupt stored data is a server error, not invalid user input", async () => {
  const invalidProfile = { year: "unsupported" } as unknown as StudentProfile
  for (const read of [
    async () => {
      throw new SyntaxError("Malformed stored JSON")
    },
    async () => invalidProfile,
  ]) {
    const handler = createStudentProfileHandler({
      userId: async () => "student-a",
      read,
      write: async () => {
        assert.fail("must not overwrite corrupt data")
      },
    })
    const response = await handler(request(onboarding))
    assert.equal(response.status, 500)
    assert.match((await response.json()).error, /try again/)
  }
})
