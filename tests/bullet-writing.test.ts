import { test } from "node:test"
import assert from "node:assert/strict"
import {
  buildDraftPrompt,
  buildFixPrompt,
  bulletTarget,
  cleanOptions,
  describeEntry,
  hasPlaceholder,
  isWritableSection,
} from "../src/lib/bullet-writing"

test("only sections with achievement bullets get AI writing", () => {
  assert.equal(isWritableSection("experience"), true)
  assert.equal(isWritableSection("projects"), true)
  assert.equal(isWritableSection("extracurriculars"), true)
  assert.equal(isWritableSection("education"), false)
  assert.equal(isWritableSection("certifications"), false)
})

test("a new entry gets as many bullets as the student's other entries usually have", () => {
  const projects = (...counts: number[]) => counts.map((n) => ({ highlights: Array.from({ length: n }, (_, i) => `bullet ${i}`) }))
  assert.equal(bulletTarget([], "projects"), 3, "nothing to go on")
  assert.equal(bulletTarget(projects(4, 4, 4), "projects"), 4)
  assert.equal(bulletTarget(projects(2, 4, 9), "projects"), 4, "median ignores one long entry")
  assert.equal(bulletTarget(projects(0, 0), "projects"), 3, "empty entries don't count")
  assert.equal(bulletTarget(projects(1), "projects"), 2, "never fewer than 2")
  assert.equal(bulletTarget(projects(8), "projects"), 5, "never more than 5")
  // Experience counts both of its bullet fields.
  assert.equal(bulletTarget([{ responsibilities: ["a", "b"], achievements: ["c"] }], "experience"), 3)
})

test("placeholders are the bracketed facts the student still has to fill in", () => {
  assert.equal(hasPlaceholder("Served [number] students weekly"), true)
  assert.equal(hasPlaceholder("Served 40 students weekly"), false)
})

test("model options are trimmed, emptied ones dropped, and capped at three", () => {
  const option = (text: string) => ({ text, angle: " Concise ", why: " Short. " })
  const cleaned = cleanOptions([option("  One  "), option("   "), option("Two"), option("Three"), option("Four")])
  assert.deepEqual(cleaned.map((o) => o.text), ["One", "Two", "Three"])
  assert.equal(cleaned[0].angle, "Concise")
  assert.deepEqual(cleanOptions(undefined), [])
})

test("an ongoing role asks for present tense, a finished one for past", () => {
  assert.match(describeEntry("experience", { position: "TA", company: "UF", start_date: "2025-08", end_date: "" }), /present tense/)
  assert.match(describeEntry("experience", { position: "TA", company: "UF", start_date: "2024-08", end_date: "2025-05" }), /past tense/)
  assert.match(describeEntry("experience", { position: "TA", company: "UF", end_date: "Present" }), /present tense/)
})

test("the fix prompt carries the bullet, the student's context and what to avoid, but not the bullet as a sibling", () => {
  const entry = { name: "Planner", highlights: ["Worked on the database.", "Wrote tests."] }
  const prompt = buildFixPrompt({
    section: "projects",
    entry,
    bullet: "Worked on the database.",
    context: "It served 200 students",
    avoid: ["Old option"],
  })
  assert.match(prompt, /BULLET TO REWRITE\nWorked on the database\./)
  assert.match(prompt, /It served 200 students/)
  assert.match(prompt, /- Old option/)
  // The bullet being rewritten isn't listed again among the entry's other bullets.
  assert.doesNotMatch(prompt, /- Worked on the database\./)
  assert.match(prompt, /- Wrote tests\./)
})

test("the draft prompt asks for the target count and marks a missing result", () => {
  const prompt = buildDraftPrompt({
    section: "extracurriculars",
    entry: { organization: "UF ACM", role: "Project lead" },
    answers: { what: "Led a team building a club website", problem: "", result: "" },
    count: 4,
  })
  assert.match(prompt, /Draft 4 bullets/)
  assert.match(prompt, /Led a team building a club website/)
  assert.match(prompt, /none given: use \[placeholders\]/)
})
