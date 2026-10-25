import type { Resume } from "@/app/api/parse/resumeSchema"

/**
 * What a newly uploaded resume would change about the master profile.
 *
 * A student uploads a resume more than once: a second version, a tailored
 * copy, a refreshed one a year later. Overwriting the profile with whatever
 * the latest file happens to say loses work — a tailored resume is a
 * *subset*, so the job it leaves out is not a job the student stopped having.
 *
 * So nothing is ever removed here. The upload can only propose additions and
 * revisions, and the student says yes or no to each one. The two rules that
 * follow from that:
 *
 *   - An entry in the profile but missing from the upload is left alone.
 *   - An entry whose wording changed is offered as a revision, never applied
 *     silently, because the older wording may be the better one.
 */

export type ChangeKind = "added" | "revised"

export type ChangeSection = "education" | "experience" | "projects" | "skills" | "basics"

export interface ProposedChange {
  id: string
  section: ChangeSection
  kind: ChangeKind
  /** What the entry is called, for the student to recognise it by. */
  title: string
  /** Where it sits, if it revises something: "Acme · Engineer". */
  subtitle?: string
  /** For a revision, the fields that differ, as they read now and as proposed. */
  fields?: { label: string; before: string; after: string }[]
  /** For an addition, a few lines of what is being added. */
  preview?: string[]
  /** Where it goes when accepted. */
  target: { index: number } | { append: true }
  /** The entry as it would be after accepting. */
  value: unknown
}

const clean = (value: unknown) => (typeof value === "string" ? value.trim() : "")
const key = (value: unknown) => clean(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
const list = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim() !== "") : []

/** Two entries are the same thing if the words that identify them match. */
const identity = {
  education: (entry: Record<string, unknown>) => key(entry.school),
  experience: (entry: Record<string, unknown>) => `${key(entry.company)}|${key(entry.position)}`,
  projects: (entry: Record<string, unknown>) => key(entry.name),
}

/** How an entry names itself in the list. */
const naming = {
  education: (entry: Record<string, unknown>) => ({ title: clean(entry.school) || "Education", subtitle: clean(entry.degree) }),
  experience: (entry: Record<string, unknown>) => ({ title: clean(entry.position) || "Role", subtitle: clean(entry.company) }),
  projects: (entry: Record<string, unknown>) => ({ title: clean(entry.name) || "Project", subtitle: clean(entry.description) }),
}

/** Which fields are worth asking about, per section. Bullets are compared as a whole. */
const COMPARED: Record<"education" | "experience" | "projects", { k: string; label: string }[]> = {
  education: [
    { k: "degree", label: "Degree" },
    { k: "field", label: "Field" },
    { k: "start_date", label: "Start" },
    { k: "end_date", label: "End" },
    { k: "gpa", label: "GPA" },
  ],
  experience: [
    { k: "location", label: "Location" },
    { k: "start_date", label: "Start" },
    { k: "end_date", label: "End" },
    { k: "responsibilities", label: "Bullets" },
    { k: "achievements", label: "Achievements" },
  ],
  projects: [
    { k: "description", label: "Description" },
    { k: "technologies", label: "Built with" },
    { k: "highlights", label: "Bullets" },
    { k: "link", label: "Link" },
  ],
}

const show = (value: unknown): string => (Array.isArray(value) ? list(value).join(" · ") : clean(value ?? ""))

/**
 * Whether a difference is worth interrupting the student for.
 *
 * Re-parsing the same PDF twice rarely gives byte-identical text — spacing,
 * punctuation and casing drift. Asking about those would train people to
 * click through the list without reading it, which defeats the point.
 */
function differs(before: unknown, after: unknown): boolean {
  const a = show(before)
  const b = show(after)
  if (key(a) === key(b)) return false
  // Nothing new to say: the upload is silent where the profile has something.
  if (b === "") return false
  return true
}

/** The entries one section would gain or change. */
function diffSection(
  section: "education" | "experience" | "projects",
  current: Record<string, unknown>[],
  incoming: Record<string, unknown>[],
): ProposedChange[] {
  const changes: ProposedChange[] = []
  const idOf = identity[section]
  const nameOf = naming[section]
  const seen = new Map(current.map((entry, index) => [idOf(entry), index]))

  incoming.forEach((entry, at) => {
    const id = idOf(entry)
    if (!id.replace(/\|/g, "").trim()) return
    const index = seen.get(id)

    if (index === undefined) {
      const { title, subtitle } = nameOf(entry)
      changes.push({
        id: `${section}:add:${at}`,
        section,
        kind: "added",
        title,
        subtitle,
        preview: [
          ...list(entry.responsibilities ?? entry.highlights ?? entry.achievements).slice(0, 3),
          ...(show(entry.start_date) || show(entry.end_date)
            ? [[show(entry.start_date), show(entry.end_date)].filter(Boolean).join(" – ")]
            : []),
        ].filter(Boolean),
        target: { append: true },
        value: entry,
      })
      return
    }

    const existing = current[index]
    const fields = COMPARED[section]
      .filter((field) => differs(existing[field.k], entry[field.k]))
      .map((field) => ({ label: field.label, before: show(existing[field.k]) || "—", after: show(entry[field.k]) }))
    if (!fields.length) return

    const { title, subtitle } = nameOf(existing)
    changes.push({
      id: `${section}:revise:${index}`,
      section,
      kind: "revised",
      title,
      subtitle,
      fields,
      target: { index },
      // Only the fields that differ are taken; everything else on the entry stays.
      value: { ...existing, ...Object.fromEntries(COMPARED[section].filter((f) => differs(existing[f.k], entry[f.k])).map((f) => [f.k, entry[f.k]])) },
    })
  })

  return changes
}

/** Skills the upload knows about and the profile does not, one row per group. */
function diffSkills(current: Resume["skills"], incoming: Resume["skills"]): ProposedChange[] {
  const groups: { k: keyof Resume["skills"]; label: string }[] = [
    { k: "programming_languages", label: "Languages" },
    { k: "frameworks", label: "Frameworks" },
    { k: "libraries", label: "Libraries" },
    { k: "databases", label: "Databases" },
    { k: "devops_tools", label: "Tools" },
    { k: "cloud_platforms", label: "Cloud" },
    { k: "other", label: "Other" },
  ]
  return groups.flatMap((group) => {
    const have = new Set(list(current?.[group.k]).map(key))
    const fresh = list(incoming?.[group.k]).filter((skill) => !have.has(key(skill)))
    if (!fresh.length) return []
    return [
      {
        id: `skills:${String(group.k)}`,
        section: "skills" as const,
        kind: "added" as const,
        title: group.label,
        subtitle: `${fresh.length} new`,
        preview: fresh,
        target: { append: true as const },
        value: { group: group.k, skills: fresh },
      },
    ]
  })
}

/** Contact details the upload fills in where the profile is blank, or states differently. */
function diffBasics(current: Resume["basics"], incoming: Resume["basics"]): ProposedChange[] {
  const fields: { k: keyof Resume["basics"]; label: string }[] = [
    { k: "name", label: "Name" },
    { k: "email", label: "Email" },
    { k: "phone", label: "Phone" },
    { k: "linkedin", label: "LinkedIn" },
    { k: "github", label: "GitHub" },
    { k: "portfolio", label: "Portfolio" },
  ]
  const changed = fields.filter((field) => differs(current?.[field.k], incoming?.[field.k]))
  if (!changed.length) return []
  return [
    {
      id: "basics",
      section: "basics",
      kind: current?.name ? "revised" : "added",
      title: "Contact details",
      fields: changed.map((field) => ({
        label: field.label,
        before: clean(current?.[field.k]) || "—",
        after: clean(incoming?.[field.k]),
      })),
      target: { append: true },
      value: Object.fromEntries(changed.map((field) => [field.k, incoming[field.k]])),
    },
  ]
}

/** Everything a freshly uploaded resume would add to or change about the profile. */
export function proposeChanges(profile: Resume | null, incoming: Resume): ProposedChange[] {
  if (!profile) return []
  return [
    ...diffBasics(profile.basics, incoming.basics),
    ...diffSection("experience", (profile.experience ?? []) as Record<string, unknown>[], (incoming.experience ?? []) as Record<string, unknown>[]),
    ...diffSection("projects", (profile.projects ?? []) as Record<string, unknown>[], (incoming.projects ?? []) as Record<string, unknown>[]),
    ...diffSection("education", (profile.education ?? []) as Record<string, unknown>[], (incoming.education ?? []) as Record<string, unknown>[]),
    ...diffSkills(profile.skills, incoming.skills),
  ]
}

/** The profile with the accepted changes folded in. Nothing else is touched. */
export function applyChanges(profile: Resume, changes: ProposedChange[], accepted: ReadonlySet<string>): Resume {
  let next: Resume = {
    ...profile,
    basics: { ...profile.basics },
    skills: { ...profile.skills },
    education: [...(profile.education ?? [])],
    experience: [...(profile.experience ?? [])],
    projects: [...(profile.projects ?? [])],
  }

  for (const change of changes) {
    if (!accepted.has(change.id)) continue

    if (change.section === "basics") {
      next.basics = { ...next.basics, ...(change.value as Partial<Resume["basics"]>) }
      continue
    }

    if (change.section === "skills") {
      const { group, skills } = change.value as { group: keyof Resume["skills"]; skills: string[] }
      next.skills = { ...next.skills, [group]: [...list(next.skills[group]), ...skills] }
      continue
    }

    const entries = [...(next[change.section] as Record<string, unknown>[])]
    if ("index" in change.target) entries[change.target.index] = change.value as Record<string, unknown>
    else entries.push(change.value as Record<string, unknown>)
    next = { ...next, [change.section]: entries }
  }

  return next
}
