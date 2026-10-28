import assert from "node:assert/strict"
import { test } from "node:test"
import { getResumeObject } from "../src/app/api/parse/resumeSchema"
import { reviewNotes, type XyzFeedback } from "../src/components/resume-studio/review-notes"
import { alignFeedback, labelFeedback } from "../src/lib/feedback-entries"

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

// The master profile lists entries in a different order from the resume a
// review was written for: notes must follow the entry, not the position.
function job(company: string, position: string) {
  return { company, position, location: "", start_date: "", end_date: "", responsibilities: ["Did the work"], achievements: [], technologies: [] }
}

test("a review's notes land on the entry they were written about, not the same position", () => {
  const resume = getResumeObject()
  resume.experience = [job("Binghamton University", "Research Assistant"), job("Roblox", "Software Engineer Intern")]
  const review = labelFeedback(
    { experience: { 0: { score: 50, xyz_analysis: "Research note", improvements: ["Simulated 200k 3D faces"] } } } as XyzFeedback,
    resume,
  )

  const profile = getResumeObject()
  profile.experience = [job("Roblox", "Software Engineer Intern"), job("Binghamton University", "Research Assistant")]
  const notes = reviewNotes(profile, alignFeedback(review, profile))
  const note = notes.find((item) => item.text === "Simulated 200k 3D faces")
  assert.equal(note?.entryIndex, 1)
  assert.equal(note?.entryName, "Binghamton University")
})

test("a note whose entry is gone is dropped rather than moved onto another", () => {
  const resume = getResumeObject()
  resume.experience = [job("Binghamton University", "Research Assistant")]
  const review = labelFeedback({ experience: { 0: { score: 50, xyz_analysis: "", improvements: ["Research note"] } } } as XyzFeedback, resume)

  const profile = getResumeObject()
  profile.experience = [job("Roblox", "Software Engineer Intern")]
  assert.equal(reviewNotes(profile, alignFeedback(review, profile)).some((note) => note.entryIndex !== undefined), false)
})
