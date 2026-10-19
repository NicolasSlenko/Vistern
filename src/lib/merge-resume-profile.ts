import type { Resume } from "@/app/api/parse/resumeSchema"

const skillCategories = [
  "programming_languages",
  "frameworks",
  "libraries",
  "databases",
  "devops_tools",
  "cloud_platforms",
  "other",
] as const

const normalize = (value: string) => value.trim().toLowerCase()

/** Preserve the master profile and append newly confirmed work and skills. */
export function mergeResumeProfile(current: Resume | null, incoming: Resume): Resume {
  if (!current) return structuredClone(incoming)
  const merged = structuredClone(current)

  for (const experience of incoming.experience) {
    const exists = merged.experience.some(
      (item) =>
        normalize(item.company) === normalize(experience.company) &&
        normalize(item.position) === normalize(experience.position),
    )
    if (!exists) merged.experience.push(structuredClone(experience))
  }

  for (const project of incoming.projects) {
    if (!merged.projects.some((item) => normalize(item.name) === normalize(project.name))) {
      merged.projects.push(structuredClone(project))
    }
  }

  for (const category of skillCategories) {
    const existing = new Set(merged.skills[category].map(normalize))
    for (const skill of incoming.skills[category]) {
      const key = normalize(skill)
      if (key && !existing.has(key)) {
        merged.skills[category].push(skill)
        existing.add(key)
      }
    }
  }

  return merged
}
