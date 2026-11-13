import { test } from "node:test"
import assert from "node:assert/strict"
import { bulletKey, defaultPick, pickFromProfile, setSection, setSkills, toggleBullet, toggleEntry, toggleSkill } from "../src/lib/resume/pick"
import { getResumeObject, type Resume } from "../src/app/api/parse/resumeSchema"

function profile(): Resume {
  const resume = getResumeObject()
  resume.basics.name = "Ada Gator"
  resume.experience = ["Acme", "Globex", "Initech"].map((company) => ({
    company,
    position: "Intern",
    start_date: "2024-05",
    end_date: "2024-08",
    location: "",
    responsibilities: [`${company} one`, `${company} two`, `${company} three`],
    achievements: [`${company} win`],
    technologies: [],
  }))
  resume.projects = [{ name: "Vistern", description: "", technologies: [], highlights: ["a", "b"], link: "", github: "" }]
  resume.skills.programming_languages = ["Python", "TypeScript", "Java"]
  resume.certifications = [{ name: "AWS", issuer: "", date: "", credential_id: "", url: "" }]
  return resume
}

test("the default pick takes everything the page prints", () => {
  const source = profile()
  const out = pickFromProfile(source, defaultPick(source))
  assert.deepEqual(out.experience, source.experience)
  assert.deepEqual(out.projects, source.projects)
  assert.deepEqual(out.skills, source.skills)
  assert.equal(out.basics.name, "Ada Gator")
  // Not printed on the page, so not carried along unseen.
  assert.deepEqual(out.certifications, [])
})

test("unticked entries and bullets are left out, and order is kept", () => {
  const source = profile()
  let pick = defaultPick(source)
  pick = toggleEntry(pick, "experience", 1)
  pick = toggleBullet(pick, bulletKey("experience", 2, "responsibilities", 0))
  pick = toggleBullet(pick, bulletKey("experience", 0, "achievements", 0))
  pick = toggleBullet(pick, bulletKey("projects", 0, "highlights", 1))
  const out = pickFromProfile(source, pick)

  assert.deepEqual(out.experience.map((e) => e.company), ["Acme", "Initech"])
  assert.deepEqual(out.experience[0].achievements, [])
  // Index 2 in the profile is the one whose first bullet went, not index 1 of the output.
  assert.deepEqual(out.experience[1].responsibilities, ["Initech two", "Initech three"])
  assert.deepEqual(out.projects[0].highlights, ["a"])
  // The profile itself is untouched.
  assert.equal(source.experience.length, 3)
  assert.equal(source.experience[2].responsibilities.length, 3)
})

test("re-ticking an entry or a skill puts it back in its place", () => {
  const source = profile()
  let pick = defaultPick(source)
  pick = toggleEntry(toggleEntry(pick, "experience", 0), "experience", 0)
  assert.deepEqual(pick.entries.experience, [0, 1, 2])

  pick = toggleSkill(pick, "programming_languages", "Python", source)
  assert.deepEqual(pick.skills.programming_languages, ["TypeScript", "Java"])
  pick = toggleSkill(pick, "programming_languages", "Python", source)
  assert.deepEqual(pick.skills.programming_languages, ["Python", "TypeScript", "Java"])

  pick = setSkills(pick, source, false)
  assert.deepEqual(pickFromProfile(source, pick).skills.programming_languages, [])
})

test("All brings a section's unticked bullets back; None leaves them as they were", () => {
  const source = profile()
  let pick = defaultPick(source)
  pick = toggleBullet(pick, bulletKey("experience", 0, "responsibilities", 1))
  pick = toggleBullet(pick, bulletKey("projects", 0, "highlights", 0))
  pick = setSection(pick, "experience", source, false)
  assert.equal(pick.droppedBullets.length, 2)
  pick = setSection(pick, "experience", source, true)
  assert.deepEqual(pick.droppedBullets, [bulletKey("projects", 0, "highlights", 0)])
  assert.equal(pickFromProfile(source, pick).experience[0].responsibilities.length, 3)
})
