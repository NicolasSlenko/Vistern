import { test } from "node:test"
import assert from "node:assert/strict"
import { allowedLevels, keepListing, levelOf, searchTerms, yearsRequired } from "../src/lib/jobs/listing-filter"
import { dedupeJobs, fetchAdzunaJobs, fetchMuseJobs } from "../src/lib/jobs/sources"

const internOnly = allowedLevels({ jobType: ["Internship"] })
const fullTime = allowedLevels({ jobType: ["Full-Time"], experienceLevel: ["Entry Level (0-2 years)"] })
const either = allowedLevels({ jobType: ["Either / Both"] })

test("an internship search keeps only listings titled as internships", () => {
  assert.ok(keepListing("Software Engineering Intern, Summer 2027", "", internOnly))
  assert.ok(keepListing("Data Science Co-op", "", internOnly))
  assert.ok(keepListing("Product Manager Intern", "", internOnly))
  // Found because the description mentions interns or internal tools.
  assert.equal(keepListing("Senior Software Engineer", "You will mentor our interns.", internOnly), false)
  assert.equal(keepListing("Staff Engineer, Internal Tools", "", internOnly), false)
  assert.equal(keepListing("Software Engineer", "Build internal dashboards.", internOnly), false)
})

test("a full-time student search drops senior and experienced roles", () => {
  assert.ok(keepListing("Software Engineer I", "", fullTime))
  assert.ok(keepListing("New Grad Software Engineer", "", fullTime))
  assert.ok(keepListing("Associate Product Manager", "", fullTime))
  assert.ok(keepListing("Software Engineer", "0-2 years of experience preferred.", fullTime))
  assert.ok(keepListing("Software Engineer", "No experience required.", fullTime))
  assert.equal(keepListing("Sr. Backend Engineer", "", fullTime), false)
  assert.equal(keepListing("Lead Data Scientist", "", fullTime), false)
  assert.equal(keepListing("Engineering Manager", "", fullTime), false)
  assert.equal(keepListing("Software Engineer II", "", fullTime), false)
  assert.equal(keepListing("Software Engineer", "Requires 5+ years of professional experience.", fullTime), false)
  assert.equal(keepListing("Software Engineering Intern", "", fullTime), false)
})

test("either keeps internships and entry roles, and experience level can open mid and senior", () => {
  assert.ok(keepListing("Frontend Intern", "", either))
  assert.ok(keepListing("Junior Frontend Developer", "", either))
  assert.equal(keepListing("Principal Engineer", "", either), false)
  const mid = allowedLevels({ jobType: ["Full-Time"], experienceLevel: ["Mid Level (3-5 years)"] })
  assert.ok(keepListing("Software Engineer II", "", mid))
  assert.equal(keepListing("Staff Engineer", "", mid), false)
})

test("levels and years are read from the posting", () => {
  assert.equal(levelOf("Summer Analyst, Technology"), "intern")
  assert.equal(levelOf("Machine Learning Engineer", "3-5 years of experience in ML"), "mid")
  assert.equal(levelOf("Machine Learning Engineer", "8+ years of relevant industry experience"), "senior")
  assert.equal(levelOf("Machine Learning Engineer", "A great team."), null)
  assert.equal(yearsRequired("At least 2 years of hands-on experience, ideally 4 years experience"), 2)
  assert.equal(yearsRequired("Founded 25 years ago"), null)
})

test("roles become search words a job board understands", () => {
  assert.deepEqual(searchTerms("Engineering Manager").includes("software engineer"), true)
  assert.deepEqual(searchTerms("Something New"), ["something new"])
})

test("an internship search asks the boards for internships and drops what slips through", async () => {
  const urls: string[] = []
  const realFetch = globalThis.fetch
  process.env.ADZUNA_APP_ID = "id"
  process.env.ADZUNA_APP_KEY = "key"
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input)
    urls.push(url)
    const adzuna = (title: string, id: string) => ({ id, title, company: { display_name: "Acme" }, location: { display_name: "Gainesville, FL" }, description: "Mentor our interns.", redirect_url: "https://example.com", created: "" })
    const results = url.includes("adzuna")
      ? [adzuna("Software Engineering Intern", "a1"), adzuna("Senior Software Engineer", "a2")]
      : [{ id: 7, name: "Senior Staff Engineer", company: { name: "Muse Co" }, locations: [], contents: "", refs: { landing_page: "https://example.com" } }]
    return new Response(JSON.stringify({ results }))
  }) as typeof fetch
  try {
    const prefs = { roleTypes: ["Full Stack Developer"], jobType: ["Internship"], location: ["United States"] }
    const levels = allowedLevels(prefs)
    const jobs = dedupeJobs([...await fetchAdzunaJobs(prefs), ...await fetchMuseJobs(prefs.roleTypes, false, levels)])
    const kept = jobs.filter((job) => keepListing(job.title, job.description, levels)).map((job) => job.title)
    assert.deepEqual(kept, ["Software Engineering Intern"])

    const adzuna = urls.filter((url) => url.includes("adzuna")).map((url) => new URL(url))
    assert.ok(adzuna.length >= 4)
    assert.ok(adzuna.filter((url) => !url.searchParams.get("what")?.startsWith("co-op")).every((url) => /^intern/.test(url.searchParams.get("title_only") ?? "")))
    assert.ok(adzuna.every((url) => url.searchParams.get("what_exclude")?.includes("senior")))
    assert.ok(adzuna.some((url) => url.pathname.endsWith("/search/2")))
    const muse = urls.filter((url) => url.includes("themuse")).map((url) => new URL(url))
    assert.ok(muse.every((url) => url.searchParams.getAll("level").join() === "Internship"))
  } finally {
    globalThis.fetch = realFetch
  }
})

test("a product manager search keeps \"manager\" out of the exclusions", async () => {
  const urls: string[] = []
  const realFetch = globalThis.fetch
  globalThis.fetch = (async (input: string | URL | Request) => { urls.push(String(input)); return new Response(JSON.stringify({ results: [] })) }) as typeof fetch
  try {
    await fetchAdzunaJobs({ roleTypes: ["Product Manager"], jobType: ["Internship"], location: ["United States"] })
    const excludes = urls.map((url) => new URL(url).searchParams.get("what_exclude") ?? "")
    assert.ok(excludes.every((words) => !words.split(" ").includes("manager")))
  } finally {
    globalThis.fetch = realFetch
  }
})
