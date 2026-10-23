import type {
  AnyEntry,
  Bullet,
  EntryByKey,
  HistoryEntry,
  MasterProfile,
  SectionKey,
  Suggestion,
  SuggestionChange,
  TailoredResume,
  Visibility,
  WorkspaceState,
} from "./types"

export const sectionOrder: SectionKey[] = ["education", "experience", "projects", "skills", "coursework"]

export const sectionLabels: Record<SectionKey, string> = {
  education: "Education",
  experience: "Experience",
  projects: "Projects",
  skills: "Skills",
  coursework: "Coursework",
}

export const singularLabels: Record<SectionKey, string> = {
  education: "education",
  experience: "experience",
  projects: "project",
  skills: "skill group",
  coursework: "course",
}

export const MASTER_RESUME = "Master resume"
const HISTORY_LIMIT = 60

export function newId(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`
}

/** A part is only as public as its most private ancestor. */
export function effectiveVisibility(...levels: Visibility[]): Visibility {
  return levels.includes("private") ? "private" : "public"
}

export function entryTitle(section: SectionKey, entry: AnyEntry): string {
  switch (section) {
    case "education": {
      const item = entry as EntryByKey["education"]
      return item.school || "Untitled school"
    }
    case "experience": {
      const item = entry as EntryByKey["experience"]
      return [item.role, item.organization].filter(Boolean).join(", ") || "Untitled experience"
    }
    case "projects":
      return (entry as EntryByKey["projects"]).name || "Untitled project"
    case "skills":
      return (entry as EntryByKey["skills"]).category || "Skills"
    case "coursework": {
      const item = entry as EntryByKey["coursework"]
      return [item.code, item.title].filter(Boolean).join(" ") || "Untitled course"
    }
  }
}

export function entryBullets(entry: AnyEntry): Bullet[] {
  return "bullets" in entry ? entry.bullets : []
}

export function findEntry(profile: MasterProfile, entryId: string) {
  for (const section of sectionOrder) {
    const entry = (profile.sections[section].items as AnyEntry[]).find((item) => item.id === entryId)
    if (entry) return { section, entry }
  }
  return null
}

export function isProfileEmpty(profile: MasterProfile) {
  return sectionOrder.every((section) => profile.sections[section].items.length === 0) && !profile.contact.name.trim()
}

/** Names of the resumes that draw on a bullet, so an edit has a visible effect. */
export function bulletUsedIn(state: WorkspaceState, bulletId: string): string[] {
  return [
    MASTER_RESUME,
    ...state.tailored.filter((resume) => resume.bulletIds.includes(bulletId)).map(tailoredName),
  ]
}

export function entryUsedIn(state: WorkspaceState, entryId: string): string[] {
  return [
    MASTER_RESUME,
    ...state.tailored.filter((resume) => resume.entryIds.includes(entryId)).map(tailoredName),
  ]
}

export function tailoredName(resume: TailoredResume) {
  return resume.company ? `${resume.role} · ${resume.company}` : resume.role
}

/** Suggestions whose target still exists; deleting a bullet silently retires its suggestions. */
export function liveSuggestions(profile: MasterProfile, suggestions: Suggestion[]) {
  return suggestions.filter((suggestion) => {
    const found = findEntry(profile, suggestion.change.entryId)
    if (!found) return false
    if (suggestion.change.type === "replace-bullet") {
      const { bulletId } = suggestion.change
      return entryBullets(found.entry).some((bullet) => bullet.id === bulletId)
    }
    return true
  })
}

function withChangeText(change: SuggestionChange, text?: string): SuggestionChange {
  if (text === undefined || !text.trim()) return change
  if (change.type === "add-skill") return { ...change, skill: text.trim() }
  return { ...change, text: text.trim() }
}

export function applyChange(profile: MasterProfile, change: SuggestionChange): MasterProfile {
  const found = findEntry(profile, change.entryId)
  if (!found) return profile
  const { section } = found
  const items = (profile.sections[section].items as AnyEntry[]).map((entry) => {
    if (entry.id !== change.entryId) return entry
    if (change.type === "add-skill" && "skills" in entry) {
      return entry.skills.includes(change.skill) ? entry : { ...entry, skills: [...entry.skills, change.skill] }
    }
    if (!("bullets" in entry)) return entry
    if (change.type === "replace-bullet") {
      return {
        ...entry,
        bullets: entry.bullets.map((bullet) => (bullet.id === change.bulletId ? { ...bullet, text: change.text } : bullet)),
      }
    }
    if (change.type === "add-bullet") {
      return { ...entry, bullets: [...entry.bullets, { id: newId("b"), text: change.text, visibility: "private" as const }] }
    }
    return entry
  })
  return { ...profile, sections: { ...profile.sections, [section]: { ...profile.sections[section], items } } }
}

function applyTailoredChange(resume: TailoredResume, change: SuggestionChange): TailoredResume {
  if (change.type === "replace-bullet") {
    return { ...resume, overrides: { ...resume.overrides, [change.bulletId]: change.text } }
  }
  if (change.type === "add-bullet") {
    const added = resume.addedBullets[change.entryId] ?? []
    return {
      ...resume,
      addedBullets: {
        ...resume.addedBullets,
        [change.entryId]: [...added, { id: newId("tb"), text: change.text, visibility: "private" }],
      },
    }
  }
  return resume
}

const numberPattern = /\d/

/** Mock suggestion source until the AI service is wired in: flags bullets with no measurable result. */
export function generateMasterSuggestions(profile: MasterProfile, existing: Suggestion[], dismissed: string[]): Suggestion[] {
  const taken = new Set([...existing.map((suggestion) => suggestion.id), ...dismissed])
  const pendingBullets = new Set(
    existing.flatMap((suggestion) => (suggestion.change.type === "replace-bullet" ? [suggestion.change.bulletId] : [])),
  )
  const generated: Suggestion[] = []
  for (const section of ["experience", "projects"] as const) {
    for (const entry of profile.sections[section].items) {
      for (const bullet of entry.bullets) {
        const id = `metric:${bullet.id}`
        if (taken.has(id) || pendingBullets.has(bullet.id) || numberPattern.test(bullet.text)) continue
        generated.push({
          id,
          section,
          kind: "metric",
          title: `Add a result to ${entryTitle(section, entry)}`,
          reason: "This line says what you did but not what changed because of it.",
          change: {
            type: "replace-bullet",
            entryId: entry.id,
            bulletId: bullet.id,
            text: `${bullet.text.replace(/\.$/, "")}, [result: e.g. "cutting response time by 30%"]`,
          },
        })
      }
    }
  }
  return [...existing, ...generated]
}

/** Mock role-specific wording: points each chosen bullet at the target role. */
export function generateTailorSuggestions(profile: MasterProfile, resume: TailoredResume): Suggestion[] {
  const taken = new Set([...resume.suggestions.map((suggestion) => suggestion.id), ...resume.dismissed])
  const keywords = resume.jobDescription
    .split(/[^A-Za-z0-9+#.]+/)
    .filter((word) => word.length > 2 && /[A-Z]/.test(word[0]))
  const generated: Suggestion[] = []
  for (const section of ["experience", "projects"] as const) {
    for (const entry of profile.sections[section].items) {
      if (!resume.entryIds.includes(entry.id)) continue
      const first = entry.bullets.find((bullet) => resume.bulletIds.includes(bullet.id))
      if (!first) continue
      const id = `role:${resume.id}:${first.id}`
      if (taken.has(id)) continue
      const keyword = keywords.find((word) => !first.text.includes(word))
      const current = resume.overrides[first.id] ?? first.text
      generated.push({
        id,
        section,
        kind: "role-fit",
        title: keyword ? `Connect ${entryTitle(section, entry)} to ${keyword}` : `Lead with what matters for ${resume.role}`,
        reason: keyword
          ? `The posting mentions ${keyword}; say where this work touched it.`
          : "Put the part of this work closest to the role first.",
        change: {
          type: "replace-bullet",
          entryId: entry.id,
          bulletId: first.id,
          text: keyword
            ? `${current.replace(/\.$/, "")} [tie to ${keyword}]`
            : `[For ${resume.role}] ${current}`,
        },
      })
    }
  }
  return [...resume.suggestions, ...generated]
}

export type WorkspaceAction =
  | { type: "contact/save"; contact: MasterProfile["contact"] }
  | { type: "entry/save"; section: SectionKey; entry: AnyEntry }
  | { type: "entry/delete"; section: SectionKey; id: string }
  | { type: "entry/move"; section: SectionKey; id: string; direction: -1 | 1 }
  | { type: "suggestion/accept"; id: string; text?: string }
  | { type: "suggestion/reject"; id: string }
  | { type: "suggestion/accept-all"; section?: SectionKey }
  | { type: "suggestion/reject-all"; section?: SectionKey }
  | { type: "suggestion/refresh" }
  | { type: "tailored/create"; resume: TailoredResume }
  | { type: "tailored/select"; id: string; entryIds: string[]; bulletIds: string[] }
  | { type: "tailored/details"; id: string; role: string; company: string; jobDescription: string }
  | { type: "tailored/suggest"; id: string }
  | { type: "tailored/accept"; id: string; suggestionId: string; text?: string }
  | { type: "tailored/reject"; id: string; suggestionId: string }
  | { type: "tailored/accept-all"; id: string; section?: SectionKey }
  | { type: "tailored/reject-all"; id: string; section?: SectionKey }
  | { type: "tailored/delete"; id: string }
  | { type: "workspace/replace"; state: WorkspaceState }

function log(state: WorkspaceState, summary: string, section: HistoryEntry["section"]): WorkspaceState {
  const entry = { id: newId("h"), at: new Date().toISOString(), summary, section }
  return { ...state, history: [entry, ...state.history].slice(0, HISTORY_LIMIT) }
}

function setItems<K extends SectionKey>(profile: MasterProfile, section: K, items: EntryByKey[K][]): MasterProfile {
  return { ...profile, sections: { ...profile.sections, [section]: { ...profile.sections[section], items } } }
}

function updateTailored(state: WorkspaceState, id: string, update: (resume: TailoredResume) => TailoredResume) {
  return { ...state, tailored: state.tailored.map((resume) => (resume.id === id ? update(resume) : resume)) }
}

function inSection(section?: SectionKey) {
  return (suggestion: Suggestion) => !section || suggestion.section === section
}

export function workspaceReducer(state: WorkspaceState, action: WorkspaceAction): WorkspaceState {
  switch (action.type) {
    case "contact/save":
      return log({ ...state, profile: { ...state.profile, contact: action.contact } }, "Updated contact info", "contact")

    case "entry/save": {
      const items = state.profile.sections[action.section].items as AnyEntry[]
      const exists = items.some((item) => item.id === action.entry.id)
      const next = exists
        ? items.map((item) => (item.id === action.entry.id ? action.entry : item))
        : [...items, action.entry]
      const profile = setItems(state.profile, action.section, next as EntryByKey[typeof action.section][])
      const title = entryTitle(action.section, action.entry)
      return log({ ...state, profile }, `${exists ? "Edited" : "Added"} ${title}`, action.section)
    }

    case "entry/delete": {
      const items = state.profile.sections[action.section].items as AnyEntry[]
      const removed = items.find((item) => item.id === action.id)
      if (!removed) return state
      const removedBullets = new Set(entryBullets(removed).map((bullet) => bullet.id))
      const profile = setItems(
        state.profile,
        action.section,
        items.filter((item) => item.id !== action.id) as EntryByKey[typeof action.section][],
      )
      const tailored = state.tailored.map((resume) => ({
        ...resume,
        entryIds: resume.entryIds.filter((id) => id !== action.id),
        bulletIds: resume.bulletIds.filter((id) => !removedBullets.has(id)),
      }))
      return log({ ...state, profile, tailored }, `Deleted ${entryTitle(action.section, removed)}`, action.section)
    }

    case "entry/move": {
      const items = [...(state.profile.sections[action.section].items as AnyEntry[])]
      const from = items.findIndex((item) => item.id === action.id)
      const to = from + action.direction
      if (from < 0 || to < 0 || to >= items.length) return state
      ;[items[from], items[to]] = [items[to], items[from]]
      const profile = setItems(state.profile, action.section, items as EntryByKey[typeof action.section][])
      return log({ ...state, profile }, `Reordered ${sectionLabels[action.section]}`, action.section)
    }

    case "suggestion/accept": {
      const suggestion = state.suggestions.find((item) => item.id === action.id)
      if (!suggestion) return state
      const edited = action.text !== undefined
      const profile = applyChange(state.profile, withChangeText(suggestion.change, action.text))
      return log(
        { ...state, profile, suggestions: state.suggestions.filter((item) => item.id !== action.id), dismissed: [...state.dismissed, action.id] },
        `${edited ? "Edited and accepted" : "Accepted"}: ${suggestion.title}`,
        suggestion.section,
      )
    }

    case "suggestion/reject":
      return {
        ...state,
        suggestions: state.suggestions.filter((item) => item.id !== action.id),
        dismissed: [...state.dismissed, action.id],
      }

    case "suggestion/accept-all": {
      const accepted = liveSuggestions(state.profile, state.suggestions).filter(inSection(action.section))
      if (!accepted.length) return state
      const profile = accepted.reduce((current, suggestion) => applyChange(current, suggestion.change), state.profile)
      const ids = new Set(accepted.map((suggestion) => suggestion.id))
      return log(
        { ...state, profile, suggestions: state.suggestions.filter((item) => !ids.has(item.id)), dismissed: [...state.dismissed, ...ids] },
        `Accepted ${accepted.length} suggestion${accepted.length === 1 ? "" : "s"}${action.section ? ` in ${sectionLabels[action.section]}` : ""}`,
        action.section ?? "experience",
      )
    }

    case "suggestion/reject-all": {
      const skipped = state.suggestions.filter(inSection(action.section))
      const ids = new Set(skipped.map((suggestion) => suggestion.id))
      return { ...state, suggestions: state.suggestions.filter((item) => !ids.has(item.id)), dismissed: [...state.dismissed, ...ids] }
    }

    case "suggestion/refresh":
      return { ...state, suggestions: generateMasterSuggestions(state.profile, liveSuggestions(state.profile, state.suggestions), state.dismissed) }

    case "tailored/create":
      return log({ ...state, tailored: [...state.tailored, action.resume] }, `Started a resume for ${tailoredName(action.resume)}`, "tailor")

    case "tailored/select":
      return updateTailored(state, action.id, (resume) => ({ ...resume, entryIds: action.entryIds, bulletIds: action.bulletIds }))

    case "tailored/details":
      return updateTailored(state, action.id, (resume) => ({
        ...resume,
        role: action.role,
        company: action.company,
        jobDescription: action.jobDescription,
      }))

    case "tailored/suggest":
      return updateTailored(state, action.id, (resume) => ({ ...resume, suggestions: generateTailorSuggestions(state.profile, resume) }))

    case "tailored/accept": {
      const resume = state.tailored.find((item) => item.id === action.id)
      const suggestion = resume?.suggestions.find((item) => item.id === action.suggestionId)
      if (!resume || !suggestion) return state
      const next = updateTailored(state, action.id, (current) => ({
        ...applyTailoredChange(current, withChangeText(suggestion.change, action.text)),
        suggestions: current.suggestions.filter((item) => item.id !== action.suggestionId),
        dismissed: [...current.dismissed, action.suggestionId],
      }))
      return log(next, `${tailoredName(resume)}: accepted ${suggestion.title}`, "tailor")
    }

    case "tailored/reject":
      return updateTailored(state, action.id, (resume) => ({
        ...resume,
        suggestions: resume.suggestions.filter((item) => item.id !== action.suggestionId),
        dismissed: [...resume.dismissed, action.suggestionId],
      }))

    case "tailored/accept-all": {
      const resume = state.tailored.find((item) => item.id === action.id)
      const accepted = resume?.suggestions.filter(inSection(action.section)) ?? []
      if (!resume || !accepted.length) return state
      const ids = new Set(accepted.map((suggestion) => suggestion.id))
      const next = updateTailored(state, action.id, (current) => ({
        ...accepted.reduce((acc, suggestion) => applyTailoredChange(acc, suggestion.change), current),
        suggestions: current.suggestions.filter((item) => !ids.has(item.id)),
        dismissed: [...current.dismissed, ...ids],
      }))
      return log(next, `${tailoredName(resume)}: accepted ${accepted.length} suggestion${accepted.length === 1 ? "" : "s"}`, "tailor")
    }

    case "tailored/reject-all":
      return updateTailored(state, action.id, (resume) => ({
        ...resume,
        suggestions: resume.suggestions.filter((item) => !inSection(action.section)(item)),
        dismissed: [...resume.dismissed, ...resume.suggestions.filter(inSection(action.section)).map((item) => item.id)],
      }))

    case "tailored/delete": {
      const resume = state.tailored.find((item) => item.id === action.id)
      if (!resume) return state
      return log({ ...state, tailored: state.tailored.filter((item) => item.id !== action.id) }, `Deleted the ${tailoredName(resume)} resume`, "tailor")
    }

    case "workspace/replace":
      return action.state
  }
}
