import { test } from "node:test"
import assert from "node:assert/strict"
import {
  RESUME_STANDARD_PROMPT,
  applyResumeStandard,
  cleanBullet,
  formatResumeDate,
  normalizeResume,
} from "../src/lib/resume/standard"
import { PAGE_LINES, estimateLines } from "../src/lib/resumePageBudget"
import { getResumeObject, type Resume } from "../src/app/api/parse/resumeSchema"

function job(company: string, start: string, end: string, bullets: string[] = ["Built a thing."]): Resume["experience"][number] {
  return { company, position: "Intern", start_date: start, end_date: end, location: "", responsibilities: bullets, achievements: [], technologies: [] }
}

test("dates in the forms students type all come out as Mon YYYY", () => {
  const cases: [string, string][] = [
    ["08/2024", "Aug 2024"],
    ["2024-08", "Aug 2024"],
    ["August 2024", "Aug 2024"],
    ["aug. 2024", "Aug 2024"],
    ["Sept 2023", "Sep 2023"],
    ["Fall 2024", "Aug 2024"],
    ["May '25", "May 2025"],
    ["08/15/2024", "Aug 2024"],
    ["current", "Present"],
    ["Present", "Present"],
    ["2023", "2023"],
  ]
  for (const [input, expected] of cases) assert.equal(formatResumeDate(input), expected, input)
})

test("a date it can't read is left as written", () => {
  assert.equal(formatResumeDate("sometime soon"), "sometime soon")
  assert.equal(formatResumeDate("13/2024"), "13/2024")
  assert.equal(formatResumeDate(""), "")
})

test("year-only resumes stay year-only rather than gaining months nobody gave", () => {
  const resume = getResumeObject()
  resume.experience.push(job("A", "2022", "2023"))
  const out = normalizeResume(resume)
  assert.equal(out.experience[0].start_date, "2022")
})

test("experience is ordered newest first, current roles at the top", () => {
  const resume = getResumeObject()
  resume.experience.push(job("Old", "Jan 2021", "May 2021"), job("Now", "Jan 2024", "present"), job("Mid", "06/2023", "08/2023"))
  const out = normalizeResume(resume)
  assert.deepEqual(out.experience.map((e) => e.company), ["Now", "Mid", "Old"])
  assert.equal(out.experience[0].end_date, "Present")
  assert.equal(out.experience[1].start_date, "Jun 2023")
})

test("bullets lose trailing periods, glyphs and stray spaces", () => {
  assert.equal(cleanBullet("  • Built   an API.  "), "Built an API")
  assert.equal(cleanBullet("Worked with Acme Inc."), "Worked with Acme Inc.")
})

test("skills repeated across groups appear once", () => {
  const resume = getResumeObject()
  resume.skills.programming_languages = ["Python", "python", "Go"]
  resume.skills.other = ["Go", "Figma"]
  const out = normalizeResume(resume)
  assert.deepEqual(out.skills.programming_languages, ["Python", "Go"])
  assert.deepEqual(out.skills.other, ["Figma"])
})

test("a long profile fits one page after the standard is applied", () => {
  const resume = getResumeObject()
  const long = "Reduced page load time by 40% for 2,000 weekly users by rewriting the rendering pipeline in React and caching API calls"
  for (let i = 0; i < 8; i++) resume.experience.push(job(`Co ${i}`, `Jan 20${10 + i}`, `Dec 20${10 + i}`, Array(6).fill(long)))
  for (let i = 0; i < 6; i++) {
    resume.projects.push({ name: `P${i}`, description: "", technologies: [], highlights: Array(5).fill(long), link: "", github: "" })
  }
  assert.ok(estimateLines(resume) > PAGE_LINES)
  assert.ok(estimateLines(applyResumeStandard(resume)) <= PAGE_LINES)
})

test("the AI is told the wording rules and not the layout ones", () => {
  assert.match(RESUME_STANDARD_PROMPT, /Never invent numbers/)
  assert.match(RESUME_STANDARD_PROMPT, /Mon YYYY/)
  assert.doesNotMatch(RESUME_STANDARD_PROMPT, /Section order/)
})
