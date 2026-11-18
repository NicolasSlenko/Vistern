import assert from "node:assert/strict"
import test from "node:test"
import { getResumeObject, type Resume } from "../src/app/api/parse/resumeSchema"
import { studentProfileSchema } from "../src/lib/student-profile"
import { DEFAULT_SHARING, cardMatches, cardSource, pickCard, publicCardSchema, readSharing, webLink } from "../src/lib/community/public-card"

function resume(): Resume {
  const base = getResumeObject()
  return {
    ...base,
    basics: {
      ...base.basics,
      name: "Ada  Lovelace",
      email: "ada@ufl.edu",
      phone: "352-555-0100",
      location: { city: "Gainesville", state: "FL", country: "USA" },
      linkedin: "linkedin.com/in/ada",
      github: "javascript:alert(1)",
      portfolio: "",
    },
    education: [{ school: "University of Florida", degree: "B.S.", field: "Computer Science", start_date: "Aug 2023", end_date: "May 2027", gpa: 3.9, achievements: [] }],
    experience: [{ company: "Acme", position: "SWE Intern", start_date: "", end_date: "", location: "", responsibilities: ["secret bullet"], achievements: [], technologies: [] }],
    skills: { ...base.skills, programming_languages: ["Python", "TypeScript", "Python"] },
  }
}

const onboarding = studentProfileSchema.parse({ year: "junior" })

test("a new student shares nothing and is not listed", () => {
  assert.deepEqual(readSharing(undefined), DEFAULT_SHARING)
  const card = pickCard(cardSource(resume(), onboarding), DEFAULT_SHARING)
  assert.deepEqual(card, { name: "Ada" })
})

test("only switched-on fields reach the card", () => {
  const source = cardSource(resume(), onboarding)
  const card = pickCard(source, { listed: true, nameStyle: "full", headline: "Into ML", fields: ["school", "skills"] })
  assert.deepEqual(card, {
    name: "Ada Lovelace",
    headline: "Into ML",
    school: { school: "University of Florida", program: "B.S., Computer Science", graduation: "May 2027" },
    skills: ["Python", "TypeScript"],
  })
  assert.ok(publicCardSchema.safeParse(card).success)
})

test("phone, GPA and bullets are never on a card, even with everything on", () => {
  const source = cardSource(resume(), onboarding, { imageUrl: "https://img.clerk.com/a.png", hasImage: true, verifiedEmails: ["ada@cise.ufl.edu"] })
  const card = pickCard(source, { listed: true, nameStyle: "full", headline: "", fields: ["photo", "year", "school", "location", "skills", "experience", "projects", "links", "email"] })
  const text = JSON.stringify(card)
  assert.ok(!text.includes("352-555"))
  assert.ok(!text.includes("3.9"))
  assert.ok(!text.includes("secret bullet"))
  assert.equal(card?.year, "Junior")
  assert.equal(card?.email, "ada@cise.ufl.edu")
  assert.equal(card?.verified, "ufl.edu")
  assert.ok(publicCardSchema.safeParse(card).success)
})

test("links must be web links; a generated avatar is not a photo", () => {
  const source = cardSource(resume(), onboarding, { imageUrl: "https://img.clerk.com/default.png", hasImage: false })
  assert.equal(source.photo, undefined)
  assert.deepEqual(source.links, { linkedin: "https://linkedin.com/in/ada", github: undefined, portfolio: undefined })
  assert.equal(webLink("ftp://x.org"), undefined)
  assert.equal(webLink("localhost"), undefined)
})

test("no name means no card", () => {
  const base = getResumeObject()
  assert.equal(pickCard(cardSource(base, null), { ...DEFAULT_SHARING, listed: true }), null)
  assert.equal(pickCard(cardSource(base, null, { firstName: "Grace" }), DEFAULT_SHARING)?.name, "Grace")
})

test("search matches every word against the card", () => {
  const card = pickCard(cardSource(resume(), onboarding), { listed: true, nameStyle: "full", headline: "", fields: ["skills", "experience"] })!
  assert.ok(cardMatches(card, "python acme"))
  assert.ok(!cardMatches(card, "python google"))
  assert.ok(cardMatches(card, "  "))
})

test("invalid sharing falls back to sharing nothing", () => {
  assert.deepEqual(readSharing({ listed: true, nameStyle: "full", headline: "", fields: ["phone"] }), DEFAULT_SHARING)
})

test("email and the school badge come only from addresses Clerk verified", () => {
  // The profile says ada@ufl.edu, but nothing verified it.
  const unverified = cardSource(resume(), onboarding)
  assert.equal(unverified.email, undefined)
  assert.equal(unverified.verified, undefined)
  const personal = cardSource(resume(), onboarding, { verifiedEmails: ["ada@gmail.com"] })
  assert.equal(personal.email, "ada@gmail.com")
  assert.equal(personal.verified, undefined)
})

test("the account's name wins over the profile's", () => {
  const source = cardSource(resume(), onboarding, { firstName: "Ada", lastName: "King" })
  assert.equal(source.fullName, "Ada King")
})
