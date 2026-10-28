import { test } from "node:test"
import assert from "node:assert/strict"
import { applyChanges, proposeChanges } from "../src/lib/profile/merge"
import { getResumeObject, type Resume } from "../src/app/api/parse/resumeSchema"

function role(company: string, position: string, extra: Record<string, unknown> = {}) {
  return {
    company,
    position,
    start_date: "Jan 2024",
    end_date: "Jun 2024",
    location: "Gainesville, FL",
    responsibilities: ["Did a thing"],
    achievements: [],
    technologies: [],
    ...extra,
  }
}

function withExperience(...roles: ReturnType<typeof role>[]): Resume {
  const resume = getResumeObject()
  resume.experience.push(...roles)
  return resume
}

const accept = (ids: string[]) => new Set(ids)

test("a job the profile does not have is offered as an addition", () => {
  const profile = withExperience(role("Acme", "Intern"))
  const upload = withExperience(role("Acme", "Intern"), role("Globex", "Analyst"))

  const changes = proposeChanges(profile, upload)
  const added = changes.filter((change) => change.kind === "added")
  assert.equal(added.length, 1)
  assert.equal(added[0].title, "Analyst")
  assert.equal(added[0].subtitle, "Globex")
})

test("a job the profile has and the upload omits is left alone", () => {
  // A tailored resume is a subset. Absence is not deletion.
  const profile = withExperience(role("Acme", "Intern"), role("Globex", "Analyst"))
  const upload = withExperience(role("Acme", "Intern"))

  const changes = proposeChanges(profile, upload)
  assert.deepEqual(changes, [])

  const after = applyChanges(profile, changes, accept([]))
  assert.equal(after.experience.length, 2)
})

test("the same job with new wording is offered as a revision, not a duplicate", () => {
  const profile = withExperience(role("Acme", "Intern", { responsibilities: ["Helped the team"] }))
  const upload = withExperience(role("Acme", "Intern", { responsibilities: ["Cut load time by 40%"] }))

  const changes = proposeChanges(profile, upload)
  assert.equal(changes.length, 1)
  assert.equal(changes[0].kind, "revised")
  assert.equal(changes[0].fields?.[0].label, "Bullets")
  assert.equal(changes[0].fields?.[0].before, "Helped the team")
  assert.equal(changes[0].fields?.[0].after, "Cut load time by 40%")

  const after = applyChanges(profile, changes, accept([changes[0].id]))
  assert.equal(after.experience.length, 1, "revising must not append a second copy")
  assert.deepEqual(after.experience[0].responsibilities, ["Cut load time by 40%"])
})

test("matching ignores spacing, case and punctuation drift between parses", () => {
  const profile = withExperience(role("Acme Corp.", "Software Engineer"))
  const upload = withExperience(role("ACME  CORP", "software engineer"))

  assert.deepEqual(proposeChanges(profile, upload), [], "re-reading the same PDF must not invent changes")
})

test("a field the upload is silent about is never proposed as a deletion", () => {
  const profile = withExperience(role("Acme", "Intern", { location: "Gainesville, FL" }))
  const upload = withExperience(role("Acme", "Intern", { location: "" }))

  assert.deepEqual(proposeChanges(profile, upload), [])
})

test("declining a change leaves the profile exactly as it was", () => {
  const profile = withExperience(role("Acme", "Intern"))
  const upload = withExperience(role("Acme", "Intern"), role("Globex", "Analyst"))

  const changes = proposeChanges(profile, upload)
  const after = applyChanges(profile, changes, accept([]))
  assert.deepEqual(after, profile)
})

test("only new skills are offered, and accepting appends rather than replaces", () => {
  const profile = getResumeObject()
  profile.skills.programming_languages = ["Python", "Java"]
  const upload = getResumeObject()
  upload.skills.programming_languages = ["python", "Rust"]

  const changes = proposeChanges(profile, upload)
  assert.equal(changes.length, 1)
  assert.deepEqual(changes[0].preview, ["Rust"], "Python is already there, in any casing")

  const after = applyChanges(profile, changes, accept([changes[0].id]))
  assert.deepEqual(after.skills.programming_languages, ["Python", "Java", "Rust"])
})

test("contact details fill blanks and flag genuine differences", () => {
  const profile = getResumeObject()
  profile.basics = { ...profile.basics, name: "Alex Rivera", email: "old@uf.edu", github: "" }
  const upload = getResumeObject()
  upload.basics = { ...upload.basics, name: "Alex Rivera", email: "new@uf.edu", github: "github.com/alex" }

  const changes = proposeChanges(profile, upload)
  assert.equal(changes.length, 1)
  const labels = changes[0].fields?.map((field) => field.label)
  assert.deepEqual(labels, ["Email", "GitHub"], "the unchanged name is not raised")

  const after = applyChanges(profile, changes, accept([changes[0].id]))
  assert.equal(after.basics.email, "new@uf.edu")
  assert.equal(after.basics.github, "github.com/alex")
})

test("accepting some and declining others applies exactly the chosen ones", () => {
  const profile = withExperience(role("Acme", "Intern"))
  const upload = withExperience(role("Globex", "Analyst"), role("Initech", "Developer"))

  const changes = proposeChanges(profile, upload)
  assert.equal(changes.length, 2)

  const after = applyChanges(profile, changes, accept([changes[0].id]))
  assert.equal(after.experience.length, 2)
  assert.ok(after.experience.some((entry) => entry.company === "Globex"))
  assert.ok(!after.experience.some((entry) => entry.company === "Initech"))
})

test("applying does not mutate the profile it was given", () => {
  const profile = withExperience(role("Acme", "Intern"))
  const snapshot = structuredClone(profile)
  const upload = withExperience(role("Globex", "Analyst"))

  const changes = proposeChanges(profile, upload)
  applyChanges(profile, changes, accept(changes.map((change) => change.id)))
  assert.deepEqual(profile, snapshot)
})

test("a first upload with no profile proposes nothing to reconcile", () => {
  // There is nothing to conflict with; the upload simply becomes the profile.
  assert.deepEqual(proposeChanges(null, withExperience(role("Acme", "Intern"))), [])
})
