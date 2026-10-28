import type { Resume } from "@/app/api/parse/resumeSchema"

// Rough line costs for the Jake Gutierrez LaTeX template (letter, 11pt, \small bullets).
// Calibrated by compiling the template with pdflatex: pages first spill over at an
// estimate of ~66, so 60 leaves a few lines of slack for bolding and long names.
export const PAGE_LINES = 60
const CHARS_PER_LINE = 100
const HEADER_LINES = 4
const SECTION_LINES = 2
const SKILLS_LINES = 3

export const MAX_EXPERIENCE_BULLETS = 4
export const MAX_PROJECT_BULLETS = 3
const MIN_BULLETS = 2

type Experience = Resume["experience"][number]
type Project = Resume["projects"][number]

export const textLines = (text: string) => Math.max(1, Math.ceil(text.length / CHARS_PER_LINE))
const bulletLines = (bullets: string[]) => bullets.reduce((sum, b) => sum + textLines(b) + 0.15, 0)

export const experienceBullets = (e: Experience) => [...(e.responsibilities || []), ...(e.achievements || [])]
const projectBullets = (p: Project) =>
  p.highlights?.length ? p.highlights : p.description ? [p.description] : []

export const experienceLines = (e: Experience) => 2 + bulletLines(experienceBullets(e))
export const projectLines = (p: Project) => 1.5 + bulletLines(projectBullets(p))

/** Keeps the first `max` bullets, dropping responsibilities before achievements since those usually carry the metrics. */
export function capExperienceBullets(e: Experience, max = MAX_EXPERIENCE_BULLETS): Experience {
  const achievements = (e.achievements || []).slice(0, max)
  const responsibilities = (e.responsibilities || []).slice(0, Math.max(0, max - achievements.length))
  return { ...e, responsibilities, achievements }
}

export function capProjectBullets(p: Project, max = MAX_PROJECT_BULLETS): Project {
  return { ...p, highlights: (p.highlights || []).slice(0, max) }
}

/** Lines used by everything except the experience and project entries. */
export function fixedLines(resume: Resume): number {
  let lines = HEADER_LINES
  if (resume.education.length) {
    lines += SECTION_LINES + resume.education.reduce((sum, ed) => sum + 2 + bulletLines((ed.achievements || []).slice(0, 2)), 0)
  }
  if (Object.values(resume.skills).some((s) => s.length)) lines += SECTION_LINES + SKILLS_LINES
  if (resume.certifications.length) lines += SECTION_LINES + resume.certifications.length
  if (resume.achievements.length) {
    lines += SECTION_LINES + resume.achievements.reduce((sum, a) => sum + (a.description ? textLines(`${a.title}: ${a.description}`) : 1), 0)
  }
  if (resume.publications.length) lines += SECTION_LINES + resume.publications.length
  if (resume.extracurriculars.length) {
    lines += SECTION_LINES + resume.extracurriculars.reduce((sum, x) => sum + 2 + bulletLines((x.achievements || []).slice(0, 2)), 0)
  }
  return lines
}

export function estimateLines(resume: Resume): number {
  let lines = fixedLines(resume)
  if (resume.experience.length) lines += SECTION_LINES + resume.experience.reduce((sum, e) => sum + experienceLines(e), 0)
  if (resume.projects.length) lines += SECTION_LINES + resume.projects.reduce((sum, p) => sum + projectLines(p), 0)
  return lines
}

/**
 * Trims a resume until its estimate fits one page. Experience and projects are assumed to be
 * ordered most relevant first, so trimming starts at the end of each list. At least one
 * experience and one project are kept when the resume has them.
 */
export function fitToOnePage(input: Resume): Resume {
  const resume: Resume = {
    ...input,
    education: input.education.map((ed) => ({ ...ed, achievements: (ed.achievements || []).slice(0, 2) })),
    experience: input.experience.map((e) => capExperienceBullets(e)),
    projects: input.projects.map((p) => capProjectBullets(p)),
    extracurriculars: input.extracurriculars.map((x) => ({ ...x, achievements: (x.achievements || []).slice(0, 2) })),
  }

  const shortenLastLongEntry = () => {
    for (let i = resume.projects.length - 1; i >= 0; i--) {
      const p = resume.projects[i]
      if (p.highlights.length > MIN_BULLETS) {
        resume.projects[i] = capProjectBullets(p, p.highlights.length - 1)
        return true
      }
    }
    for (let i = resume.experience.length - 1; i >= 0; i--) {
      const e = resume.experience[i]
      const count = experienceBullets(e).length
      if (count > MIN_BULLETS) {
        resume.experience[i] = capExperienceBullets(e, count - 1)
        return true
      }
    }
    return false
  }

  // Cheapest losses first: secondary sections, then extra bullets, then whole entries.
  const steps: (() => boolean)[] = [
    () => resume.extracurriculars.pop() !== undefined,
    () => resume.publications.pop() !== undefined,
    () => resume.achievements.length > 2 && resume.achievements.pop() !== undefined,
    () => resume.certifications.length > 2 && resume.certifications.pop() !== undefined,
    shortenLastLongEntry,
    () => {
      const dropExperience = resume.experience.length > 1 && resume.experience.length >= resume.projects.length
      if (dropExperience) return resume.experience.pop() !== undefined
      return resume.projects.length > 1 && resume.projects.pop() !== undefined
    },
    () => resume.achievements.pop() !== undefined,
    () => resume.certifications.pop() !== undefined,
  ]

  while (estimateLines(resume) > PAGE_LINES) {
    if (!steps.some((step) => step())) break
  }
  return resume
}
