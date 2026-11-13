"use client"

import { ChevronDown, Download, FileCode2, FileText } from "lucide-react"
import { toast } from "sonner"
import type { Resume } from "@/app/api/parse/resumeSchema"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { PrintResume, printResume } from "@/components/resume-paper/print-resume"
import { resumeToLatex } from "@/lib/resume/latex"
import { pill } from "./pills"

/** "Backend — Fall 2026" → "backend-fall-2026", for the .tex file's name. */
const slug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "resume"

/**
 * Download the resume as it stands. Both are built in the browser from the
 * wording on the page, so nothing is reworded on the way out: the PDF through
 * the print dialog, the .tex written straight from the data.
 */
export function ExportMenu({ resume, fileName }: { resume: Resume | null; fileName: string }) {
  const downloadLatex = () => {
    if (!resume) return
    try {
      const blob = new Blob([resumeToLatex(resume)], { type: "application/x-latex" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `${slug(fileName)}.tex`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch {
      toast.error("Couldn't write the LaTeX file")
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" disabled={!resume} className={pill("white", "h-10 px-4 text-[15px] font-medium")}>
            <Download aria-hidden="true" />
            <span className="max-sm:sr-only">Download</span>
            <ChevronDown className="opacity-60" aria-hidden="true" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuItem
            // After the menu has closed, so the dialog doesn't freeze it open.
            onSelect={() => window.setTimeout(() => printResume(fileName), 0)}
            className="flex items-start gap-2"
          >
            <FileText className="mt-0.5 h-4 w-4" aria-hidden="true" />
            <span className="flex flex-col">
              <span className="text-sm">PDF</span>
              <span className="text-xs text-muted-foreground">Choose “Save as PDF” in the print dialog</span>
            </span>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={downloadLatex} className="flex items-start gap-2">
            <FileCode2 className="mt-0.5 h-4 w-4" aria-hidden="true" />
            <span className="flex flex-col">
              <span className="text-sm">LaTeX (.tex)</span>
              <span className="text-xs text-muted-foreground">Jake’s template, for Overleaf</span>
            </span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <PrintResume resume={resume} />
    </>
  )
}
