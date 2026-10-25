"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { FileText, Loader2, PenLine, Sparkles, Upload } from "lucide-react"
import { toast } from "sonner"
import type { Resume } from "@/app/api/parse/resumeSchema"
import { useResume } from "@/contexts/resume-context"
import type { ModeOption } from "./mode-tabs"
import { pill } from "./pills"
import { ProfileForm, SkillsForm } from "./profile-form"
import { ReviewPanel } from "./review-panel"
import { flaggedEntries, notesBySection, reviewNotes, type XyzFeedback } from "./review-notes"
import { SectionForm } from "./section-form"
import { SectionNav } from "./section-nav"
import { LIST_SECTIONS, type ListSection, type SectionRef } from "./sections"
import { SaveNote, StudioShell, StudioTitle } from "./studio-shell"
import { useDismissedNotes } from "./use-dismissed-notes"
import { useAutosave } from "./use-autosave"

/**
 * The master profile: everything the student has actually done, in one
 * record, held apart from any particular resume.
 *
 * There is exactly one of these. Resumes (components/resume-studio/
 * resume-doc-studio.tsx) are tellings of it, aimed at different jobs, and
 * each keeps its own wording — so editing a resume never reaches back here,
 * and editing here never silently rewrites a resume the student has already
 * sent. That separation is why this view has no page beside it: there's no
 * one document for the profile to be.
 */

type Mode = "write" | "review"

export function ProfileStudio() {
  const { xyzFeedback, refreshResumeData } = useResume()
  const feedback = (xyzFeedback ?? null) as XyzFeedback | null

  const [profile, setProfile] = useState<Resume | null>(null)
  const [loading, setLoading] = useState(true)
  const [resumeCount, setResumeCount] = useState<number | null>(null)
  const [mode, setMode] = useState<Mode>("write")
  const [section, setSection] = useState<SectionRef>("profile")
  const [asking, setAsking] = useState(false)
  const formRef = useRef<HTMLElement>(null)

  const save = useAutosave<Resume>(async (next) => {
    const response = await fetch("/api/profile", { method: "POST", body: JSON.stringify(next) })
    const result = await response.json()
    if (!response.ok || !result.success) throw new Error(result.error || "Couldn't save your profile")
  })

  useEffect(() => {
    let live = true
    fetch("/api/profile")
      .then((response) => response.json())
      .then((result) => live && result.success && setProfile(result.data))
      .catch(() => {})
      .finally(() => live && setLoading(false))
    // Only the count: this view links to the resumes rather than listing them.
    fetch("/api/resume-documents")
      .then((response) => response.json())
      .then((result) => live && result.success && setResumeCount(result.data.length))
      .catch(() => {})
    return () => {
      live = false
    }
  }, [])

  const edit = useCallback(
    (next: Resume) => {
      setProfile(next)
      save.queue(next)
    },
    [save],
  )

  const open = useCallback((next: SectionRef) => {
    setSection(next)
    setMode("write")
    if (formRef.current) formRef.current.scrollTop = 0
  }, [])

  const goTo = useCallback(
    (next: SectionRef, entryIndex?: number) => {
      open(next)
      if (entryIndex === undefined) return
      requestAnimationFrame(() => {
        const card = document.querySelector<HTMLElement>(`[data-entry-index="${entryIndex}"]`)
        card?.querySelector<HTMLButtonElement>("button[aria-expanded]")?.click()
        card?.scrollIntoView({ block: "center", behavior: "smooth" })
      })
    },
    [open],
  )

  const askAi = async () => {
    if (!profile) return
    setAsking(true)
    try {
      const response = await fetch("/api/analyze/xyz-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeData: profile }),
      })
      const result = await response.json()
      if (!result.success) throw new Error(result.error || "The AI couldn't read it this time")
      await refreshResumeData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't get AI notes")
    } finally {
      setAsking(false)
    }
  }

  // Ticked-off notes disappear from the panel, the section counts and the
  // dots on the cards together, because they are all the same list.
  const allNotes = reviewNotes(profile, feedback)
  const { open: notes, hidden, dismiss, restore } = useDismissedNotes(allNotes)
  const modes: ModeOption<Mode>[] = [
    { id: "write", label: "Write", icon: PenLine },
    { id: "review", label: "Review", icon: Sparkles, badge: notes.length || undefined },
  ]

  return (
    <StudioShell
      modes={modes}
      mode={mode}
      onMode={setMode}
      formRef={formRef}
      title={<StudioTitle>Master profile</StudioTitle>}
      note={<SaveNote state={save.state} />}
      actions={
        <>
          <Link href="/resumes" className={pill("white", "h-10 px-4 text-[15px] font-medium")}>
            <FileText aria-hidden="true" />
            <span className="max-sm:sr-only">
              Resumes
              {resumeCount !== null && <span className="text-ink-3"> · {resumeCount}</span>}
            </span>
          </Link>
          {save.state !== "clean" && save.state !== "saved" && (
            <button
              type="button"
              onClick={save.saveNow}
              disabled={save.state === "saving"}
              className={pill("brand", "h-10 px-5 text-[15px] font-medium sm:min-w-[104px]")}
            >
              {save.state === "saving" && <Loader2 className="animate-spin" aria-hidden="true" />}
              {save.state === "saving" ? "Saving" : save.state === "failed" ? "Try again" : "Save now"}
            </button>
          )}
        </>
      }
      left={
        mode === "write" ? (
          <SectionNav resume={profile} active={section} onSelect={open} notesBySection={notesBySection(notes)} />
        ) : (
          <ReviewPanel
            resume={profile}
            feedback={feedback}
            asking={asking}
            onAsk={askAi}
            onGoTo={goTo}
            notes={notes}
            hidden={hidden}
            onDone={dismiss}
            onRestore={restore}
          />
        )
      }
    >
      {loading ? (
        <LoadingForm />
      ) : !profile ? (
        <EmptyProfile />
      ) : (
        // Each section fades in as it's chosen: a new key mounts it anew, and
        // `starting:` is where its transition begins.
        <div
          key={section}
          className="transition-[opacity,translate] duration-200 ease-out motion-reduce:transition-none starting:translate-y-1 starting:opacity-0"
        >
          {section === "profile" ? (
            <ProfileForm basics={profile.basics} onChange={(basics) => edit({ ...profile, basics })} />
          ) : section === "skills" ? (
            <SkillsForm skills={profile.skills} onChange={(skills) => edit({ ...profile, skills })} />
          ) : (
            <SectionForm
              spec={LIST_SECTIONS[section as ListSection]}
              entries={(profile[section as ListSection] ?? []) as Record<string, unknown>[]}
              flagged={flaggedEntries(notes, section)}
              notesFor={(entryIndex) => notes.filter((note) => note.section === section && note.entryIndex === entryIndex)}
              onNoteDone={(note) => dismiss(note)}
              onChange={(entries) => edit({ ...profile, [section]: entries } as Resume)}
            />
          )}
        </div>
      )}
    </StudioShell>
  )
}

/** The form's shape while the profile is fetched, so the sheet doesn't jump when it lands. */
function LoadingForm() {
  return (
    <div aria-busy="true" className="flex flex-col gap-6">
      <div className="h-10 w-48 rounded-lg bg-fill" />
      <div className="grid grid-cols-1 gap-x-5 gap-y-[22px] sm:grid-cols-2">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="flex flex-col gap-2">
            <div className="h-[11px] w-20 rounded bg-fill" />
            <div className="h-9 rounded bg-fill/70" />
          </div>
        ))}
      </div>
      <span className="sr-only">Loading your profile…</span>
    </div>
  )
}

function EmptyProfile() {
  return (
    <div className="flex flex-col items-start gap-4 py-10">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-fill text-brand">
        <Sparkles className="h-[18px] w-[18px]" aria-hidden="true" />
      </span>
      <h1 className="font-serif text-[36px] leading-[1.05] tracking-[-0.03em] text-ink">
        Let’s start from <em className="text-brand">your resume</em>
      </h1>
      <p className="max-w-[46ch] text-[15px] leading-relaxed text-ink-2">
        Upload a PDF and we’ll read it into a profile you can edit here — every role, project and skill as its own card. This profile stays
        one record; the resumes you send out are built from it.
      </p>
      <Link href="/upload" className={`${pill("brand")} mt-1`}>
        <Upload aria-hidden="true" />
        Upload a resume
      </Link>
    </div>
  )
}
