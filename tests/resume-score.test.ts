import { test } from "node:test"
import assert from "node:assert/strict"
import { analyzeImpact, readBullet } from "../src/lib/resume/impact"
import { craftReport } from "../src/lib/resume/craft"
import { WEIGHTS, calculateResumeScoreDetailed } from "../src/lib/resumeScoring"
import { getResumeObject, type Resume } from "../src/app/api/parse/resumeSchema"

function resumeWith(bullets: string[]): Resume {
  const resume = getResumeObject()
  resume.experience.push({
    company: "Acme",
    position: "Intern",
    start_date: "Jun 2024",
    end_date: "Aug 2024",
    location: "Gainesville, FL",
    responsibilities: bullets,
    achievements: [],
    technologies: [],
  })
  return resume
}

test("the weights add up to 100", () => {
  const total = Object.values(WEIGHTS).reduce((sum, weight) => sum + weight, 0)
  assert.equal(total, 100)
})

test("GPA and coursework are worth nothing, because neither can be acted on", () => {
  assert.equal(WEIGHTS.gpa, 0)
  assert.equal(WEIGHTS.coursework, 0)
})

test("a GPA no longer moves the score", () => {
  const without = getResumeObject()
  without.education.push({ school: "UF", degree: "BSc", field: "CS", start_date: "2023", end_date: "2026", gpa: null, achievements: [] })
  const with4 = structuredClone(without)
  with4.education[0].gpa = 4.0

  assert.equal(
    calculateResumeScoreDetailed(without).totalScore,
    calculateResumeScoreDetailed(with4).totalScore,
    "a fixed, unactionable fact must not change an actionable score",
  )
})

test("every student is scored the same way regardless of university", () => {
  const uf = resumeWith(["Cut nightly load time from 50 to 12 minutes"])
  uf.education.push({ school: "University of Florida", degree: "BSc", field: "CS", start_date: "2023", end_date: "2026", gpa: null, achievements: [] })
  const other = structuredClone(uf)
  other.education[0].school = "Binghamton University"

  assert.equal(calculateResumeScoreDetailed(uf).totalScore, calculateResumeScoreDetailed(other).totalScore)
})

test("a quantified result outscores the same work described as a duty", () => {
  const duty = readBullet("Worked on the data ingestion service with two other interns")
  const result = readBullet("Rebuilt the data ingestion service, cutting nightly load from 50 to 12 minutes")

  assert.ok(result.score > duty.score, `${result.score} should beat ${duty.score}`)
  assert.ok(duty.weakOpening, "“Worked on” is the thing being penalised")
  assert.ok(result.quantified && result.strongVerb)
})

test("a bullet too short to say anything cannot score well", () => {
  assert.ok(readBullet("Built an API").score <= 25)
})

test("impact rises as duties are rewritten into results", () => {
  const before = analyzeImpact(resumeWith(["Helped with testing", "Responsible for the database", "Attended standups"]))
  const after = analyzeImpact(
    resumeWith([
      "Wrote 120 integration tests, cutting release regressions by 60%",
      "Migrated the database to Postgres, halving query time",
      "Automated the nightly build, saving the team 4 hours a week",
    ]),
  )

  assert.ok(after.score > before.score + 30, `${before.score} → ${after.score}`)
  // Two, not three: "halving query time" names an outcome but gives no
  // figure, and a word is not a measurement. The strictness is the point —
  // a student who writes "halved" is told to say by how much.
  assert.equal(after.quantified, 2)
  assert.equal(before.weak, 3)
})

test("impact on a resume with no bullets is zero, not a divide by zero", () => {
  const analysis = analyzeImpact(getResumeObject())
  assert.equal(analysis.score, 0)
  assert.equal(analysis.total, 0)
})

test("craft counts checks rather than scoring them", () => {
  const report = craftReport(getResumeObject())
  assert.equal(report.total, report.checks.length)
  assert.ok(report.clear <= report.total)
  assert.ok(report.checks.every((check) => check.detail.trim().length > 0), "every check must say what to do")
})

test("craft catches a date range that runs backwards", () => {
  const resume = resumeWith(["Built a thing that cut costs by 20%"])
  resume.experience[0].start_date = "Jun 2025"
  resume.experience[0].end_date = "Aug 2024"

  const dates = craftReport(resume).checks.find((check) => check.id === "dates")
  assert.equal(dates?.state, "fail")
  assert.match(dates!.detail, /ends before it starts/)
})

test("craft flags dates that mix months with bare years", () => {
  const resume = resumeWith(["Built a thing that cut costs by 20%"])
  resume.education.push({ school: "UF", degree: "BSc", field: "CS", start_date: "2023", end_date: "2026", gpa: null, achievements: [] })

  const dates = craftReport(resume).checks.find((check) => check.id === "dates")
  assert.equal(dates?.state, "warn")
})

test("craft is clear on dates that agree", () => {
  const resume = resumeWith(["Built a thing that cut costs by 20%"])
  resume.education.push({ school: "UF", degree: "BSc", field: "CS", start_date: "Aug 2023", end_date: "May 2026", gpa: null, achievements: [] })

  assert.equal(craftReport(resume).checks.find((check) => check.id === "dates")?.state, "clear")
})

test("craft fails bullets that mostly hide what the student did", () => {
  const bullets = craftReport(resumeWith(["Worked on the API", "Helped with testing", "Assisted the team", "Built a cache"]))
    .checks.find((check) => check.id === "bullets")
  assert.equal(bullets?.state, "fail")
})
