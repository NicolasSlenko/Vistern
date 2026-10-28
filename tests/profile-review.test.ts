import assert from "node:assert/strict"
import { test } from "node:test"
import { getResumeObject } from "../src/app/api/parse/resumeSchema"
import { reviewNotes, type XyzFeedback } from "../src/components/resume-studio/review-notes"

const previousFeedback: XyzFeedback = {
  projects: { 0: { score: 42, xyz_analysis: "Add a result", improvements: ["Quantify the impact"] } },
  experience: { 0: { score: 55, xyz_analysis: "Add a result", improvements: ["Describe the outcome"] } },
  actionableInsights: [{ id: "old-project", category: "projects", insight: "Improve the project", priority: "medium", type: "tweak" }],
}

test("a cleared profile shows no cached review badges", () => {
  assert.deepEqual(reviewNotes(getResumeObject(), previousFeedback), [])
})

test("old per-entry feedback cannot point to missing entries", () => {
  const profile = getResumeObject()
  profile.basics.name = "Test Student"
  const notes = reviewNotes(profile, previousFeedback)
  assert.equal(notes.some((note) => note.entryIndex !== undefined), false)
})
