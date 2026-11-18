import { z } from "zod"
import type { Resume } from "@/app/api/parse/resumeSchema"
import { yearLabels, type StudentProfile } from "@/lib/student-profile"

/**
 * What a student shows other students in Community → People.
 *
 * Nothing is shared unless the student turns it on. Their choices
 * (`Sharing`) are applied on the server to everything they could share
 * (`CardSource`), and only the result (`PublicCard`) is stored where others
 * can read it. The phone number, GPA and bullets are never offered.
 */

export const SHARE_FIELDS = [
  { id: "photo", label: "Profile photo", hint: "From your account" },
  { id: "year", label: "Year", hint: "From onboarding" },
  { id: "school", label: "School and major", hint: "Your most recent education" },
  { id: "location", label: "City and state" },
  { id: "skills", label: "Skills", hint: "Up to 12" },
  { id: "experience", label: "Roles", hint: "Title and company only" },
  { id: "projects", label: "Projects", hint: "Name and tools only" },
  { id: "links", label: "LinkedIn, GitHub and website" },
  { id: "email", label: "Email", hint: "So people can reach you" },
] as const

export type ShareField = (typeof SHARE_FIELDS)[number]["id"]
const shareFieldIds = SHARE_FIELDS.map((field) => field.id) as [ShareField, ...ShareField[]]

export const sharingSchema = z
  .object({
    listed: z.boolean(),
    nameStyle: z.enum(["full", "first"]),
    headline: z.string().trim().max(140),
    fields: z.array(z.enum(shareFieldIds)).max(SHARE_FIELDS.length),
  })
  .strict()
export type Sharing = z.infer<typeof sharingSchema>

/** A new student: not listed, and sharing nothing until they choose. */
export const DEFAULT_SHARING: Sharing = { listed: false, nameStyle: "first", headline: "", fields: [] }

export function readSharing(value: unknown): Sharing {
  const parsed = sharingSchema.safeParse(value)
  if (!parsed.success) return DEFAULT_SHARING
  return { ...parsed.data, fields: [...new Set(parsed.data.fields)] }
}

/**
 * Cards are read back from a table their owner can write to directly (RLS
 * lets a student write their own row with their own token, skipping our API),
 * so these checks run on every read, not just on save.
 *
 * `z.string().url()` alone accepts `javascript:` and `data:`; these don't.
 */
const isWebLink = (value: string) => webLink(value) === value
const linkSchema = z.string().max(300).refine(isWebLink, "Only http(s) links")

/**
 * A photo loads in every viewer's browser, so a free choice of host would let
 * one card log the IP of everyone who scrolls past it. Only Clerk's image CDN.
 */
export const PHOTO_HOSTS = ["img.clerk.com", "images.clerk.dev"]
export const isAccountPhoto = (value: string) => {
  try {
    const url = new URL(value)
    return url.protocol === "https:" && PHOTO_HOSTS.includes(url.hostname)
  } catch {
    return false
  }
}
const photoSchema = z.string().max(500).refine(isAccountPhoto, "Only account photos")

/** No `?`, `&` or spaces, so `mailto:` can't carry a subject, body or second address. */
const emailSchema = z.string().max(200).email().regex(/^[^?&\s,;:]+$/, "Plain address only")

export const publicCardSchema = z.object({
  name: z.string().min(1).max(80),
  headline: z.string().max(140).optional(),
  photo: photoSchema.optional(),
  year: z.string().max(40).optional(),
  school: z.object({ school: z.string().max(120), program: z.string().max(160), graduation: z.string().max(40) }).optional(),
  location: z.string().max(120).optional(),
  skills: z.array(z.string().max(60)).max(12).optional(),
  experience: z.array(z.object({ position: z.string().max(120), company: z.string().max(120) })).max(4).optional(),
  projects: z.array(z.object({ name: z.string().max(120), technologies: z.array(z.string().max(60)).max(6) })).max(4).optional(),
  links: z.object({ linkedin: linkSchema.optional(), github: linkSchema.optional(), portfolio: linkSchema.optional() }).optional(),
  email: emailSchema.optional(),
})
export type PublicCard = z.infer<typeof publicCardSchema>

/** Everything a student could put on their card, before their choices. */
export type CardSource = {
  fullName: string
  firstName: string
} & Omit<PublicCard, "name" | "headline">

const clean = (value: unknown, max: number) => (typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "")

/** Only web links, so a card can't carry `javascript:` or a bare word as an href. */
export function webLink(value: unknown): string | undefined {
  const raw = clean(value, 300)
  if (!raw) return undefined
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`)
    if (url.protocol !== "https:" && url.protocol !== "http:") return undefined
    if (!url.hostname.includes(".")) return undefined
    return url.toString()
  } catch {
    return undefined
  }
}

function firstWord(name: string) {
  return name.split(" ")[0] ?? ""
}

/**
 * What the profile, onboarding and account could contribute. Run on the
 * server for the card that's stored, and its result sent to the owner alone
 * so their preview can follow the switches without a round trip.
 */
export function cardSource(
  resume: Resume | null,
  onboarding: StudentProfile | null,
  account: { firstName?: string | null; lastName?: string | null; imageUrl?: string | null; hasImage?: boolean } = {},
): CardSource {
  const basics = resume?.basics
  const accountName = clean([account.firstName, account.lastName].filter(Boolean).join(" "), 80)
  const fullName = clean(basics?.name, 80) || accountName
  const firstName = firstWord(fullName) || clean(account.firstName, 40)

  const education = resume?.education?.[0]
  const program = [clean(education?.degree, 80), clean(education?.field, 80)].filter(Boolean).join(", ")
  const location = [clean(basics?.location?.city, 60), clean(basics?.location?.state, 60)].filter(Boolean).join(", ")

  const skills = resume
    ? [...new Set(Object.values(resume.skills ?? {}).flat().map((skill) => clean(skill, 60)).filter(Boolean))].slice(0, 12)
    : []
  const experience = (resume?.experience ?? [])
    .map((entry) => ({ position: clean(entry.position, 120), company: clean(entry.company, 120) }))
    .filter((entry) => entry.position || entry.company)
    .slice(0, 4)
  const projects = (resume?.projects ?? [])
    .map((entry) => ({
      name: clean(entry.name, 120),
      technologies: (entry.technologies ?? []).map((tech) => clean(tech, 60)).filter(Boolean).slice(0, 6),
    }))
    .filter((entry) => entry.name)
    .slice(0, 4)

  const links = {
    linkedin: webLink(basics?.linkedin),
    github: webLink(basics?.github),
    portfolio: webLink(basics?.portfolio),
  }
  const email = clean(basics?.email, 200)

  return {
    fullName,
    firstName,
    // Clerk gives everyone a generated avatar; only a photo they uploaded counts.
    photo: account.hasImage === false || !account.imageUrl || !isAccountPhoto(account.imageUrl) ? undefined : account.imageUrl,
    year: onboarding?.year && onboarding.year !== "unsure" ? yearLabels[onboarding.year] : undefined,
    school: education?.school
      ? { school: clean(education.school, 120), program, graduation: clean(education.end_date, 40) }
      : undefined,
    location: location || undefined,
    skills: skills.length ? skills : undefined,
    experience: experience.length ? experience : undefined,
    projects: projects.length ? projects : undefined,
    links: links.linkedin || links.github || links.portfolio ? links : undefined,
    email: emailSchema.safeParse(email).success ? email : undefined,
  }
}

/** The card as others will see it: only the fields switched on. Null when there's no name to show. */
export function pickCard(source: CardSource, sharing: Sharing): PublicCard | null {
  const name = sharing.nameStyle === "full" ? source.fullName : source.firstName
  if (!name) return null
  const on = new Set(sharing.fields)
  const card: PublicCard = { name }
  if (sharing.headline) card.headline = sharing.headline
  for (const field of SHARE_FIELDS) {
    if (!on.has(field.id)) continue
    const value = source[field.id]
    if (value !== undefined) (card as Record<string, unknown>)[field.id] = value
  }
  // The same check a reader applies, so nothing is stored that won't be shown.
  const checked = publicCardSchema.safeParse(card)
  return checked.success ? checked.data : null
}

/** Whether a card mentions a search, over the words someone would look for. */
export function cardMatches(card: PublicCard, query: string): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (!words.length) return true
  const haystack = [
    card.name,
    card.headline,
    card.year,
    card.school?.school,
    card.school?.program,
    card.location,
    ...(card.skills ?? []),
    ...(card.experience ?? []).flatMap((entry) => [entry.position, entry.company]),
    ...(card.projects ?? []).flatMap((entry) => [entry.name, ...entry.technologies]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
  return words.every((word) => haystack.includes(word))
}
