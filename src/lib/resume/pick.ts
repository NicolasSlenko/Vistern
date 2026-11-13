import type { Resume } from "@/app/api/parse/resumeSchema"

/**
 * Which parts of the master profile go into a new resume.
 *
 * The profile is the record; a resume is a selection from it. A pick names
 * entries by their index in the profile and drops bullets by key, so building
 * the resume is a pure function of the two and the profile itself is never
 * touched. Only the sections the page prints can be picked — the rest come
 * out empty, rather than riding along unseen.
 */

/** Sections that are a list of entries the page prints. */
export const PICK_SECTIONS = ["education", "experience", "projects", "extracurriculars"] as const
export type PickSection = (typeof PICK_SECTIONS)[number]

/** The bullet fields that can be picked line by line. */
export const BULLET_FIELDS = {
  experience: ["responsibilities", "achievements"],
  projects: ["highlights"],
} as const
export type BulletSection = keyof typeof BULLET_FIELDS

export type SkillGroup = keyof Resume["skills"]

export interface ProfilePick {
  /** Chosen entry indexes, per section, in profile order. */
  entries: Record<PickSection, number[]>
  /** Bullets left out, by `bulletKey`. */
  droppedBullets: string[]
  /** Chosen skills, per group. */
  skills: Record<SkillGroup, string[]>
}

export const bulletKey = (section: BulletSection, entryIndex: number, field: string, bulletIndex: number) =>
  `${section}.${entryIndex}.${field}.${bulletIndex}`

const indexes = (list: unknown[] | undefined) => (list ?? []).map((_, index) => index)

/** Everything ticked: the starting point, so the student unticks rather than ticks. */
export function defaultPick(profile: Resume): ProfilePick {
  return {
    entries: {
      education: indexes(profile.education),
      experience: indexes(profile.experience),
      projects: indexes(profile.projects),
      extracurriculars: indexes(profile.extracurriculars),
    },
    droppedBullets: [],
    skills: Object.fromEntries(
      Object.entries(profile.skills ?? {}).map(([group, list]) => [group, [...(list ?? [])]]),
    ) as Record<SkillGroup, string[]>,
  }
}

/** The resume the pick describes. Profile order is kept; nothing is reworded. */
export function pickFromProfile(profile: Resume, pick: ProfilePick): Resume {
  const dropped = new Set(pick.droppedBullets)
  const chosen = <T,>(section: PickSection, list: T[] | undefined): [T, number][] => {
    const wanted = new Set(pick.entries[section] ?? [])
    return (list ?? []).map((item, index) => [item, index] as [T, number]).filter(([, index]) => wanted.has(index))
  }
  const keep = (section: BulletSection, entryIndex: number, field: string, bullets: string[] | undefined) =>
    (bullets ?? []).filter((_, bulletIndex) => !dropped.has(bulletKey(section, entryIndex, field, bulletIndex)))

  const skills = {} as Resume["skills"]
  for (const [group, list] of Object.entries(profile.skills ?? {}) as [SkillGroup, string[]][]) {
    const wanted = new Set(pick.skills[group] ?? [])
    skills[group] = (list ?? []).filter((skill) => wanted.has(skill))
  }

  return {
    basics: profile.basics,
    education: chosen("education", profile.education).map(([entry]) => entry),
    experience: chosen("experience", profile.experience).map(([entry, index]) => ({
      ...entry,
      responsibilities: keep("experience", index, "responsibilities", entry.responsibilities),
      achievements: keep("experience", index, "achievements", entry.achievements),
    })),
    projects: chosen("projects", profile.projects).map(([entry, index]) => ({
      ...entry,
      highlights: keep("projects", index, "highlights", entry.highlights),
    })),
    extracurriculars: chosen("extracurriculars", profile.extracurriculars).map(([entry]) => entry),
    skills,
    achievements: [],
    certifications: [],
    publications: [],
  }
}

/** Ticks or unticks one entry, keeping the list in profile order. */
export function toggleEntry(pick: ProfilePick, section: PickSection, index: number): ProfilePick {
  const current = pick.entries[section] ?? []
  const next = current.includes(index) ? current.filter((at) => at !== index) : [...current, index].sort((a, b) => a - b)
  return { ...pick, entries: { ...pick.entries, [section]: next } }
}

export function toggleBullet(pick: ProfilePick, key: string): ProfilePick {
  const droppedBullets = pick.droppedBullets.includes(key)
    ? pick.droppedBullets.filter((dropped) => dropped !== key)
    : [...pick.droppedBullets, key]
  return { ...pick, droppedBullets }
}

export function toggleSkill(pick: ProfilePick, group: SkillGroup, skill: string, profile: Resume): ProfilePick {
  const current = pick.skills[group] ?? []
  const on = current.includes(skill)
  // Rebuilt from the profile's list, so a re-ticked skill goes back in its place.
  const next = (profile.skills?.[group] ?? []).filter((item) => (item === skill ? !on : current.includes(item)))
  return { ...pick, skills: { ...pick.skills, [group]: next } }
}

/**
 * Every entry of a section, or none. "All" means all: the bullets unticked in
 * that section come back too, rather than returning with their entries still
 * missing lines.
 */
export function setSection(pick: ProfilePick, section: PickSection, profile: Resume, on: boolean): ProfilePick {
  return {
    ...pick,
    entries: { ...pick.entries, [section]: on ? indexes(profile[section]) : [] },
    droppedBullets: on ? pick.droppedBullets.filter((key) => !key.startsWith(`${section}.`)) : pick.droppedBullets,
  }
}

/** Every skill, or none. */
export function setSkills(pick: ProfilePick, profile: Resume, on: boolean): ProfilePick {
  const skills = Object.fromEntries(
    Object.entries(profile.skills ?? {}).map(([group, list]) => [group, on ? [...(list ?? [])] : []]),
  ) as Record<SkillGroup, string[]>
  return { ...pick, skills }
}
