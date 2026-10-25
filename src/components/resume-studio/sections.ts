import {
  Award,
  BadgeCheck,
  BookText,
  Briefcase,
  FolderGit2,
  GraduationCap,
  UserRound,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react"
import type { Resume } from "@/app/api/parse/resumeSchema"

/**
 * What the studio can edit, and how each part of the resume is laid out as a
 * form. The shapes come from the Zod schema in app/api/parse/resumeSchema.ts,
 * which stays the source of truth: a field named here must exist there.
 */

export type FieldKind = "text" | "prose" | "bullets" | "tags"

export interface FieldSpec {
  key: string
  label: string
  kind: FieldKind
  placeholder?: string
  /** Half the width of the card's grid on a roomy card; full width otherwise. */
  half?: boolean
  hint?: string
  /** A web address: no spelling marks, no capital first letter, a URL keyboard on phones. */
  web?: boolean
}

/** The parts of the resume that are a list of entries. */
export type ListSection = "education" | "experience" | "projects" | "achievements" | "certifications" | "publications" | "extracurriculars"

/** Everything the left bar can open, in the order it lists them. */
export type SectionRef = "profile" | ListSection | "skills"

export interface ListSectionSpec {
  name: ListSection
  title: string
  /** What one entry is called, for "Add an experience" and the like. */
  singular: string
  icon: LucideIcon
  blank: () => Record<string, unknown>
  /** The field that names an entry in its folded card. */
  titleKey: string
  /** A second field shown after it, quieter. */
  secondKey?: string
  /** Fields joined with " · " on the folded card's second line. */
  metaKeys?: string[]
  fields: FieldSpec[]
}

const DATE_HINT = "YYYY-MM, or leave blank"

export const LIST_SECTIONS: Record<ListSection, ListSectionSpec> = {
  education: {
    name: "education",
    title: "Education",
    singular: "school",
    icon: GraduationCap,
    titleKey: "school",
    secondKey: "degree",
    metaKeys: ["field", "start_date", "end_date"],
    blank: () => ({ school: "", degree: "", field: "", start_date: "", end_date: "", gpa: "", achievements: [] }),
    fields: [
      { key: "school", label: "School", kind: "text", placeholder: "University of Florida" },
      { key: "degree", label: "Degree", kind: "text", placeholder: "B.S.", half: true },
      { key: "field", label: "Field", kind: "text", placeholder: "Computer Science", half: true },
      { key: "start_date", label: "Started", kind: "text", placeholder: "2023-08", half: true, hint: DATE_HINT },
      { key: "end_date", label: "Ends", kind: "text", placeholder: "2027-05", half: true, hint: DATE_HINT },
      { key: "gpa", label: "GPA", kind: "text", placeholder: "3.8", half: true },
      { key: "achievements", label: "Honours and awards", kind: "bullets", placeholder: "Dean's List, Fall 2024" },
    ],
  },
  experience: {
    name: "experience",
    title: "Experience",
    singular: "role",
    icon: Briefcase,
    titleKey: "company",
    secondKey: "position",
    metaKeys: ["start_date", "end_date", "location"],
    blank: () => ({
      company: "",
      position: "",
      start_date: "",
      end_date: "",
      location: "",
      responsibilities: [],
      achievements: [],
      technologies: [],
    }),
    fields: [
      { key: "company", label: "Company", kind: "text", placeholder: "Acme", half: true },
      { key: "position", label: "Role", kind: "text", placeholder: "Software Engineering Intern", half: true },
      { key: "start_date", label: "Started", kind: "text", placeholder: "2025-05", half: true, hint: DATE_HINT },
      { key: "end_date", label: "Ended", kind: "text", placeholder: "Present", half: true, hint: DATE_HINT },
      { key: "location", label: "Location", kind: "text", placeholder: "Gainesville, FL" },
      {
        key: "responsibilities",
        label: "What you did",
        kind: "bullets",
        placeholder: "Built X using Y, which cut Z by 30%",
        hint: "One bullet per line. Say what you did, how, and what changed because of it.",
      },
      { key: "achievements", label: "Stand-out results", kind: "bullets", placeholder: "Shipped the feature two sprints early" },
      { key: "technologies", label: "Tools", kind: "tags", placeholder: "TypeScript, React, Postgres" },
    ],
  },
  projects: {
    name: "projects",
    title: "Projects",
    singular: "project",
    icon: FolderGit2,
    titleKey: "name",
    metaKeys: ["technologies"],
    blank: () => ({ name: "", description: "", technologies: [], highlights: [], link: "", github: "" }),
    fields: [
      { key: "name", label: "Project", kind: "text", placeholder: "Vistern" },
      { key: "link", label: "Link", kind: "text", placeholder: "vistern.app", half: true, web: true },
      { key: "github", label: "Source", kind: "text", placeholder: "github.com/you/project", half: true, web: true },
      { key: "description", label: "What it is", kind: "prose", placeholder: "One or two lines on what it does and who it's for." },
      {
        key: "highlights",
        label: "Highlights",
        kind: "bullets",
        placeholder: "Cut page load from 2.1s to 400ms by …",
        hint: "One bullet per line. Numbers beat adjectives.",
      },
      { key: "technologies", label: "Built with", kind: "tags", placeholder: "Next.js, Postgres, AWS" },
    ],
  },
  achievements: {
    name: "achievements",
    title: "Awards",
    singular: "award",
    icon: Award,
    titleKey: "title",
    secondKey: "issuer",
    metaKeys: ["date"],
    blank: () => ({ title: "", issuer: "", date: "", description: "" }),
    fields: [
      { key: "title", label: "Award", kind: "text", placeholder: "First place, HackUF" },
      { key: "issuer", label: "Given by", kind: "text", placeholder: "UF ACM", half: true },
      { key: "date", label: "Date", kind: "text", placeholder: "2025-03", half: true, hint: DATE_HINT },
      { key: "description", label: "What it was for", kind: "prose" },
    ],
  },
  certifications: {
    name: "certifications",
    title: "Certifications",
    singular: "certification",
    icon: BadgeCheck,
    titleKey: "name",
    secondKey: "issuer",
    metaKeys: ["date"],
    blank: () => ({ name: "", issuer: "", date: "", credential_id: "", url: "" }),
    fields: [
      { key: "name", label: "Certification", kind: "text", placeholder: "AWS Certified Cloud Practitioner" },
      { key: "issuer", label: "Issued by", kind: "text", placeholder: "Amazon Web Services", half: true },
      { key: "date", label: "Date", kind: "text", placeholder: "2025-01", half: true, hint: DATE_HINT },
      { key: "credential_id", label: "Credential ID", kind: "text", half: true },
      { key: "url", label: "Verify at", kind: "text", half: true, web: true },
    ],
  },
  publications: {
    name: "publications",
    title: "Publications",
    singular: "publication",
    icon: BookText,
    titleKey: "title",
    secondKey: "publisher",
    metaKeys: ["date"],
    blank: () => ({ title: "", publisher: "", date: "", url: "", summary: "" }),
    fields: [
      { key: "title", label: "Title", kind: "text" },
      { key: "publisher", label: "Published in", kind: "text", half: true },
      { key: "date", label: "Date", kind: "text", half: true, hint: DATE_HINT },
      { key: "url", label: "Link", kind: "text", web: true },
      { key: "summary", label: "Summary", kind: "prose" },
    ],
  },
  extracurriculars: {
    name: "extracurriculars",
    title: "Activities",
    singular: "activity",
    icon: Users,
    titleKey: "organization",
    secondKey: "role",
    metaKeys: ["start_date", "end_date"],
    blank: () => ({ organization: "", role: "", start_date: "", end_date: "", achievements: [] }),
    fields: [
      { key: "organization", label: "Organisation", kind: "text", placeholder: "UF ACM", half: true },
      { key: "role", label: "Role", kind: "text", placeholder: "Project lead", half: true },
      { key: "start_date", label: "Started", kind: "text", half: true, hint: DATE_HINT },
      { key: "end_date", label: "Ended", kind: "text", half: true, hint: DATE_HINT },
      { key: "achievements", label: "What you did", kind: "bullets" },
    ],
  },
}

/** The order the left bar lists them in. */
export const SECTION_ORDER: SectionRef[] = [
  "profile",
  "education",
  "experience",
  "projects",
  "skills",
  "achievements",
  "certifications",
  "publications",
  "extracurriculars",
]

export const SECTION_ICONS: Record<SectionRef, LucideIcon> = {
  profile: UserRound,
  skills: Wrench,
  education: GraduationCap,
  experience: Briefcase,
  projects: FolderGit2,
  achievements: Award,
  certifications: BadgeCheck,
  publications: BookText,
  extracurriculars: Users,
}

export const SECTION_TITLES: Record<SectionRef, string> = {
  profile: "Profile",
  skills: "Skills",
  education: "Education",
  experience: "Experience",
  projects: "Projects",
  achievements: "Awards",
  certifications: "Certifications",
  publications: "Publications",
  extracurriculars: "Activities",
}

/** The skill groups, in the order the Skills form shows them. */
export const SKILL_GROUPS: { key: keyof Resume["skills"]; label: string; placeholder: string }[] = [
  { key: "programming_languages", label: "Languages", placeholder: "Python, TypeScript, Java" },
  { key: "frameworks", label: "Frameworks", placeholder: "React, Next.js, Django" },
  { key: "libraries", label: "Libraries", placeholder: "pandas, NumPy, PyTorch" },
  { key: "databases", label: "Databases", placeholder: "Postgres, Redis, MongoDB" },
  { key: "devops_tools", label: "Tooling", placeholder: "Docker, Git, GitHub Actions" },
  { key: "cloud_platforms", label: "Cloud", placeholder: "AWS, GCP, Vercel" },
  { key: "other", label: "Anything else", placeholder: "Figma, Linux, technical writing" },
]

/** How many entries each list section has, for the counts in the left bar. */
export function entryCounts(resume: Resume | null): Record<ListSection, number> {
  const counts = {} as Record<ListSection, number>
  for (const name of Object.keys(LIST_SECTIONS) as ListSection[]) {
    counts[name] = resume?.[name]?.length ?? 0
  }
  return counts
}

/** How many skills are listed across every group. */
export function skillCount(resume: Resume | null): number {
  if (!resume?.skills) return 0
  return SKILL_GROUPS.reduce((total, group) => total + (resume.skills[group.key]?.length ?? 0), 0)
}
