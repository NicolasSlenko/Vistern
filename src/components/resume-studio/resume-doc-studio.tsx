"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Loader2, PenLine, RotateCcw, Sparkles, Star } from "lucide-react"
import { toast } from "sonner"
import type { Resume } from "@/app/api/parse/resumeSchema"
import type { BulletRewrite } from "@/lib/resume-suggestions"
import type { ModeOption } from "./mode-tabs"
import { pill } from "./pills"
import { PaperPane } from "@/components/resume-paper/paper-pane"
import { PreviewPane } from "./preview-pane"
import { ProfileForm, SkillsForm } from "./profile-form"
import { SectionForm } from "./section-form"
import { SectionNav } from "./section-nav"
import { LIST_SECTIONS, type ListSection, type SectionRef } from "./sections"
import { SaveNote, StudioShell, StudioTitle } from "./studio-shell"
import { SuggestionsPanel } from "./suggestions-panel"
import { useAutosave } from "./use-autosave"
import { useBulletReview } from "./use-bullet-review"

/**
 * One resume document: the file as uploaded on the right, its wording in the
 * middle, and the AI's line-level rewrites on the left.
 *
 * Edits here stay here. A student keeps several resumes aimed at different
 * jobs, and the master profile (profile-studio.tsx) is the one record behind
 * them all — so taking a rewrite changes this resume and nothing else.
 */

type Mode = "write" | "suggestions"

export interface ResumeDocument {
  id: string
  fileName: string
  s3Key: string | null
  score: number
  isStarred: boolean
  isCurrent: boolean
  targetRole: string | null
  updatedAt: string
  content: Resume
}

export function ResumeDocStudio({ id }: { id: string }) {
  const [doc, setDoc] = useState<ResumeDocument | null>(null)
  const [loading, setLoading] = useState(true)
  const [missing, setMissing] = useState(false)
  const [mode, setMode] = useState<Mode>("write")
  const [section, setSection] = useState<SectionRef>("experience")
  const formRef = useRef<HTMLElement>(null)

  const save = useAutosave<Resume>(async (content) => {
    const response = await fetch(`/api/resume-documents/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    })
    const result = await response.json()
    if (!response.ok || !result.success) throw new Error(result.error || "Couldn't save this resume")
    setDoc((current) => (current ? { ...current, score: result.data.score ?? current.score } : current))
  })

  const content = doc?.content ?? null
  const review = useBulletReview(content, { scope: `resume:${id}`, resumeDocumentId: id })

  useEffect(() => {
    let live = true
    fetch(`/api/resume-documents/${id}`)
      .then((response) => response.json())
      .then((result) => {
        if (!live) return
        if (result.success) setDoc(result.data)
        else setMissing(true)
      })
      .catch(() => live && setMissing(true))
      .finally(() => live && setLoading(false))
    return () => {
      live = false
    }
  }, [id])

  const edit = useCallback(
    (next: Resume) => {
      setDoc((current) => (current ? { ...current, content: next } : current))
      save.queue(next)
    },
    [save],
  )

  const open = useCallback((next: SectionRef) => {
    setSection(next)
    setMode("write")
    if (formRef.current) formRef.current.scrollTop = 0
  }, [])

  /** Choosing a suggestion opens the card it's about and scrolls the line into view. */
  const goTo = useCallback(
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

  const toggleStar = async () => {
    if (!doc) return
    const next = !doc.isStarred
    setDoc({ ...doc, isStarred: next })
    await fetch(`/api/resume-documents/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isStarred: next }),
    }).catch(() => toast.error("Couldn't change that"))
  }

  if (missing) return <NotFound />

  const waiting = review.open.length
  const modes: ModeOption<Mode>[] = [
    { id: "write", label: "Write", icon: PenLine },
    { id: "suggestions", label: "Suggestions", icon: Sparkles, badge: waiting || undefined },
  ]

  return (
    <StudioShell
      modes={modes}
      mode={mode}
      onMode={setMode}
      formRef={formRef}
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
          <StudioTitle>{doc?.fileName ?? "Resume"}</StudioTitle>
        </>
      }
      note={<SaveNote state={save.state} />}
      actions={
        <>
          <button
            type="button"
            onClick={toggleStar}
            aria-pressed={doc?.isStarred}
            aria-label={doc?.isStarred ? "Remove star" : "Star this resume"}
            className={`${pill("white", "h-10 w-10 p-0")} ${doc?.isStarred ? "text-brand" : "text-ink-3"}`}
          >
            <Star className="h-[17px] w-[17px]" fill={doc?.isStarred ? "currentColor" : "none"} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={review.ask}
            disabled={review.asking || !content}
            className={pill("brand", "h-10 px-4 text-[15px] font-medium")}
          >
            {review.asking ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Sparkles aria-hidden="true" />}
            <span className="max-sm:sr-only">{review.asking ? "Reading…" : review.all.length ? "Review again" : "Review bullets"}</span>
          </button>
          {save.state !== "clean" && save.state !== "saved" && (
            <button
              type="button"
              onClick={save.saveNow}
              disabled={save.state === "saving"}
              className={pill("white", "h-10 px-4 text-[15px] font-medium")}
            >
              {save.state === "saving" ? <Loader2 className="animate-spin" aria-hidden="true" /> : <RotateCcw aria-hidden="true" />}
              <span className="max-sm:sr-only">{save.state === "failed" ? "Try again" : "Save now"}</span>
            </button>
          )}
        </>
      }
      left={
        mode === "write" ? (
          <SectionNav resume={content} active={section} onSelect={open} notesBySection={review.counts} />
        ) : (
          <SuggestionsPanel
            resume={content}
            score={doc?.score ?? 0}
            rewrites={review.live}
            open={review.open}
            asking={review.asking}
            loaded={review.loaded}
            onAsk={review.ask}
            onGoTo={goTo}
            onAccept={(rewrite) => review.accept(rewrite, edit)}
            onReject={review.reject}
          />
        )
      }
      // The page itself, with the AI's marks drawn on the lines they are
      // about. This is the student's own resume rendered as HTML rather than
      // the uploaded PDF, because a mark has to sit exactly on its line and a
      // DOM node can be measured exactly.
      preview={
        <PaperPane
          resume={content}
          rewrites={review.live}
          answered={review.answered}
          onAccept={(rewrite) => review.accept(rewrite, edit)}
          onReject={review.reject}
          original={
            doc?.s3Key ? (
              <PreviewPane submission={{ id: doc.id, fileName: doc.fileName, s3Key: doc.s3Key, uploadedAt: doc.updatedAt, score: doc.score }} />
            ) : undefined
          }
        />
      }
    >
      {loading || !content ? (
        <LoadingForm />
      ) : (
        <div
          key={section}
          className="transition-[opacity,translate] duration-200 ease-out motion-reduce:transition-none starting:translate-y-1 starting:opacity-0"
        >
          {section === "profile" ? (
            <ProfileForm basics={content.basics} onChange={(basics) => edit({ ...content, basics })} />
          ) : section === "skills" ? (
            <SkillsForm skills={content.skills} onChange={(skills) => edit({ ...content, skills })} />
          ) : (
            <SectionForm
              spec={LIST_SECTIONS[section as ListSection]}
              entries={(content[section as ListSection] ?? []) as Record<string, unknown>[]}
              onChange={(entries) => edit({ ...content, [section]: entries } as Resume)}
              // Only experience and projects have bullets the AI rewrites.
              rewritesFor={
                section === "experience" || section === "projects" ? (entryIndex) => review.forEntry(section, entryIndex) : undefined
              }
              suggestions={{
                onAccept: (rewrite) => review.accept(rewrite, edit),
                onReject: review.reject,
              }}
            />
          )}
        </div>
      )}
    </StudioShell>
  )
}

function LoadingForm() {
  return (
    <div aria-busy="true" className="flex flex-col gap-6">
      <div className="h-10 w-48 rounded-lg bg-fill" />
      <div className="flex flex-col gap-2.5">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-[52px] rounded-[18px] bg-fill/70" />
        ))}
      </div>
      <span className="sr-only">Loading this resume…</span>
    </div>
  )
}

function NotFound() {
  return (
    <div className="zip-scope desk desk-bright flex min-h-[calc(100vh-var(--chrome-top,82px))] items-center justify-center p-6">
      <div className="paper-frame w-full max-w-[520px]">
        <div className="paper flex flex-col items-center gap-4 px-6 py-12 text-center sm:px-12">
          <span className="label-mono inline-flex h-[28px] items-center rounded-full bg-fill px-3 text-ink-2">Not here</span>
          <h1 className="font-serif text-[36px] leading-tight tracking-[-0.025em] text-ink">Resume not found</h1>
          <p className="max-w-md text-[15px] leading-relaxed text-ink-2">It may have been deleted, or it belongs to another account.</p>
          <Link href="/resumes" className={`${pill("brand")} mt-1`}>
            Back to your resumes
          </Link>
        </div>
      </div>
    </div>
  )
}
