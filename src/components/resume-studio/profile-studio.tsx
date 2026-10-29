"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { FilePlus2, FileText, Loader2, PenLine, Sparkles, Trash2, Upload, WandSparkles } from "lucide-react"
import { toast } from "sonner"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import type { Resume } from "@/app/api/parse/resumeSchema"
import { alignFeedback } from "@/lib/feedback-entries"
import type { BulletRewrite } from "@/lib/resume-suggestions"
import { PaperPane } from "@/components/resume-paper/paper-pane"
import { BulletOptionsDialog } from "./bullet-options"
import type { ModeOption } from "./mode-tabs"
import { pill } from "./pills"
import { ProfileForm, SkillsForm } from "./profile-form"
import { ReviewPanel } from "./review-panel"
import { flaggedEntries, notesBySection, reviewNotes, type XyzFeedback } from "./review-notes"
import { SectionForm } from "./section-form"
import { SectionNav } from "./section-nav"
import { LIST_SECTIONS, type ListSection, type SectionRef } from "./sections"
import { SaveNote, StudioShell, StudioTitle } from "./studio-shell"
import { SuggestionsPanel } from "./suggestions-panel"
import { useDismissedNotes } from "./use-dismissed-notes"
import { useAutosave } from "./use-autosave"
import { useProfileBulletReview } from "./use-profile-bullet-review"

/**
 * The master profile: everything the student has actually done, in one
 * record, held apart from any particular resume.
 *
 * There is exactly one of these. Resumes (components/resume-studio/
 * resume-doc-studio.tsx) are tellings of it, aimed at different jobs, and
 * each keeps its own wording — so editing a resume never reaches back here,
 * and editing here never silently rewrites a resume the student has already
 * sent.
 *
 * The page on the right is the general resume: the whole profile set as a
 * recruiter would see it, untrimmed, redrawn as the form changes. "Save as
 * resume" takes a snapshot of it onto the shelf; from then on the two are
 * edited apart.
 */

type Mode = "write" | "review" | "suggestions"

const generalResumeName = () =>
  `General resume — ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}`

export function ProfileStudio() {
  const router = useRouter()
  // The profile's own review, not the current resume's: the two list entries
  // in different orders, so a resume's notes would land on the wrong cards.
  const [review, setReview] = useState<XyzFeedback | null>(null)

  const [profile, setProfile] = useState<Resume | null>(null)
  const [loading, setLoading] = useState(true)
  const [resumeCount, setResumeCount] = useState<number | null>(null)
  const [mode, setMode] = useState<Mode>("write")
  const [section, setSection] = useState<SectionRef>("profile")
  const [asking, setAsking] = useState(false)
  const [clearOpen, setClearOpen] = useState(false)
  const [clearText, setClearText] = useState("")
  const [clearing, setClearing] = useState(false)
  const [savingResume, setSavingResume] = useState(false)
  const formRef = useRef<HTMLElement>(null)

  const save = useAutosave<Resume>(async (next) => {
    const response = await fetch("/api/profile", { method: "POST", body: JSON.stringify(next) })
    const result = await response.json()
    if (!response.ok || !result.success) throw new Error(result.error || "Couldn't save your profile")
  })

  // Line-level rewrites for the general resume. UI only until the AI is connected.
  const bullets = useProfileBulletReview(profile)
  // The marked line whose three AI options are open, from the paper's "More options".
  const [moreFor, setMoreFor] = useState<BulletRewrite | null>(null)

  useEffect(() => {
    let live = true
    fetch("/api/profile")
      .then((response) => response.json())
      .then((result) => live && result.success && setProfile(result.data))
      .catch(() => {})
      .finally(() => live && setLoading(false))
    fetch("/api/analyze/xyz-batch?for=profile")
      .then((response) => response.json())
      .then((result) => live && result.success && setReview(result.data ?? null))
      .catch(() => {})
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

  /** Choosing a rewrite opens the card it's about and scrolls the line into view. */
  const goToRewrite = useCallback(
    (rewrite: BulletRewrite) => {
      open(rewrite.section)
      requestAnimationFrame(() => {
        const card = document.querySelector<HTMLElement>(`[data-entry-index="${rewrite.entryIndex}"]`)
        const toggle = card?.querySelector<HTMLButtonElement>("button[aria-expanded]")
        if (toggle?.getAttribute("aria-expanded") === "false") toggle.click()
        requestAnimationFrame(() => card?.scrollIntoView({ block: "center", behavior: "smooth" }))
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
        body: JSON.stringify({ resumeData: profile, target: "profile" }),
      })
      const result = await response.json()
      if (!result.success) throw new Error(result.error || "The AI couldn't read it this time")
      setReview(result.data ?? null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't get AI notes")
    } finally {
      setAsking(false)
    }
  }

  /** Snapshot the general resume onto the shelf and open it there. */
  const saveAsResume = async () => {
    if (!profile || savingResume) return
    setSavingResume(true)
    try {
      const response = await fetch("/api/resume-documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: profile, fileName: generalResumeName() }),
      })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error || "Couldn't save this resume")
      toast.success(`Saved "${result.data.fileName}" to your shelf`)
      router.push(`/resumes/${result.data.id}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't save this resume")
      setSavingResume(false)
    }
  }

  const clearProfile = async () => {
    if (clearText !== "CLEAR" || clearing || (save.state !== "clean" && save.state !== "saved")) return
    setClearing(true)
    try {
      const response = await fetch("/api/profile", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: clearText }),
      })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error || "Could not clear your profile")
      setProfile(result.data)
      setSection("profile")
      setMode("write")
      setClearOpen(false)
      setClearText("")
      toast.success("Master profile cleared")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not clear your profile")
    } finally {
      setClearing(false)
    }
  }

  // Ticked-off notes disappear from the panel, the section counts and the
  // dots on the cards together, because they are all the same list.
  // Each entry's notes follow the entry they were written about, wherever it now sits.
  const feedback = useMemo(() => alignFeedback(review, profile), [review, profile])
  const allNotes = reviewNotes(profile, feedback)
  const { open: notes, hidden, dismiss, restore } = useDismissedNotes(allNotes)
  const modes: ModeOption<Mode>[] = [
    { id: "write", label: "Write", icon: PenLine },
    { id: "review", label: "Review", icon: Sparkles, badge: notes.length || undefined },
    { id: "suggestions", label: "Suggestions", icon: WandSparkles, badge: bullets.open.length || undefined },
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
          <Dialog open={clearOpen} onOpenChange={(next) => { if (!clearing) { setClearOpen(next); if (!next) setClearText("") } }}>
            <DialogTrigger asChild>
              <button type="button" disabled={loading || !profile || (save.state !== "clean" && save.state !== "saved")} aria-label="Clear master profile" title="Clear master profile" className={pill("white", "h-10 w-10 p-0")}>
                <Trash2 aria-hidden="true" />
              </button>
            </DialogTrigger>
            <DialogContent className="zip-scope flex flex-col gap-5 border-hairline bg-sheet p-6 rounded-[18px] sm:max-w-md sm:rounded-[18px]">
              <DialogHeader className="flex flex-col gap-2">
                <DialogTitle className="font-serif text-[26px] leading-tight font-normal text-ink">Clear master profile</DialogTitle>
                <DialogDescription className="text-[15px] leading-relaxed text-ink-2">Remove your profile details, skills and experience. Saved resumes and your account stay available.</DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-2">
                <label htmlFor="clear-profile-confirm" className="label-mono text-ink-2">Type CLEAR to confirm</label>
                <input id="clear-profile-confirm" value={clearText} onChange={(event) => setClearText(event.target.value)} placeholder="CLEAR" disabled={clearing} autoComplete="off" className="h-10 w-full rounded-[12px] border border-rule-strong bg-sheet px-3 font-mono text-[14px] text-ink outline-none focus-visible:border-brand disabled:opacity-50" />
              </div>
              <DialogFooter className="gap-2 sm:gap-2.5">
                <DialogClose asChild><button type="button" disabled={clearing} className={pill("white")}>Cancel</button></DialogClose>
                <button type="button" onClick={clearProfile} disabled={clearText !== "CLEAR" || clearing} className={pill("danger")}>
                  {clearing ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Trash2 aria-hidden="true" />}
                  {clearing ? "Clearing..." : "Clear profile"}
                </button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Link href="/resumes" className={pill("white", "h-10 px-4 text-[15px] font-medium")}>
            <FileText aria-hidden="true" />
            <span className="max-sm:sr-only">
              Resumes
              {resumeCount !== null && <span className="text-ink-3"> · {resumeCount}</span>}
            </span>
          </Link>
          <button
            type="button"
            onClick={saveAsResume}
            disabled={loading || !profile || savingResume}
            title="Put a copy of this resume on your shelf"
            className={pill("brand", "h-10 px-5 text-[15px] font-medium")}
          >
            {savingResume ? <Loader2 className="animate-spin" aria-hidden="true" /> : <FilePlus2 aria-hidden="true" />}
            <span className="max-sm:sr-only">Save as resume</span>
          </button>
          {save.state !== "clean" && save.state !== "saved" && (
            <button
              type="button"
              onClick={save.saveNow}
              disabled={save.state === "saving"}
              className={pill("white", "h-10 px-4 text-[15px] font-medium sm:min-w-[104px]")}
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
        ) : mode === "review" ? (
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
        ) : (
          <SuggestionsPanel
            resume={profile}
            score={0}
            rewrites={bullets.live}
            open={bullets.open}
            asking={bullets.asking}
            loaded={bullets.loaded}
            onAsk={bullets.ask}
            onGoTo={goToRewrite}
            onAccept={(rewrite) => bullets.accept(rewrite, edit)}
            onReject={bullets.reject}
          />
        )
      }
      // The general resume, as a page: the whole profile, nothing left out,
      // with the AI's marks on the lines they are about once it's connected.
      preview={
        <PaperPane
          resume={profile}
          rewrites={bullets.live}
          answered={bullets.answered}
          onAccept={(rewrite) => bullets.accept(rewrite, edit)}
          onReject={bullets.reject}
          onMoreOptions={setMoreFor}
        />
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
              // Only experience and projects have bullets the AI rewrites.
              rewritesFor={
                section === "experience" || section === "projects" ? (entryIndex) => bullets.forEntry(section, entryIndex) : undefined
              }
              suggestions={{
                onAccept: (rewrite) => bullets.accept(rewrite, edit),
                onReject: bullets.reject,
              }}
            />
          )}
        </div>
      )}

      {moreFor && profile && (
        <BulletOptionsDialog
          open
          onOpenChange={(next) => !next && setMoreFor(null)}
          section={moreFor.section}
          entry={((profile[moreFor.section] ?? []) as Record<string, unknown>[])[moreFor.entryIndex] ?? {}}
          bullet={moreFor.original}
          // Taking an option answers the mark the same way taking its single suggestion would.
          onChoose={(text) => bullets.accept({ ...moreFor, suggested: text }, edit)}
        />
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
