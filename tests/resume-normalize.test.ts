import { test } from "node:test"
import assert from "node:assert/strict"
import { normalizeParsedResume } from "../src/lib/parse/normalize"
import { getResumeObject, type Resume } from "../src/app/api/parse/resumeSchema"

function withBasics(name: string, extra: Partial<Resume["basics"]> = {}): Resume {
  const resume = getResumeObject()
  resume.basics = { ...resume.basics, name, ...extra }
  return resume
}

function education(start: string, end: string): Resume {
  const resume = getResumeObject()
  resume.education.push({
    school: "Example University",
    degree: "BSc",
    field: "Computer Science",
    start_date: start,
    end_date: end,
    gpa: null,
    achievements: [],
  })
  return resume
}

test("an all-caps name is restored to the human form", () => {
  assert.equal(normalizeParsedResume(withBasics("NIKITA SAFRONOV")).basics.name, "Nikita Safronov")
  assert.equal(normalizeParsedResume(withBasics("  MARIA   DE  LA  CRUZ ")).basics.name, "Maria de la Cruz")
  assert.equal(normalizeParsedResume(withBasics("MCDONALD O'BRIEN III")).basics.name, "McDonald O'Brien III")
  assert.equal(normalizeParsedResume(withBasics("JEAN-LUC VAN DER BERG")).basics.name, "Jean-Luc van der Berg")
})

test("names that are already cased, or are initialisms, are left alone", () => {
  for (const name of ["Ewan McDonald", "Siobhan O'Brien", "Pieter van der Berg", "Jean-Luc Picard", "J.R.R. Tolkien", "KLM"]) {
    assert.equal(normalizeParsedResume(withBasics(name)).basics.name, name)
  }
})

test("placeholder values become empty strings everywhere", () => {
  const resume = withBasics("Test Student", { linkedin: "N/A", github: "n/a", portfolio: "  Not provided  ", phone: "—" })
  resume.education.push({
    school: "Example University",
    degree: "None",
    field: "Computer Science",
    start_date: "2023",
    end_date: "2026",
    gpa: "N/A",
    achievements: ["Dean's List", "none"],
  })
  const normalized = normalizeParsedResume(resume)
  assert.equal(normalized.basics.linkedin, "")
  assert.equal(normalized.basics.github, "")
  assert.equal(normalized.basics.portfolio, "")
  assert.equal(normalized.basics.phone, "")
  assert.equal(normalized.education[0].degree, "")
  assert.equal(normalized.education[0].gpa, null)
  assert.deepEqual(normalized.education[0].achievements, ["Dean's List"])
})

test("a range stuck in one field is lifted into both date fields", () => {
  for (const [start, end] of [
    ["", "Aug 2023 - Dec 2026"],
    ["", "August 2023 – December 2026"],
    ["Aug 2023-Dec 2026", ""],
    ["", "08/2023 to 12/2026"],
  ]) {
    const item = normalizeParsedResume(education(start, end)).education[0]
    assert.deepEqual([item.start_date, item.end_date], ["Aug 2023", "Dec 2026"], `${start} | ${end}`)
  }
  const yearsOnly = normalizeParsedResume(education("", "2021-2022")).education[0]
  assert.deepEqual([yearsOnly.start_date, yearsOnly.end_date], ["2021", "2022"])
})

test("ongoing end dates are recorded as emptiness, not as words", () => {
  for (const end of ["Present", "present", "Current", "Ongoing", "N/A"]) {
    const item = normalizeParsedResume(education("Aug 2023", end)).education[0]
    assert.deepEqual([item.start_date, item.end_date], ["Aug 2023", ""])
  }
  const split = normalizeParsedResume(education("", "Aug 2023 – Present")).education[0]
  assert.deepEqual([split.start_date, split.end_date], ["Aug 2023", ""])
})

test("separators and qualifiers are stripped from a single date", () => {
  const observed = normalizeParsedResume(education("", "- Expected December 2026")).education[0]
  assert.deepEqual([observed.start_date, observed.end_date], ["", "Dec 2026"])

  const anticipated = normalizeParsedResume(education("Sept 2023", "Anticipated May 2027,")).education[0]
  assert.deepEqual([anticipated.start_date, anticipated.end_date], ["Sep 2023", "May 2027"])
})

test("unrecognised dates survive untouched and empty entries are dropped", () => {
  const seasonal = normalizeParsedResume(education("Fall 2023", "Spring 2026")).education[0]
  assert.deepEqual([seasonal.start_date, seasonal.end_date], ["Fall 2023", "Spring 2026"])

  const resume = getResumeObject()
  resume.experience.push(
    { company: "N/A", position: "", start_date: "-", end_date: "", location: "", responsibilities: [], achievements: [], technologies: [] },
    { company: "Example Ltd", position: "Intern", start_date: "May 2024", end_date: "Present", location: "Toronto", responsibilities: ["Wrote tests"], achievements: [], technologies: [] },
  )
  const normalized = normalizeParsedResume(resume)
  assert.equal(normalized.experience.length, 1)
  assert.equal(normalized.experience[0].company, "Example Ltd")
  assert.equal(normalized.experience[0].end_date, "")
})

test("normalisation is pure and tolerates malformed input", () => {
  const resume = withBasics("NIKITA SAFRONOV", { linkedin: "N/A" })
  const snapshot = structuredClone(resume)
  normalizeParsedResume(resume)
  assert.deepEqual(resume, snapshot)

  assert.doesNotThrow(() => normalizeParsedResume({ basics: { name: 42 }, education: "nope" } as unknown as Resume))
  assert.doesNotThrow(() => normalizeParsedResume(null as unknown as Resume))
})
