"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import type { Resume } from "@/app/api/parse/resumeSchema"
import { ResumePaper } from "./resume-paper"

/**
 * The resume as it goes to the printer: the same page the studio shows, with
 * no marks, no zoom and no fake sheet breaks — the browser paginates, and
 * styles/zip-print.css keeps entries whole. Kept in the DOM, hidden on screen,
 * so printing never waits on a render. "Save as PDF" in the print dialog gives
 * a PDF with real text, which an ATS can read.
 */
export function PrintResume({ resume }: { resume: Resume | null }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted || !resume) return null
  return createPortal(
    <div className="print-root">
      <ResumePaper resume={resume} />
    </div>,
    document.body,
  )
}

/**
 * Opens the print dialog. Browsers name the PDF after the page title, so the
 * title is the resume's name for as long as the dialog is open.
 */
export function printResume(fileName: string) {
  const title = document.title
  document.title = fileName
  const restore = () => {
    document.title = title
    window.removeEventListener("afterprint", restore)
  }
  window.addEventListener("afterprint", restore)
  window.print()
}
