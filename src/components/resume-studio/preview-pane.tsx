"use client"

import { useEffect, useState } from "react"
import { FileWarning, Upload } from "lucide-react"
import { pill } from "./pills"

/** The file a preview shows: enough of a resume document to fetch and name it. */
export interface Submission {
  id: string
  fileName: string
  s3Key: string
  uploadedAt: string
  score: number
}

/**
 * The page itself, on a grey panel beside the form: the PDF of whichever
 * upload is being shown. Until it loads, a stand-in page with a line passing
 * down it, so the panel never flashes empty.
 *
 * The look is adapted from resumezip's PdfPreview (MIT, © 2025 Ian Hoang).
 * It renders a stored PDF rather than compiling one: Vistern's resumes are
 * files a student uploaded, not documents it typesets.
 */

/** The stand-in page, while the real one is fetched. */
function PrintingPage({ label }: { label: string }) {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="relative aspect-[8.5/11] w-full max-w-[520px] overflow-hidden rounded-[6px] bg-sheet shadow-[0_1px_2px_rgb(10_24_17/0.08),0_12px_30px_-16px_rgb(10_24_17/0.4)]">
        <div className="print-sweep absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-brand to-transparent" />
        <span className="label-mono absolute inset-x-0 bottom-6 text-center text-ink-3">{label}</span>
      </div>
    </div>
  )
}

export function PreviewPane({ submission }: { submission: Submission | null }) {
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const key = submission?.s3Key ?? null

  useEffect(() => {
    if (!key) {
      setUrl(null)
      setError(null)
      return
    }
    let live = true
    setUrl(null)
    setError(null)
    fetch(`/api/resume-preview?key=${encodeURIComponent(key)}`)
      .then((response) => response.json())
      .then((result) => {
        if (!live) return
        if (result.success) setUrl(result.url)
        else setError(result.error || "Couldn't load this file.")
      })
      .catch(() => live && setError("Couldn't load this file."))
    return () => {
      live = false
    }
  }, [key])

  if (!submission) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-sheet text-ink-3 shadow-card-rest">
          <Upload className="h-[18px] w-[18px]" aria-hidden="true" />
        </span>
        <p className="font-serif text-[22px] leading-tight tracking-[-0.02em] text-ink">No file to show</p>
        <p className="max-w-[28ch] text-[13px] leading-snug text-ink-2">
          Upload a PDF and it’ll sit here beside the form, so you can see what you’re editing against.
        </p>
        <a href="/upload" className={`${pill("white", "h-9 px-4 text-[14px] font-medium")} mt-1`}>
          Upload a resume
        </a>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <FileWarning className="h-8 w-8 text-ink-3" aria-hidden="true" />
        <p className="text-[14px] text-ink-2">{error}</p>
      </div>
    )
  }

  if (!url) return <PrintingPage label={submission.fileName} />

  return (
    <iframe
      // A new file gets a new frame rather than a reused one, so the old
      // page never lingers under the new one while it loads.
      key={url}
      src={url}
      title={`Preview of ${submission.fileName}`}
      className="h-full w-full rounded-[22px] border-0 bg-transparent @6xl/studio:rounded-[24px]"
    />
  )
}
