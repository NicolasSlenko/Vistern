import { z } from "zod"

export const yearLabels = {
  freshman: "Freshman",
  sophomore: "Sophomore",
  junior: "Junior",
  senior: "Senior",
  graduate: "Graduate student",
  unsure: "Not sure",
} as const
export const backgroundLabels = {
  classes: "Classes",
  projects: "Personal or class projects",
  work: "Work or internships",
  research: "Research",
  community: "Clubs or volunteering",
  starting: "I’m just getting started",
} as const
const yearSchema = z.enum(["freshman", "sophomore", "junior", "senior", "graduate", "unsure"])
const backgroundSchema = z.enum([
  "classes",
  "projects",
  "work",
  "research",
  "community",
  "starting",
])
export const stepSchema = z.enum(["year", "resume", "background", "detail", "done"])
export const focusSchema = z.enum(["explore", "build", "opportunities", "prepare"])

export const studentProfileSchema = z.object({
  version: z.literal(1).default(1),
  year: yearSchema.nullable().default(null),
  backgroundAreas: z.array(backgroundSchema).max(6).default([]),
  backgroundNote: z.string().trim().max(600).default(""),
  step: stepSchema.default("year"),
  completed: z.boolean().default(false),
  focus: focusSchema.nullable().default(null),
})
export type StudentProfile = z.infer<typeof studentProfileSchema>
export type BackgroundArea = keyof typeof backgroundLabels
export type OnboardingStep = z.infer<typeof stepSchema>
export type HomeFocus = z.infer<typeof focusSchema>

export const studentProfileUpdateSchema = z.discriminatedUnion("intent", [
  z
    .object({
      intent: z.literal("onboarding"),
      year: yearSchema,
      backgroundAreas: z.array(backgroundSchema).max(6),
      backgroundNote: z.string().trim().max(600),
      step: stepSchema,
    })
    .strict(),
  z.object({ intent: z.literal("focus"), focus: focusSchema.nullable() }).strict(),
])
export type StudentProfileUpdate = z.infer<typeof studentProfileUpdateSchema>

export function updateStudentProfile(
  current: StudentProfile | null,
  payload: unknown,
): StudentProfile {
  const update = studentProfileUpdateSchema.parse(payload)
  const profile = studentProfileSchema.parse(current || {})
  if (update.intent === "focus") return { ...profile, focus: update.focus }
  const areas = [...new Set(update.backgroundAreas)]
  return {
    ...profile,
    year: update.year,
    backgroundNote: update.backgroundNote,
    backgroundAreas: areas.length > 1 ? areas.filter((area) => area !== "starting") : areas,
    step: update.step,
    // Editing background must not make an established student a new user again.
    completed: profile.completed || update.step === "done",
  }
}

export function studentEntryPath(profile: StudentProfile | null, hasResume: boolean) {
  return profile?.completed || hasResume ? "/home" : "/onboarding"
}

export function toggleBackground(areas: BackgroundArea[], area: BackgroundArea): BackgroundArea[] {
  if (areas.includes(area)) return areas.filter((item) => item !== area)
  return area === "starting" ? [area] : [...areas.filter((item) => item !== "starting"), area]
}

export function backgroundFollowup(areas: BackgroundArea[]) {
  if (areas.includes("projects"))
    return { title: "Tell us about a project", label: "What did you work on?" }
  if (areas.includes("research"))
    return { title: "Tell us about your research", label: "What were you studying?" }
  if (areas.includes("work"))
    return { title: "Tell us about a job or internship", label: "What was your role?" }
  if (areas.includes("community"))
    return { title: "Tell us about an activity", label: "What were you involved in?" }
  return null
}
