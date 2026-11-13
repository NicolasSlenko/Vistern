import { test } from "node:test"
import assert from "node:assert/strict"
import { escapeLatex, resumeToLatex } from "../src/lib/resume/latex"
import { getResumeObject, type Resume } from "../src/app/api/parse/resumeSchema"

function resume(): Resume {
  const r = getResumeObject()
  r.basics.name = "Ada Gator"
  r.basics.email = "ada@ufl.edu"
  r.basics.github = "github.com/ada_g"
  r.education = [{ school: "University of Florida", degree: "B.S.", field: "Computer Science", start_date: "Aug 2023", end_date: "May 2027", gpa: "3.9", achievements: [] }]
  r.experience = [
    {
      company: "Acme & Co",
      position: "SWE Intern",
      start_date: "May 2025",
      end_date: "",
      location: "Gainesville, FL",
      responsibilities: ["Cut p95 latency 40% by caching $HOT_PATH queries"],
      achievements: ["Shipped #1 feature"],
      technologies: [],
    },
  ]
  r.projects = [{ name: "Vistern", description: "Career workspace", technologies: ["Next.js", "C#"], highlights: ["Built it_all"], link: "", github: "" }]
  r.skills.programming_languages = ["C++", "Python"]
  return r
}

test("special characters are escaped once", () => {
  assert.equal(escapeLatex("50% of R&D_{x} #1 ~ ^ $5 \\"), "50\\% of R\\&D\\_\\{x\\} \\#1 \\textasciitilde{} \\textasciicircum{} \\$5 \\textbackslash{}")
  assert.equal(escapeLatex(undefined), "")
})

test("the document is complete and every line the student wrote is in it verbatim", () => {
  const tex = resumeToLatex(resume())
  assert.ok(tex.startsWith("%-------------------------"))
  assert.ok(tex.includes("\\documentclass[letterpaper,11pt]{article}"))
  assert.ok(tex.trimEnd().endsWith("\\end{document}"))

  for (const line of [
    "\\resumeItem{Cut p95 latency 40\\% by caching \\$HOT\\_PATH queries}",
    "\\resumeItem{Shipped \\#1 feature}",
    "\\resumeItem{Built it\\_all}",
    "{SWE Intern}{May 2025 -- Present}",
    "{Acme \\& Co}{Gainesville, FL}",
    "\\textbf{Vistern} $|$ \\emph{Next.js, C\\#}",
    "\\item[] \\small{Career workspace}",
    "{B.S., Computer Science, GPA: 3.9}{}",
    "\\textbf{Languages}{: C++, Python}",
  ]) {
    assert.ok(tex.includes(line), `missing: ${line}`)
  }
  // Counted in the body only: the preamble's own \resumeSubItem uses \resumeItem too.
  const body = tex.slice(tex.indexOf("\\begin{document}"))
  assert.equal(body.match(/\\resumeItem\{/g)?.length, 3)
})

test("sections run in the page's order and empty ones are left out", () => {
  const tex = resumeToLatex(resume())
  const order = ["\\section{Education}", "\\section{Experience}", "\\section{Projects}", "\\section{Technical Skills}"].map((s) => tex.indexOf(s))
  assert.ok(order.every((at) => at > 0))
  assert.deepEqual([...order].sort((a, b) => a - b), order)
  assert.ok(!tex.includes("\\section{Leadership}"))
})

test("links keep their address and show it without the scheme", () => {
  const tex = resumeToLatex(resume())
  assert.ok(tex.includes("\\href{https://github.com/ada_g}{\\underline{github.com/ada\\_g}}"))
  assert.ok(tex.includes("\\href{mailto:ada@ufl.edu}{\\underline{ada@ufl.edu}}"))
})
