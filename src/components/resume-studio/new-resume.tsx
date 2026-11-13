"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, FilePlus2, Loader2, UserRound } from "lucide-react"
import { toast } from "sonner"
import type { Resume } from "@/app/api/parse/resumeSchema"
import { PaperPane } from "@/components/resume-paper/paper-pane"
import { PAGE_LINES, estimateLines } from "@/lib/resumePageBudget"
import { normalizeResume } from "@/lib/resume/standard"
import {
  BULLET_FIELDS,
  PICK_SECTIONS,
  bulletKey,
  defaultPick,
  pickFromProfile,
  setSection,
  setSkills,
  toggleBullet,
  toggleEntry,
  toggleSkill,
  type BulletSection,
  type PickSection,
  type ProfilePick,
} from "@/lib/resume/pick"
import { Field } from "./fields"
import { pill } from "./pills"
import { LIST_SECTIONS, SECTION_ICONS, SECTION_TITLES, SKILL_GROUPS } from "./sections"
import { StudioShell, StudioTitle } from "./studio-shell"

/**
 * A new resume, chosen from the master profile.
 *
 * Everything starts ticked; the student unticks the entries, bullets and
 * skills this resume can do without and watches the page change beside them.
 * Creating it takes a snapshot — from then on it is edited at /resumes/[id]
 * apart from the profile, like every other resume.
 *
 * Nothing is trimmed for them. Over a page, they're told, and the choice of
 * what to cut stays theirs.
 */

const NO_MARKS = [] as const
const CHECK = "mt-[3px] h-4 w-4 shrink-0 cursor-pointer accent-brand"

const defaultName = () => `Resume — ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
const text = (value: unknown) => (typeof value === "string" ? value.trim() : Array.isArray(value) ? value.join(", ") : "")

export function NewResume() {
  const router = useRouter()
  const [profile, setProfile] = useState<Resume | null>(null)
  const [loading, setLoading] = useState(true)
  const [pick, setPick] = useState<ProfilePick | null>(null)
  const [fileName, setFileName] = useState(defaultName)
  const [targetRole, setTargetRole] = useState("")
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    let live = true
    fetch("/api/profile")
      .then((response) => response.json())
      .then((result) => {
        if (!live || !result.success) return
        setProfile(result.data)
        setPick(defaultPick(result.data))
      })
      .catch(() => {})
      .finally(() => live && setLoading(false))
    return () => {
      live = false
    }
  }, [])

  // What will be saved: the pick, tidied by the resume standard (dates, order,
  // punctuation) and nothing more.
  const resume = useMemo(() => (profile && pick ? normalizeResume(pickFromProfile(profile, pick)) : null), [profile, pick])
  const overPage = resume ? estimateLines(resume) > PAGE_LINES : false
  const empty = !profile || (PICK_SECTIONS.every((section) => !profile[section]?.length) && !SKILL_GROUPS.some((g) => profile.skills?.[g.key]?.length))

  const create = async () => {
    if (!resume || creating) return
    setCreating(true)
    let id: string | null = null
    try {
      // Two steps, so the server's one-page fitting never runs on the student's
      // choices: the first saves a header-only page (which always fits, so it is
      // only tidied), the second puts their content in as-is.
      const created = await fetch("/api/resume-documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: { basics: resume.basics }, fileName: fileName.trim() || defaultName(), targetRole: targetRole.trim() || null }),
      }).then((response) => response.json())
      if (!created.success) throw new Error(created.error || "Couldn't create the resume")
      id = created.data.id as string

      const saved = await fetch(`/api/resume-documents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: resume }),
      }).then((response) => response.json())
      if (!saved.success) throw new Error(saved.error || "Couldn't save what you picked")

      router.push(`/resumes/${id}`)
    } catch (error) {
      // Don't leave an empty page on the shelf.
      if (id) await fetch(`/api/resume-documents/${id}`, { method: "DELETE" }).catch(() => {})
      toast.error(error instanceof Error ? error.message : "Couldn't create the resume")
      setCreating(false)
    }
  }

  const update = (next: (current: ProfilePick) => ProfilePick) => setPick((current) => (current ? next(current) : current))

  return (
    <StudioShell
      title={
        <>
          <Link
            href="/resumes"
            aria-label="All resumes"
            title="All resumes"
            className="white-button inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
          >
            <ArrowLeft className="h-[17px] w-[17px]" aria-hidden="true" />
          </Link>
          <StudioTitle>New resume</StudioTitle>
        </>
      }
      actions={
        <button type="button" onClick={create} disabled={!resume || creating || empty} className={pill("brand", "h-10 px-4 text-[15px] font-medium")}>
          {creating ? <Loader2 className="animate-spin" aria-hidden="true" /> : <FilePlus2 aria-hidden="true" />}
          <span className="max-sm:sr-only">{creating ? "Creating…" : "Create resume"}</span>
        </button>
      }
      left={
        <div className="flex flex-col gap-6">
          <Field label="Name" value={fileName} onChange={setFileName} placeholder="Backend internships" />
          <Field label="Aimed at" value={targetRole} onChange={setTargetRole} placeholder="Software engineering intern" hint="Optional. Shown on the shelf." />
          {resume && (
            <div className="flex flex-col gap-2">
              <span className="label-mono text-ink-2">On the page</span>
              <ul className="flex flex-col gap-1 text-[14px] text-ink-2">
                {PICK_SECTIONS.filter((section) => profile?.[section]?.length).map((section) => (
                  <li key={section} className="flex justify-between gap-3">
                    <a href={`#pick-${section}`} className="hover:text-ink">
                      {SECTION_TITLES[section]}
                    </a>
                    <span className="tabular-nums text-ink-3">
                      {resume[section].length} of {profile?.[section]?.length}
                    </span>
                  </li>
                ))}
              </ul>
              <p role="status" className={`mt-2 text-[13px] leading-snug ${overPage ? "text-caution" : "text-ink-3"}`}>
                {overPage
                  ? "Runs over one page. Untick an entry or a few bullets, or keep it long — it's your call."
                  : "Fits on one page."}
              </p>
            </div>
          )}
        </div>
      }
      preview={<PaperPane resume={resume} marks={NO_MARKS} />}
    >
      {loading ? (
        <div aria-busy="true" className="flex flex-col gap-4">
          <div className="h-10 w-56 rounded-lg bg-fill" />
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="h-[120px] rounded-[18px] bg-fill/70" />
          ))}
          <span className="sr-only">Loading your profile…</span>
        </div>
      ) : !profile || !pick || empty ? (
        <EmptyProfile />
      ) : (
        <div className="flex flex-col gap-9">
          <div className="flex flex-col gap-2">
            <h2 className="font-serif text-[34px] leading-[1.1] tracking-[-0.03em] text-ink sm:text-[40px]">What goes in?</h2>
            <p className="text-[15px] leading-relaxed text-ink-2">
              Everything in your master profile is ticked. Untick what this resume can do without. You can edit the wording after it’s
              created — your profile won’t change.
            </p>
          </div>

          {PICK_SECTIONS.filter((section) => profile[section]?.length).map((section) => (
            <EntryPicker
              key={section}
              section={section}
              entries={profile[section] as unknown as Record<string, unknown>[]}
              pick={pick}
              onToggle={(index) => update((current) => toggleEntry(current, section, index))}
              onToggleBullet={(key) => update((current) => toggleBullet(current, key))}
              onAll={(on) => update((current) => setSection(current, section, profile, on))}
            />
          ))}

          {SKILL_GROUPS.some((group) => profile.skills?.[group.key]?.length) && (
            <PickCard
              id="pick-skills"
              title={SECTION_TITLES.skills}
              icon={SECTION_ICONS.skills}
              onAll={(on) => update((current) => setSkills(current, profile, on))}
            >
              <div className="flex flex-col gap-4">
                {SKILL_GROUPS.filter((group) => profile.skills?.[group.key]?.length).map((group) => (
                  <div key={group.key} className="flex flex-col gap-2">
                    <span className="label-mono text-ink-3">{group.label}</span>
                    <div className="flex flex-wrap gap-1.5">
                      {profile.skills[group.key].map((skill) => {
                        const on = pick.skills[group.key]?.includes(skill) ?? false
                        return (
                          <button
                            key={skill}
                            type="button"
                            aria-pressed={on}
                            onClick={() => update((current) => toggleSkill(current, group.key, skill, profile))}
                            className={`inline-flex h-8 items-center rounded-full px-3 text-[14px] transition-colors ${
                              on ? "bg-brand/12 text-ink ring-1 ring-brand/40" : "bg-fill text-ink-3 line-through decoration-ink-3/50 hover:text-ink-2"
                            }`}
                          >
                            {skill}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </PickCard>
          )}
        </div>
      )}
    </StudioShell>
  )
}

function PickCard({
  id,
  title,
  icon: Icon,
  onAll,
  children,
}: {
  id: string
  title: string
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>
  onAll: (on: boolean) => void
  children: React.ReactNode
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="flex scroll-mt-6 flex-col gap-3">
      <div className="flex items-center justify-between gap-3 border-b border-hairline pb-2">
        <h3 id={`${id}-title`} className="flex items-center gap-2 text-[17px] font-medium tracking-[-0.015em] text-ink">
          <Icon className="h-[17px] w-[17px] text-brand" aria-hidden />
          {title}
        </h3>
        <span className="flex gap-1">
          <button type="button" onClick={() => onAll(true)} className={pill("text", "h-8 px-3 text-[13px]")}>
            All
          </button>
          <button type="button" onClick={() => onAll(false)} className={pill("text", "h-8 px-3 text-[13px]")}>
            None
          </button>
        </span>
      </div>
      {children}
    </section>
  )
}

/** One section's entries, each with a box; jobs and projects open to a box per bullet. */
function EntryPicker({
  section,
  entries,
  pick,
  onToggle,
  onToggleBullet,
  onAll,
}: {
  section: PickSection
  entries: Record<string, unknown>[]
  pick: ProfilePick
  onToggle: (index: number) => void
  onToggleBullet: (key: string) => void
  onAll: (on: boolean) => void
}) {
  const spec = LIST_SECTIONS[section]
  const fields = (BULLET_FIELDS as Record<string, readonly string[]>)[section]
  const chosen = new Set(pick.entries[section])
  const dropped = new Set(pick.droppedBullets)

  return (
    <PickCard id={`pick-${section}`} title={SECTION_TITLES[section]} icon={SECTION_ICONS[section]} onAll={onAll}>
      <ul className="flex flex-col gap-2">
        {entries.map((entry, index) => {
          const on = chosen.has(index)
          const title = text(entry[spec.titleKey]) || `Untitled ${spec.singular.toLowerCase()}`
          const second = spec.secondKey ? text(entry[spec.secondKey]) : ""
          const meta = (spec.metaKeys ?? []).map((key) => text(entry[key])).filter(Boolean).join(" · ")
          const bullets = on && fields ? fields.flatMap((field) => ((entry[field] as string[] | undefined) ?? []).map((line, at) => ({ field, line, at }))) : []
          return (
            <li key={index} className={`rounded-[14px] px-3 py-2.5 transition-colors ${on ? "bg-fill/60" : ""}`}>
              <label className="flex cursor-pointer items-start gap-3">
                <input type="checkbox" checked={on} onChange={() => onToggle(index)} className={CHECK} />
                <span className={`flex min-w-0 flex-col ${on ? "" : "opacity-55"}`}>
                  <span className="text-[15px] font-medium leading-snug text-ink">
                    {title}
                    {second && <span className="font-normal text-ink-2"> — {second}</span>}
                  </span>
                  {meta && <span className="text-[13px] text-ink-3">{meta}</span>}
                </span>
              </label>
              {bullets.length > 0 && (
                <ul className="ml-7 mt-2 flex flex-col gap-1.5">
                  {bullets.map(({ field, line, at }) => {
                    const key = bulletKey(section as BulletSection, index, field, at)
                    const kept = !dropped.has(key)
                    return (
                      <li key={key}>
                        <label className="flex cursor-pointer items-start gap-2.5">
                          <input type="checkbox" checked={kept} onChange={() => onToggleBullet(key)} className={CHECK} />
                          <span className={`text-[14px] leading-snug ${kept ? "text-ink-2" : "text-ink-3 line-through decoration-ink-3/50"}`}>{line}</span>
                        </label>
                      </li>
                    )
                  })}
                </ul>
              )}
            </li>
          )
        })}
      </ul>
    </PickCard>
  )
}

function EmptyProfile() {
  return (
    <div className="flex flex-col items-start gap-4 rounded-[18px] border border-dashed border-rule-strong px-6 py-12">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-fill text-brand">
        <UserRound className="h-[18px] w-[18px]" aria-hidden="true" />
      </span>
      <p className="font-serif text-[26px] leading-tight tracking-[-0.025em] text-ink">Your master profile is empty</p>
      <p className="max-w-[48ch] text-[15px] leading-relaxed text-ink-2">
        A new resume is picked from your profile. Add your experience, projects and skills there first.
      </p>
      <Link href="/profile" className={`${pill("brand")} mt-1`}>
        <UserRound aria-hidden="true" />
        Open master profile
      </Link>
    </div>
  )
}
