// Master profile model for the resume workspace. The profile is the only place
// facts live; the general resume and tailored resumes are views over it.

export type Visibility = "private" | "public"
export type Origin = "typed" | "imported" | "chat"

export type SectionKey = "education" | "experience" | "projects" | "skills" | "coursework"

export interface Bullet {
  id: string
  text: string
  visibility: Visibility
}

export interface ContactInfo {
  name: string
  email: string
  phone: string
  location: string
  linkedin: string
  github: string
  portfolio: string
  visibility: Visibility
}

interface EntryBase {
  id: string
  visibility: Visibility
  origin: Origin
}

export interface EducationEntry extends EntryBase {
  school: string
  degree: string
  field: string
  location: string
  startDate: string
  endDate: string
  gpa: string
  bullets: Bullet[]
}

export interface ExperienceEntry extends EntryBase {
  role: string
  organization: string
  location: string
  startDate: string
  endDate: string
  bullets: Bullet[]
}

export interface ProjectEntry extends EntryBase {
  name: string
  technologies: string[]
  link: string
  startDate: string
  endDate: string
  bullets: Bullet[]
}

export interface SkillEntry extends EntryBase {
  category: string
  skills: string[]
}

export interface CourseworkEntry extends EntryBase {
  code: string
  title: string
  term: string
}

export interface EntryByKey {
  education: EducationEntry
  experience: ExperienceEntry
  projects: ProjectEntry
  skills: SkillEntry
  coursework: CourseworkEntry
}

export type AnyEntry = EntryByKey[SectionKey]

export interface Section<K extends SectionKey> {
  visibility: Visibility
  items: EntryByKey[K][]
}

export interface MasterProfile {
  contact: ContactInfo
  sections: { [K in SectionKey]: Section<K> }
}

export type SuggestionKind = "contribution" | "metric" | "wording" | "skill" | "role-fit"

export type SuggestionChange =
  | { type: "replace-bullet"; entryId: string; bulletId: string; text: string }
  | { type: "add-bullet"; entryId: string; text: string }
  | { type: "add-skill"; entryId: string; skill: string }

export interface Suggestion {
  id: string
  section: SectionKey
  kind: SuggestionKind
  title: string
  reason: string
  change: SuggestionChange
}

export interface TailoredResume {
  id: string
  role: string
  company: string
  jobDescription: string
  createdAt: string
  entryIds: string[]
  bulletIds: string[]
  // Accepted tailoring lives here, scoped to this resume. It never reaches the profile.
  overrides: Record<string, string>
  addedBullets: Record<string, Bullet[]>
  suggestions: Suggestion[]
  dismissed: string[]
}

export interface HistoryEntry {
  id: string
  at: string
  summary: string
  section: SectionKey | "contact" | "tailor"
}

export interface WorkspaceState {
  profile: MasterProfile
  suggestions: Suggestion[]
  dismissed: string[]
  tailored: TailoredResume[]
  history: HistoryEntry[]
}
