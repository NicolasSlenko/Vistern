"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { FilePlus2, FileText, Loader2, PenLine, RotateCcw, Sparkles, Trash2, Upload, WandSparkles } from "lucide-react"
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
import { flaggedEntries, notesBySection, reviewNotes, type XyzFeedback } from "./review-notes"
import { SectionForm } from "./section-form"
import { SectionNav } from "./section-nav"
import { LIST_SECTIONS, type ListSection, type SectionRef } from "./sections"
import { SaveNote, StudioShell, StudioTitle } from "./studio-shell"
import { useDismissedNotes } from "./use-dismissed-notes"
import { useAutosave } from "./use-autosave"
import { useBulletReview } from "./use-bullet-review"
import { MarksCount, TOOLBAR_BRAND, TOOLBAR_QUIET } from "./paper-toolbar"
import { noteMarks, rewriteMarks } from "./paper-marks"
import { revealInForm } from "./reveal"
import { applyResumeStandard, trimSummary } from "@/lib/resume/standard"

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

  // Line-level rewrites for the general resume, cached apart from any resume document's.
  const bullets = useBulletReview(profile, { scope: "profile", target: "profile" })
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

  // Choosing a section keeps the mode: the left column is the same list in all
  // three, and Review or Suggestions only changes what is drawn on the page.
  const open = useCallback((next: SectionRef) => {
    setSection(next)
    if (formRef.current) formRef.current.scrollTop = 0
  }, [])

  /** A review note on the page opens its section and the card it's about. */
  const goTo = useCallback(
    (next: SectionRef, entryIndex?: number) => {
      if (next !== section) open(next)
      revealInForm(formRef.current, { entryIndex })
    },
    [open, section],
  )

  /** A rewrite on the page opens its card and scrolls to the very bullet. */
  const goToRewrite = useCallback(
    (rewrite: BulletRewrite) => {
      if (rewrite.section !== section) open(rewrite.section)
      revealInForm(formRef.current, { entryIndex: rewrite.entryIndex, field: rewrite.field, line: rewrite.bulletIndex })
    },
    [open, section],
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
      toast.success(`Saved "${result.data.fileName}" to your shelf`, {
        description: result.data.trimmed ? "Fitted to one page — the profile still has everything." : undefined,
      })
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
  const allNotes = useMemo(() => reviewNotes(profile, feedback), [profile, feedback])
  const { open: notes, hidden, dismiss, restore } = useDismissedNotes(allNotes)
  // What a one-page save would leave out. The page on the right stays untrimmed:
  // it is the whole profile, and the AI's marks point at its lines.
  const trimmed = useMemo(() => (profile ? trimSummary(profile, applyResumeStandard(profile)) : null), [profile])
  const saveTitle = !trimmed || (trimmed.entries === 0 && trimmed.bullets === 0)
    ? "Put a one-page copy of this resume on your shelf"
    : `Put a one-page copy on your shelf. To fit, ${[
        trimmed.entries && `${trimmed.entries} ${trimmed.entries === 1 ? "entry" : "entries"}`,
        trimmed.bullets && `${trimmed.bullets} ${trimmed.bullets === 1 ? "bullet" : "bullets"}`,
      ].filter(Boolean).join(" and ")} will be left out; the profile keeps everything.`

  const marks = useMemo(
    () =>
      mode === "review"
        ? noteMarks(notes, { onDone: dismiss, onGoTo: goTo })
        : rewriteMarks(bullets.live, bullets.answered, {
            onAccept: (rewrite) => bullets.accept(rewrite, edit),
            onReject: bullets.reject,
            onMore: setMoreFor,
            onGoTo: goToRewrite,
          }),
    [mode, notes, dismiss, goTo, bullets, edit, goToRewrite],
  )

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
            title={saveTitle}
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
      // The section list stays put in every mode: the AI's output is drawn on
      // the page, on the lines it is about, rather than listed over here.
      left={
        <SectionNav
          resume={profile}
          active={section}
          onSelect={open}
          notesBySection={mode === "review" ? notesBySection(notes) : bullets.counts}
        />
      }
      // The general resume, as a page: the whole profile, nothing left out.
      // Write and Suggestions draw the line rewrites on it; Review, the notes.
      preview={
        <PaperPane
          resume={profile}
          marks={marks}
          toolbar={
            mode === "review" ? (
              <>
                <MarksCount count={notes.length} one="note" many="notes" empty={feedback ? "No notes left" : "No review yet"} />
                {hidden > 0 && (
                  <button type="button" onClick={restore} className={TOOLBAR_QUIET}>
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                    Show {hidden} done
                  </button>
                )}
                <button type="button" onClick={askAi} disabled={asking || !profile} className={TOOLBAR_BRAND}>
                  {asking ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />}
                  {asking ? "Reading…" : feedback ? "Review again" : "Review my profile"}
                </button>
              </>
            ) : mode === "suggestions" ? (
              <>
                <MarksCount count={bullets.open.length} one="suggestion" many="suggestions" empty={bullets.all.length ? "All answered" : "No suggestions yet"} />
                <button type="button" onClick={bullets.ask} disabled={bullets.asking || !profile} className={TOOLBAR_BRAND}>
                  {bullets.asking ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <WandSparkles className="h-3.5 w-3.5" aria-hidden="true" />}
                  {bullets.asking ? "Reading…" : bullets.all.length ? "Suggest again" : "Suggest rewrites"}
                </button>
              </>
            ) : undefined
          }
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
