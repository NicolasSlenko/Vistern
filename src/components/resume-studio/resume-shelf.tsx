"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { FileText, Loader2, Star, Trash2, Upload, UserRound } from "lucide-react"
import { toast } from "sonner"
import { pill } from "./pills"

/**
 * The shelf: every resume the student keeps, as a row of pages.
 *
 * Resumes are plural on purpose â€” one for backend roles, one for research,
 * one for the career fair â€” while the master profile behind them stays one
 * record. This page is the way between the two.
 */

interface ResumeRow {
  id: string
  fileName: string
  score: number
  isStarred: boolean
  isCurrent: boolean
  targetRole: string | null
  updatedAt: string
  createdAt: string
  sourceType: string
}

const when = (date: string) =>
  new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })

/** The page, drawn small: a sheet with ruled lines, tinted by how it scored. */
function PageThumb({ score }: { score: number }) {
  const lines = [92, 70, 84, 58, 88, 64, 76]
  return (
    <div
      aria-hidden="true"
      className="relative aspect-[8.5/11] w-full overflow-hidden rounded-[8px] bg-sheet shadow-[0_1px_2px_rgb(10_24_17/0.07),0_8px_20px_-12px_rgb(10_24_17/0.4)] ring-1 ring-hairline"
    >
      <div className="flex h-full flex-col gap-[6px] p-[14%]">
        <span className="h-[7%] w-1/2 rounded-full bg-ink/70" />
        <span className="mb-[6%] h-[4%] w-2/3 rounded-full bg-ink-3/40" />
        {lines.map((width, index) => (
          <span key={index} style={{ width: `${width}%` }} className="h-[4%] rounded-full bg-ink-3/25" />
        ))}
      </div>
      <span
        style={{ width: `${Math.max(4, Math.min(100, score))}%` }}
        className="absolute inset-x-0 bottom-0 h-[3px] bg-brand"
      />
    </div>
  )
}

export function ResumeShelf() {
  const [resumes, setResumes] = useState<ResumeRow[]>([])
  const [loading, setLoading] = useState(true)
  // The resume waiting on a yes. Deleting is easy to do by accident on a
  // grid of similar-looking pages, so it asks first and names the one it means.
  const [deleting, setDeleting] = useState<ResumeRow | null>(null)
  const [busy, setBusy] = useState(false)

  const remove = async () => {
    if (!deleting) return
    setBusy(true)
    try {
      const response = await fetch(`/api/resume-documents/${deleting.id}`, { method: "DELETE" })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error || "Couldn't delete that resume")
      setResumes((current) => current.filter((row) => row.id !== deleting.id))
      toast.success(`Deleted ${deleting.fileName}`)
      setDeleting(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't delete that resume")
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    let live = true
    fetch("/api/resume-documents")
      .then((response) => response.json())
      .then((result) => live && result.success && setResumes(result.data))
      .catch(() => {})
      .finally(() => live && setLoading(false))
    return () => {
      live = false
    }
  }, [])

  return (
    <div className="zip-scope desk desk-bright min-h-[calc(100vh-var(--chrome-top,82px))] p-2 pb-10 sm:p-5 xl:p-6">
      <div className="paper-frame">
        <div className="paper flex min-h-[calc(100vh-var(--chrome-top,82px)-68px)] flex-col">
          <header className="flex min-h-[72px] flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-hairline px-4 py-[13px] sm:px-6">
            <h1 className="text-[17px] font-medium tracking-[-0.02em] text-ink sm:text-[18px]">Your resumes</h1>
            <div className="flex items-center gap-2.5">
              <Link href="/profile" className={pill("white", "h-10 px-4 text-[15px] font-medium")}>
                <UserRound aria-hidden="true" />
                <span className="max-sm:sr-only">Master profile</span>
              </Link>
              <Link href="/upload" className={pill("brand", "h-10 px-5 text-[15px] font-medium")}>
                <Upload aria-hidden="true" />
                <span className="max-sm:sr-only">Upload</span>
              </Link>
            </div>
          </header>

          <div className="flex-1 px-4 py-8 sm:px-8">
            <div className="mx-auto flex max-w-[1000px] flex-col gap-7">
              <div className="flex flex-col gap-2">
                <p className="max-w-[58ch] font-serif text-[34px] leading-[1.06] tracking-[-0.03em] text-ink sm:text-[40px]">
                  One profile, <em className="text-brand">many resumes</em>
                </p>
                <p className="max-w-[60ch] text-[15px] leading-relaxed text-ink-2">
                  Keep a separate resume for each kind of role you’re going after. They’re edited on their own, so a rewrite here never
                  touches your{" "}
                  <Link href="/profile" className="font-medium text-brand underline-offset-4 hover:underline">
                    master profile
                  </Link>
                  .
                </p>
              </div>

              {loading ? (
                <div aria-busy="true" className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
                  {Array.from({ length: 4 }, (_, index) => (
                    <div key={index} className="aspect-[8.5/11] rounded-[8px] bg-fill" />
                  ))}
                  <span className="sr-only">Loading your resumesâ€¦</span>
                </div>
              ) : resumes.length === 0 ? (
                <div className="flex flex-col items-start gap-4 rounded-[18px] border border-dashed border-rule-strong px-6 py-12">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-fill text-brand">
                    <FileText className="h-[18px] w-[18px]" aria-hidden="true" />
                  </span>
                  <p className="font-serif text-[26px] leading-tight tracking-[-0.025em] text-ink">Nothing on the shelf yet</p>
                  <p className="max-w-[48ch] text-[15px] leading-relaxed text-ink-2">
                    Upload a PDF and we’ll read it in. You’ll get the file to look at, its wording to edit, and the AI’s rewrite for every
                    weak bullet.
                  </p>
                  <Link href="/upload" className={`${pill("brand")} mt-1`}>
                    <Upload aria-hidden="true" />
                    Upload a resume
                  </Link>
                </div>
              ) : (
                <ul className="grid grid-cols-2 gap-x-5 gap-y-7 sm:grid-cols-3 lg:grid-cols-4">
                  {resumes.map((resume) => (
                    <li key={resume.id} className="group/card relative">
                      <button
                        type="button"
                        onClick={() => setDeleting(resume)}
                        aria-label={`Delete ${resume.fileName}`}
                        title="Delete"
                        className="absolute right-1.5 top-1.5 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full bg-sheet/90 text-ink-3 opacity-0 shadow-card-rest backdrop-blur transition-[opacity,color] hover:text-alert focus-visible:opacity-100 group-hover/card:opacity-100"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <Link
                        href={`/resumes/${resume.id}`}
                        className="group/page flex flex-col gap-2.5 rounded-[12px] focus-visible:outline-none"
                      >
                        <span className="block transition-[translate,filter] duration-300 ease-glide group-hover/page:-translate-y-1 group-hover/page:brightness-[1.02] motion-reduce:transition-none">
                          <PageThumb score={resume.score} />
                        </span>
                        <span className="flex flex-col gap-0.5">
                          <span className="flex min-w-0 items-center gap-1.5">
                            {resume.isStarred && <Star className="h-3.5 w-3.5 shrink-0 text-brand" fill="currentColor" aria-hidden="true" />}
                            <span className="min-w-0 truncate text-[15px] font-medium tracking-[-0.01em] text-ink">{resume.fileName}</span>
                          </span>
                          <span className="text-[12px] text-ink-3">
                            {resume.targetRole ? `${resume.targetRole} Â· ` : ""}
                            {when(resume.updatedAt)} Â· scored {resume.score}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      {deleting && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-resume-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/25 p-4 backdrop-blur-sm"
          onMouseDown={(event) => event.target === event.currentTarget && !busy && setDeleting(null)}
          onKeyDown={(event) => event.key === "Escape" && !busy && setDeleting(null)}
        >
          <div className="paper-frame w-full max-w-[440px]">
            <div className="paper flex flex-col gap-3 p-6">
              <h2 id="delete-resume-title" className="font-serif text-[26px] leading-tight tracking-[-0.025em] text-ink">
                Delete this resume?
              </h2>
              <p className="text-[15px] leading-relaxed text-ink-2">
                <span className="font-medium text-ink">{deleting.fileName}</span> will be removed from your shelf. Your master profile
                keeps everything you have brought across from it.
              </p>
              <div className="mt-2 flex items-center gap-2.5">
                <button type="button" onClick={remove} disabled={busy} className={pill("danger", "h-10 px-4 text-[15px] font-medium")}>
                  {busy && <Loader2 className="animate-spin" aria-hidden="true" />}
                  Delete
                </button>
                <button
                  type="button"
                  onClick={() => setDeleting(null)}
                  disabled={busy}
                  className={pill("white", "h-10 px-4 text-[15px] font-medium")}
                >
                  Keep it
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
