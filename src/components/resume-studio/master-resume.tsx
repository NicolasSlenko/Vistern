"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2, PenLine, WandSparkles } from "lucide-react"
import type { Resume } from "@/app/api/parse/resumeSchema"
import type { BulletRewrite } from "@/lib/resume-suggestions"
// Review (parked below):
// import { RotateCcw, Sparkles } from "lucide-react"
// import { toast } from "sonner"
// import { alignFeedback } from "@/lib/feedback-entries"
// import { ModeTabs, type ModeOption } from "./mode-tabs"
// import { noteMarks } from "./paper-marks"
// import { TOOLBAR_QUIET } from "./paper-toolbar"
// import { reviewNotes, type XyzFeedback } from "./review-notes"
// import { useDismissedNotes } from "./use-dismissed-notes"
// Save as resume (parked below): import { FilePlus2 } from "lucide-react"
// import { applyResumeStandard, trimSummary } from "@/lib/resume/standard"
import { PaperPane } from "@/components/resume-paper/paper-pane"
import { BulletOptionsDialog } from "./bullet-options"
import { rewriteMarks } from "./paper-marks"
import { MarksCount, TOOLBAR_BRAND } from "./paper-toolbar"
import { pill } from "./pills"
import { SaveNote, StudioTitle } from "./studio-shell"
import { useAutosave } from "./use-autosave"
import { useBulletReview } from "./use-bullet-review"

/**
 * The master resume: the whole master profile set as one page, nothing left
 * out, with the AI's line rewrites drawn on the bullets they would replace.
 *
 * It isn't a document of its own — the profile (profile-studio.tsx) is the
 * record, and this is that record on paper. Taking a rewrite here changes the
 * profile.
 *
 * Two features are parked, commented out with their blocks labelled:
 * - "Review": whole-entry notes from /api/analyze/xyz-batch drawn on the
 *   page. Bringing it back also brings back the Suggestions / Review tabs.
 * - "Save as resume": a one-page snapshot onto All Resumes via
 *   POST /api/resume-documents (route intact).
 * Uncomment every block with a label to restore that feature.
 */

// Review: type Mode = "review" | "suggestions"

// Save as resume:
// const generalResumeName = () =>
//   `General resume — ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}`

export function MasterResume() {
  const router = useRouter()
  const [profile, setProfile] = useState<Resume | null>(null)
  const [loading, setLoading] = useState(true)
  // Review: const [review, setReview] = useState<XyzFeedback | null>(null)
  // Review: const [mode, setMode] = useState<Mode>("suggestions")
  // Review: const [asking, setAsking] = useState(false)
  // Save as resume: const [savingResume, setSavingResume] = useState(false)
  // The marked line whose three AI options are open, from the page's "More options".
  const [moreFor, setMoreFor] = useState<BulletRewrite | null>(null)

  const save = useAutosave<Resume>(async (next) => {
    const response = await fetch("/api/profile", { method: "POST", body: JSON.stringify(next) })
    const result = await response.json()
    if (!response.ok || !result.success) throw new Error(result.error || "Couldn't save your profile")
  })

  // Line-level rewrites for the profile, cached apart from any resume document's.
  const bullets = useBulletReview(profile, { scope: "profile", target: "profile" })

  useEffect(() => {
    let live = true
    fetch("/api/profile")
      .then((response) => response.json())
      .then((result) => live && result.success && setProfile(result.data))
      .catch(() => {})
      .finally(() => live && setLoading(false))
    // Review: the profile's last review.
    // fetch("/api/analyze/xyz-batch?for=profile")
    //   .then((response) => response.json())
    //   .then((result) => live && result.success && setReview(result.data ?? null))
    //   .catch(() => {})
    return () => {
      live = false
    }
  }, [])

  /** A taken rewrite is a change to the profile itself. */
  const edit = useCallback(
    (next: Resume) => {
      setProfile(next)
      save.queue(next)
    },
    [save],
  )

  // There is no form on this page: "go to" opens the profile, where the entry can be edited.
  const goToProfile = useCallback(() => router.push("/profile"), [router])

  // Review: ask the AI to read the whole profile.
  // const askAi = async () => {
  //   if (!profile) return
  //   setAsking(true)
  //   try {
  //     const response = await fetch("/api/analyze/xyz-batch", {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({ resumeData: profile, target: "profile" }),
  //     })
  //     const result = await response.json()
  //     if (!result.success) throw new Error(result.error || "The AI couldn't read it this time")
  //     setReview(result.data ?? null)
  //   } catch (error) {
  //     toast.error(error instanceof Error ? error.message : "Couldn't get AI notes")
  //   } finally {
  //     setAsking(false)
  //   }
  // }

  // Save as resume: snapshot the page onto the shelf and open it there.
  // const saveAsResume = async () => {
  //   if (!profile || savingResume) return
  //   setSavingResume(true)
  //   try {
  //     const response = await fetch("/api/resume-documents", {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({ content: profile, fileName: generalResumeName() }),
  //     })
  //     const result = await response.json()
  //     if (!response.ok || !result.success) throw new Error(result.error || "Couldn't save this resume")
  //     toast.success(`Saved "${result.data.fileName}" to your shelf`, {
  //       description: result.data.trimmed ? "Fitted to one page — the profile still has everything." : undefined,
  //     })
  //     router.push(`/resumes/${result.data.id}`)
  //   } catch (error) {
  //     toast.error(error instanceof Error ? error.message : "Couldn't save this resume")
  //     setSavingResume(false)
  //   }
  // }

  // Review: each entry's notes follow the entry they were written about, wherever it now sits.
  // const feedback = useMemo(() => alignFeedback(review, profile), [review, profile])
  // const allNotes = useMemo(() => reviewNotes(profile, feedback), [profile, feedback])
  // const { open: notes, hidden, dismiss, restore } = useDismissedNotes(allNotes)

  // Save as resume: what a one-page save would leave out, for the button's tooltip.
  // const trimmed = useMemo(() => (profile ? trimSummary(profile, applyResumeStandard(profile)) : null), [profile])
  // const saveTitle = !trimmed || (trimmed.entries === 0 && trimmed.bullets === 0)
  //   ? "Put a one-page copy of this resume on your shelf"
  //   : `Put a one-page copy on your shelf. To fit, ${[
  //       trimmed.entries && `${trimmed.entries} ${trimmed.entries === 1 ? "entry" : "entries"}`,
  //       trimmed.bullets && `${trimmed.bullets} ${trimmed.bullets === 1 ? "bullet" : "bullets"}`,
  //     ].filter(Boolean).join(" and ")} will be left out; the profile keeps everything.`

  const marks = useMemo(
    () =>
      rewriteMarks(bullets.live, bullets.answered, {
        onAccept: (rewrite) => bullets.accept(rewrite, edit),
        onReject: bullets.reject,
        onMore: setMoreFor,
        onGoTo: goToProfile,
      }),
    [bullets, edit, goToProfile],
  )
  // Review: with the tabs back, marks switch on the mode.
  // const marks = useMemo(
  //   () =>
  //     mode === "review"
  //       ? noteMarks(notes, { onDone: dismiss, onGoTo: goToProfile })
  //       : rewriteMarks(bullets.live, bullets.answered, { …as above… }),
  //   [mode, notes, dismiss, goToProfile, bullets, edit],
  // )
  // const modes: ModeOption<Mode>[] = [
  //   { id: "suggestions", label: "Suggestions", icon: WandSparkles, badge: bullets.open.length || undefined },
  //   { id: "review", label: "Review", icon: Sparkles, badge: notes.length || undefined },
  // ]

  return (
    // The sheets sit in the document and the window scrolls them; the bar at
    // the top stays put. A box that scrolls inside itself depends on every
    // ancestor passing its height down, and one that doesn't leaves the page
    // stuck — the window always scrolls.
    <div className="zip-scope desk desk-bright flex min-h-[calc(100vh-var(--chrome-top,82px))] flex-col p-2 sm:p-5 xl:p-6">
      <div className="paper-frame flex flex-1 flex-col">
        <div className="paper flex flex-1 flex-col">
          <header data-tour="master-resume-header" className="sticky top-[var(--chrome-top,0px)] z-40 rounded-t-[28px] border-b border-hairline bg-sheet">
            <div className="flex min-h-[72px] flex-wrap items-center justify-between gap-x-4 gap-y-2 px-3 py-[13px] sm:px-[14px]">
              <div className="flex min-w-0 items-center gap-3">
                <StudioTitle>Master resume</StudioTitle>
                <SaveNote state={save.state} />
              </div>
              {/* Review: the tab switch, in the middle of the bar. Add
                  xl:grid xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] back to the row above.
              <div data-tour="master-resume-modes" className="flex items-center gap-2 max-xl:order-last max-xl:w-full">
                <ModeTabs modes={modes} mode={mode} onChoose={setMode} />
              </div>
              */}
              <div className="flex min-w-0 items-center justify-end gap-2.5">
                <Link href="/profile" className={pill("white", "h-10 px-4 text-[15px] font-medium")}>
                  <PenLine aria-hidden="true" />
                  <span className="max-sm:sr-only">Edit profile</span>
                </Link>
                {/* Save as resume:
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
                */}
              </div>
            </div>
          </header>

          <section aria-label="The page itself" className="flex flex-1 flex-col p-3">
            {/* No overflow clipping here: the bars inside stick to the window's edges. */}
            <div className="flex flex-1 flex-col rounded-[22px] bg-fill xl:rounded-[24px]">
              {loading ? (
                <div aria-busy="true" className="flex min-h-[60vh] flex-1 items-center justify-center p-6">
                  <span className="label-mono text-ink-3">Loading your profile…</span>
                </div>
              ) : (
                <PaperPane
                  layout="flow"
                  resume={profile}
                  marks={marks}
                  toolbar={
                    <>
                      <MarksCount count={bullets.open.length} one="suggestion" many="suggestions" empty={bullets.all.length ? "All answered" : "No suggestions yet"} />
                      <button type="button" onClick={bullets.ask} disabled={bullets.asking || !profile} className={TOOLBAR_BRAND}>
                        {bullets.asking ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <WandSparkles className="h-3.5 w-3.5" aria-hidden="true" />}
                        {bullets.asking ? "Reading…" : bullets.all.length ? "Suggest again" : "Suggest rewrites"}
                      </button>
                    </>
                    // Review: in Review mode the toolbar is instead
                    // <MarksCount count={notes.length} one="note" many="notes" empty={feedback ? "No notes left" : "No review yet"} />
                    // {hidden > 0 && (
                    //   <button type="button" onClick={restore} className={TOOLBAR_QUIET}>
                    //     <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                    //     Show {hidden} done
                    //   </button>
                    // )}
                    // <button type="button" onClick={askAi} disabled={asking || !profile} className={TOOLBAR_BRAND}>
                    //   {asking ? <Loader2 … /> : <Sparkles … />}
                    //   {asking ? "Reading…" : feedback ? "Review again" : "Review my profile"}
                    // </button>
                  }
                />
              )}
            </div>
          </section>
        </div>
      </div>

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
    </div>
  )
}
