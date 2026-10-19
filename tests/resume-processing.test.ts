import { test } from "node:test"
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { parseFileContent, ResumeFileError } from "../src/app/api/parse/parseContent"
import { extractWithChatGPT } from "../src/app/api/parse/semanticParse"
import { getResumeObject } from "../src/app/api/parse/resumeSchema"
import { mergeResumeProfile } from "../src/lib/merge-resume-profile"

test("PDF extraction reads the actual fixture and leaves its bytes unchanged", async () => {
  const buffer = await readFile(new URL("../test-fixtures/vistern-qa-resume.pdf", import.meta.url))
  const original = Buffer.from(buffer)
  const text = await parseFileContent(buffer, "resume.pdf")
  for (const expected of [
    "VISTERN TEST STUDENT",
    "Example University",
    "QA Study Planner",
    "12 automated tests",
  ]) {
    assert(text.includes(expected), `Missing fixture text: ${expected}`)
  }
  assert.deepEqual(buffer, original)
})

test("TXT extraction preserves the supplied text", async () => {
  const text = "Test Student\nProjects\nA study planner built with Python."
  assert.equal(await parseFileContent(Buffer.from(text), "resume.TXT"), text)
})

test("DOCX extraction reads the supported Word format", async () => {
  const buffer = await readFile(new URL("../test-fixtures/vistern-qa-resume.docx", import.meta.url))
  const text = await parseFileContent(buffer, "resume.docx")
  assert(text.includes("VISTERN TEST STUDENT"))
  assert(text.includes("QA Study Planner"))
  assert(text.includes("Example University"))
})

test("legacy Word files explain how to convert to a supported format", async () => {
  await assert.rejects(parseFileContent(Buffer.from("legacy document"), "resume.doc"), /Save this Word document as DOCX or PDF/)
})

test("empty, invalid, and unsupported files fail before semantic parsing", async () => {
  for (const [filename, body] of [
    ["empty.txt", "  \n"],
    ["broken.pdf", "not a PDF"],
    ["resume.json", "{}"],
  ]) {
    await assert.rejects(parseFileContent(Buffer.from(body), filename), ResumeFileError)
  }
})

test("the AI parser rejects empty input without making a provider request", async () => {
  await assert.rejects(extractWithChatGPT("  \n"), /Resume text is empty/)
})

test("confirmed profile merges preserve existing work without mutating inputs", () => {
  const existing = getResumeObject()
  existing.basics.name = "Existing Student"
  existing.projects.push({
    name: "Study Planner",
    description: "Existing description",
    technologies: ["Python"],
    highlights: [],
    link: "",
    github: "",
  })
  existing.skills.programming_languages = ["Python"]
  const incoming = getResumeObject()
  incoming.basics.name = "Another spelling"
  incoming.projects = [
    { ...existing.projects[0], name: "study planner", description: "Do not overwrite the master" },
    { ...existing.projects[0], name: "Campus Map" },
  ]
  incoming.skills.programming_languages = ["python", "JavaScript", "javascript", " "]
  const snapshot = structuredClone({ existing, incoming })
  const merged = mergeResumeProfile(existing, incoming)
  assert.equal(merged.basics.name, "Existing Student")
  assert.deepEqual(
    merged.projects.map((project) => project.name),
    ["Study Planner", "Campus Map"],
  )
  assert.equal(merged.projects[0].description, "Existing description")
  assert.deepEqual(merged.skills.programming_languages, ["Python", "JavaScript"])
  assert.deepEqual({ existing, incoming }, snapshot)
})

test("the first confirmed resume creates an independent master profile", () => {
  const resume = getResumeObject()
  const merged = mergeResumeProfile(null, resume)
  merged.skills.programming_languages.push("Python")
  assert.deepEqual(resume.skills.programming_languages, [])
})
