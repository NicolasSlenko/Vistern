import type { Resume } from "@/app/api/parse/resumeSchema"
import { hasContent } from "./blank"

/**
 * A resume as Jake Gutierrez's LaTeX template, written straight from the data.
 *
 * No AI: the student's words go in exactly as they are, so what they edited is
 * what compiles. The sections and their order follow the page
 * (components/resume-paper/resume-paper.tsx), so the .tex and the printed PDF
 * say the same thing.
 *
 * The preamble is a copy of JAKE_TEMPLATE in app/api/export/latex/route.ts,
 * which still serves the AI-written export used by the job matcher.
 */

const PREAMBLE = String.raw`%-------------------------
% Resume in LaTeX
% Author : Jake Gutierrez (template)
%------------------------

\documentclass[letterpaper,11pt]{article}

\usepackage{latexsym}
\usepackage[empty]{fullpage}
\usepackage{titlesec}
\usepackage{marvosym}
\usepackage[usenames,dvipsnames]{color}
\usepackage{verbatim}
\usepackage{enumitem}
\usepackage[hidelinks]{hyperref}
\usepackage{fancyhdr}
\usepackage[english]{babel}
\usepackage{tabularx}
\input{glyphtounicode}

\pagestyle{fancy}
\fancyhf{}
\fancyfoot{}
\renewcommand{\headrulewidth}{0pt}
\renewcommand{\footrulewidth}{0pt}

% Margins
\addtolength{\oddsidemargin}{-0.5in}
\addtolength{\evensidemargin}{-0.5in}
\addtolength{\textwidth}{1in}
\addtolength{\topmargin}{-.5in}
\addtolength{\textheight}{1.0in}

\urlstyle{same}
\raggedbottom
\raggedright
\setlength{\tabcolsep}{0in}

% Section formatting
\titleformat{\section}{
  \vspace{-4pt}\scshape\raggedright\large
}{}{0em}{}[\color{black}\titlerule \vspace{-5pt}]

% Ensure ATS readability
\pdfgentounicode=1

%-------------------------
% Custom commands
\newcommand{\resumeItem}[1]{
  \item\small{#1 \vspace{-2pt}}
}

\newcommand{\resumeSubheading}[4]{
  \vspace{-3pt}\item
    \begin{tabular*}{0.97\textwidth}[t]{l@{\extracolsep{\fill}}r}
      \textbf{#1} & #2 \\
      \textit{\small#3} & \textit{\small #4} \\
    \end{tabular*}\vspace{-7pt}
}

\newcommand{\resumeSubSubheading}[2]{
    \item
    \begin{tabular*}{0.97\textwidth}{l@{\extracolsep{\fill}}r}
      \textit{\small#1} & \textit{\small #2} \\
    \end{tabular*}\vspace{-7pt}
}

\newcommand{\resumeProjectHeading}[2]{
    \item
    \begin{tabular*}{0.97\textwidth}{l@{\extracolsep{\fill}}r}
      \small#1 & #2 \\
    \end{tabular*}\vspace{-7pt}
}

\newcommand{\resumeSubItem}[1]{\resumeItem{#1}\vspace{-4pt}}
\renewcommand\labelitemii{$\vcenter{\hbox{\tiny$\bullet$}}$}

\newcommand{\resumeSubHeadingListStart}{\begin{itemize}[leftmargin=0.15in, label={}]}
\newcommand{\resumeSubHeadingListEnd}{\end{itemize}}
\newcommand{\resumeItemListStart}{\begin{itemize}}
\newcommand{\resumeItemListEnd}{\end{itemize}\vspace{-6pt}}

%-------------------------------------------
%%%%%%  RESUME STARTS HERE  %%%%%%%%%%%%%%%%%

\begin{document}
`

const SPECIAL: Record<string, string> = {
  "\\": "\\textbackslash{}",
  "&": "\\&",
  "%": "\\%",
  $: "\\$",
  "#": "\\#",
  _: "\\_",
  "{": "\\{",
  "}": "\\}",
  "~": "\\textasciitilde{}",
  "^": "\\textasciicircum{}",
}

/** Text as LaTeX reads it literally. One pass, so an escape is never escaped again. */
export function escapeLatex(text: string | null | undefined): string {
  return (text ?? "").replace(/[\\&%$#_{}~^]/g, (char) => SPECIAL[char])
}

/** A URL inside \href's first argument, where only % and # need a backslash. */
const hrefUrl = (url: string) => {
  const full = /^[a-z][a-z0-9+.-]*:/i.test(url) ? url : url.includes("@") && !url.includes("/") ? `mailto:${url}` : `https://${url}`
  return full.replace(/[%#\\{}]/g, (char) => `\\${char}`)
}
/** How a link reads on the page: no scheme, no www, no trailing slash. */
const shownUrl = (url: string) => url.replace(/^[a-z]+:\/\//i, "").replace(/^www\./i, "").replace(/\/$/, "")

/** A web address, as opposed to a word: a domain with a dot in it, no spaces. */
const looksLikeUrl = (value: string) => /^(?:[a-z][a-z0-9+.-]*:\/\/)?[^\s/@]+\.[a-z]{2,}(?:[/?#]\S*)?$/i.test(value.trim())
const looksLikeEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())

/**
 * A link when it is one. A field holding "LinkedIn" rather than an address is
 * printed as written instead of becoming \href{https://LinkedIn}.
 */
const link = (value: string) =>
  looksLikeUrl(value) ? `\\href{${hrefUrl(value)}}{\\underline{${escapeLatex(shownUrl(value))}}}` : escapeLatex(value)

const clean = (values: (string | number | null | undefined)[]) =>
  values.map((value) => (value === null || value === undefined ? "" : String(value).trim())).filter(Boolean)

/** The same range the page prints. An empty end date reads as ongoing. */
function dateRange(start?: string, end?: string): string {
  const from = start?.trim()
  const to = end?.trim()
  if (from && to) return `${from} -- ${to}`
  if (from) return `${from} -- Present`
  return to || ""
}

function items(bullets: string[], indent = "      "): string[] {
  const lines = bullets.map((bullet) => bullet.trim()).filter(Boolean)
  if (!lines.length) return []
  return [`${indent}\\resumeItemListStart`, ...lines.map((line) => `${indent}  \\resumeItem{${escapeLatex(line)}}`), `${indent}\\resumeItemListEnd`]
}

function header(basics: Resume["basics"]): string[] {
  const city = clean([basics.location?.city, basics.location?.state]).join(", ")
  const contact = [
    ...clean([basics.phone]).map(escapeLatex),
    ...clean([basics.email]).map((email) =>
      looksLikeEmail(email) ? `\\href{${hrefUrl(email)}}{\\underline{${escapeLatex(email)}}}` : escapeLatex(email),
    ),
    ...clean([basics.linkedin, basics.github, basics.portfolio]).map(link),
    ...clean([city]).map(escapeLatex),
  ]
  return [
    "\\begin{center}",
    `    \\textbf{\\Huge \\scshape ${escapeLatex(basics.name || "Your name")}} \\\\ \\vspace{1pt}`,
    ...(contact.length ? [`    \\small ${contact.join(" $|$ ")}`] : []),
    "\\end{center}",
  ]
}

function section(title: string, body: string[]): string[] {
  if (!body.length) return []
  return ["", `\\section{${title}}`, "  \\resumeSubHeadingListStart", ...body, "  \\resumeSubHeadingListEnd"]
}

/** The whole document, ready for pdflatex or Overleaf. */
export function resumeToLatex(resume: Resume): string {
  const education = (resume.education ?? []).filter(hasContent).flatMap((entry) => [
    "    \\resumeSubheading",
    `      {${escapeLatex(entry.school)}}{${escapeLatex(dateRange(entry.start_date, entry.end_date))}}`,
    `      {${escapeLatex(
      clean([entry.degree, entry.field !== entry.degree ? entry.field : "", entry.gpa ? `GPA: ${entry.gpa}` : ""]).join(", "),
    )}}{}`,
    ...items(entry.achievements ?? []),
  ])

  const experience = (resume.experience ?? []).filter(hasContent).flatMap((entry) => [
    "    \\resumeSubheading",
    `      {${escapeLatex(entry.position)}}{${escapeLatex(dateRange(entry.start_date, entry.end_date))}}`,
    `      {${escapeLatex(entry.company)}}{${escapeLatex(entry.location)}}`,
    ...items([...(entry.responsibilities ?? []), ...(entry.achievements ?? [])]),
  ])

  const projects = (resume.projects ?? []).filter(hasContent).flatMap((entry) => {
    const tech = (entry.technologies ?? []).filter(Boolean)
    const title = `\\textbf{${escapeLatex(entry.name)}}${tech.length ? ` $|$ \\emph{${escapeLatex(tech.join(", "))}}` : ""}`
    const right = entry.link?.trim() ? link(entry.link.trim()) : ""
    // The page prints a description as a line of its own above the bullets.
    const description = entry.description?.trim()
    const bullets = items(entry.highlights ?? [])
    const body = description
      ? bullets.length
        ? [bullets[0], `        \\item[] \\small{${escapeLatex(description)}}`, ...bullets.slice(1)]
        : ["      \\resumeItemListStart", `        \\item[] \\small{${escapeLatex(description)}}`, "      \\resumeItemListEnd"]
      : bullets
    return ["    \\resumeProjectHeading", `      {${title}}{${right}}`, ...body]
  })

  const skillRows: [string, string[]][] = [
    ["Languages", resume.skills?.programming_languages ?? []],
    ["Frameworks", [...(resume.skills?.frameworks ?? []), ...(resume.skills?.libraries ?? [])]],
    ["Databases", resume.skills?.databases ?? []],
    ["Tools", [...(resume.skills?.devops_tools ?? []), ...(resume.skills?.cloud_platforms ?? [])]],
    ["Other", resume.skills?.other ?? []],
  ]
  const shownSkills = skillRows.filter(([, values]) => values.some((value) => value.trim()))
  const skills = shownSkills.length
    ? [
        "",
        "\\section{Technical Skills}",
        " \\begin{itemize}[leftmargin=0.15in, label={}]",
        "    \\small{\\item{",
        shownSkills
          .map(([label, values]) => `     \\textbf{${label}}{: ${escapeLatex(values.filter((v) => v.trim()).join(", "))}}`)
          .join(" \\\\\n"),
        "    }}",
        " \\end{itemize}",
      ]
    : []

  const leadership = (resume.extracurriculars ?? []).filter(hasContent).flatMap((entry) => [
    "    \\resumeSubheading",
    `      {${escapeLatex(entry.organization)}}{${escapeLatex(dateRange(entry.start_date, entry.end_date))}}`,
    `      {${escapeLatex(entry.role)}}{}`,
  ])

  return [
    PREAMBLE,
    ...header(resume.basics),
    ...section("Education", education),
    ...section("Experience", experience),
    ...section("Projects", projects),
    ...skills,
    ...section("Leadership", leadership),
    "",
    "\\end{document}",
    "",
  ].join("\n")
}
