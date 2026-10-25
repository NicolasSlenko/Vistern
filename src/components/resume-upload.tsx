"use client"

import { useCallback, useEffect, useState } from "react"
import { useDropzone, type FileRejection } from "react-dropzone"
import { AlertCircle, FileText, Loader2, UploadCloud } from "lucide-react"
import type { Resume } from "@/app/api/parse/resumeSchema"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { ResumeVerification } from "@/components/resume-verification"
import { useResume } from "@/contexts/resume-context"
import { pill } from "@/components/resume-studio/pills"
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs"

interface UploadedFile {
  name: string
  size: number
  type: string
  uploadedAt: string
  filename: string
}

interface ParseResult {
  details: Resume | null
  missing: string[]
}

interface ResumeUploadProps {
  onComplete?: () => Promise<void>
  onBusyChange?: (busy: boolean) => void
}

/**
 * Where to send someone once their resume is in: the resume itself, so the
 * first thing they see is their own page with the AI's rewrites beside it.
 * If the document can't be found — an older upload, or a hiccup — the shelf
 * is a safe landing.
 */
async function newestResumePath(): Promise<string> {
  try {
    const response = await fetch("/api/resume-documents")
    const result = await response.json()
    const newest = result?.data?.[0]
    return newest?.id ? `/resumes/${newest.id}` : "/resumes"
  } catch {
    return "/resumes"
  }
}

export function ResumeUpload({ onComplete, onBusyChange }: ResumeUploadProps = {}) {
  const { setResumeData, setCurrentFileName, refreshResumeData } = useResume()
  const router = useRouter()
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<"idle" | "success" | "error">("idle")
  const [errorMessage, setErrorMessage] = useState("")
  const [parseResult, setParseResult] = useState<ParseResult | null>(null)
  const [isParsing, setIsParsing] = useState(false)
  const [showVerification, setShowVerification] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingMessage, setProcessingMessage] = useState("Processing...")
  useEffect(() => {
    onBusyChange?.(isUploading || isParsing || isProcessing)
  }, [isUploading, isParsing, isProcessing, onBusyChange])

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return
    setIsUploading(true)
    setUploadStatus("idle")
    setErrorMessage("")
    setUploadedFile(null)
    setParseResult(null)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
        cache: "no-store",
        credentials: "include",
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
        console.error("Upload failed:", errorData)

        // Handle daily upload limit specifically
        if (response.status === 429) {
          setUploadStatus("error")
          setErrorMessage(errorData.error)
          toast.warning(errorData.error)
          return
        }

        throw new Error(errorData.error || `Upload failed with status ${response.status}`)
      }

      const result = await response.json()

      setUploadedFile({
        name: file.name,
        size: file.size,
        type: file.type,
        uploadedAt: new Date().toISOString(),
        filename: result.filename,
      })

      setUploadStatus("success")
      toast.success("File uploaded successfully!")
    } catch (error) {
      console.error("Upload error details:", error)
      setUploadStatus("error")

      let errorMsg = "Failed to upload file. Please try again."
      if (error instanceof Error) {
        errorMsg = error.message
      }

      setErrorMessage(errorMsg)
      toast.error(errorMsg)
    } finally {
      setIsUploading(false)
    }
  }, [])

  const onDropRejected = useCallback((rejections: FileRejection[]) => {
    const code = rejections[0]?.errors[0]?.code
    const message =
      code === "file-too-large"
        ? "Choose a file smaller than 10 MB."
        : code === "too-many-files"
          ? "Choose one resume at a time."
          : "Choose a PDF, DOCX, or TXT file. Save older Word documents as DOCX or PDF first."
    setUploadStatus("error")
    setErrorMessage(message)
    toast.error(message)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "text/plain": [".txt"],
    },
    maxFiles: 1,
    multiple: false,
    disabled: isUploading || isParsing || isProcessing,
    maxSize: 10 * 1024 * 1024,
  })

  const parseResume = async () => {
    if (!uploadedFile) return

    setIsParsing(true)
    setErrorMessage("")

    try {
      const response = await fetch("/api/parse", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          filename: uploadedFile.filename,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        console.error("API Error:", result)
        throw new Error(result.message || result.error || "Failed to parse")
      }

      if (!result.details) {
        throw new Error("We couldn’t read the resume. Try another file or continue without one.")
      }

      setParseResult(result)

      // Show verification form after successful parse
      if (result.details) {
        setShowVerification(true)
        toast.success("Resume ready to review.")
      }
    } catch (error) {
      console.error("Error parsing:", error)
      setParseResult({ details: null, missing: ["Failed to parse"] })
      const errorMsg = error instanceof Error ? error.message : "Failed to parse resume"
      setErrorMessage(errorMsg)
      setUploadStatus("error")
      toast.error(errorMsg)
    } finally {
      setIsParsing(false)
    }
  }

  const removeFile = () => {
    setUploadedFile(null)
    setParseResult(null)
    setShowVerification(false)
    setUploadStatus("idle")
    setErrorMessage("")
  }

  const handleVerificationConfirm = async (data: Resume) => {
    setShowVerification(false)
    setIsProcessing(true)
    setProcessingMessage("Saving resume data...")

    try {
      const saveResponse = await fetch("/api/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume: data, s3Key: uploadedFile?.filename }),
      })
      const saveResult = await saveResponse.json()

      if (!saveResponse.ok || !saveResult.success) {
        throw new Error("Failed to save resume data")
      }
      setResumeData(data)
      if (uploadedFile?.name) setCurrentFileName(uploadedFile.name)

      // Course matching is available only for UF students.
      const schoolName = data.education?.[0]?.school?.toLowerCase() || ""
      const isUF = schoolName.includes("university of florida") || schoolName === "uf"
      if (isUF) {
        setProcessingMessage("Matching your coursework...")
        try {
          const matchResponse = await fetch("/api/match-coursework?threshold=80")
          const matchData = await matchResponse.json()
          if (!matchData.success) {
            console.warn("Course matching completed with warnings")
          }
        } catch (matchError) {
          console.error("Error matching coursework:", matchError)
        }
      }

      setProcessingMessage("Reading it like a recruiter…")
      // The two readings are independent and neither blocks the upload: XYZ
      // scores whole entries for the profile, the bullet pass writes a
      // replacement for each weak line of this resume. Both are cached, so
      // the page they land on has them already.
      await Promise.allSettled([
        fetch("/api/analyze/xyz-batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resumeData: data }),
        }),
        fetch("/api/analyze/bullets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resumeData: data }),
        }),
      ])

      await refreshResumeData()

      if (onComplete) await onComplete()
      else router.push(await newestResumePath())
      toast.success("Resume saved.")
    } catch (error) {
      console.error("Error processing resume:", error)
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to process resume completely. Please try again.",
      )
    } finally {
      setIsProcessing(false)
    }
  }

  const handleVerificationCancel = () => {
    setShowVerification(false)
    toast.info("Verification cancelled")
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  return (
    <div className="flex flex-col gap-6">
      {isProcessing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-paper/85 p-6 backdrop-blur-[3px]">
          <div
            role="status"
            className="glass glass-float flex items-center gap-3 rounded-full px-6 py-3.5 text-[15px] font-medium tracking-[-0.01em] text-ink"
          >
            <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            <p>{processingMessage}</p>
          </div>
        </div>
      )}

      <SignedOut>
        <div className="flex flex-col items-start gap-3 rounded-[18px] border border-hairline bg-sheet p-6 shadow-card-rest">
          <h2 className="font-serif text-[26px] leading-tight tracking-[-0.025em] text-ink">Sign in to upload a resume</h2>
          <p className="max-w-[52ch] text-[15px] leading-relaxed text-ink-2">
            Your resume and the feedback on it are kept with your account.
          </p>
          <SignInButton mode="modal">
            <button type="button" className={`${pill("brand")} mt-1`}>
              Sign in
            </button>
          </SignInButton>
        </div>
      </SignedOut>

      <SignedIn>
        {uploadedFile ? (
          <div className="flex flex-col gap-5 rounded-[18px] border border-hairline bg-sheet p-6 shadow-card-rest">
            <div className="flex items-start gap-3.5">
              <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-fill text-brand">
                <FileText className="h-[18px] w-[18px]" aria-hidden="true" />
              </span>
              <div className="flex min-w-0 flex-col gap-0.5">
                <p className="text-[15px] font-medium tracking-[-0.01em] wrap-anywhere text-ink">{uploadedFile.name}</p>
                <p className="text-[13px] text-ink-3">{formatFileSize(uploadedFile.size)}</p>
              </div>
            </div>
            <p className="max-w-[60ch] text-[15px] leading-relaxed text-ink-2">
              Read it in and we’ll show you what we found, so you can correct it before it reaches your profile.
            </p>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={parseResume} disabled={isParsing || isProcessing} className={pill("brand")}>
                {isParsing && <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden="true" />}
                {isParsing ? "Reading resume…" : "Review resume"}
              </button>
              <button type="button" onClick={removeFile} disabled={isParsing || isProcessing} className={pill("white")}>
                Choose another file
              </button>
            </div>
          </div>
        ) : (
          <div
            {...getRootProps({ role: "button", "aria-label": "Choose a resume file" })}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-[18px] border border-dashed border-rule-strong px-6 py-16 text-center transition-colors duration-150 focus-visible:outline-none",
              isDragActive ? "border-brand bg-fill" : "hover:bg-fill",
              isUploading && "pointer-events-none opacity-60",
            )}
          >
            <input {...getInputProps()} />
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-fill text-brand">
              {isUploading ? (
                <Loader2 className="h-[18px] w-[18px] animate-spin motion-reduce:animate-none" aria-hidden="true" />
              ) : (
                <UploadCloud className="h-[18px] w-[18px]" aria-hidden="true" />
              )}
            </span>
            <p className="font-serif text-[26px] leading-tight tracking-[-0.025em] text-ink">
              {isUploading ? "Uploading…" : isDragActive ? "Drop your resume here" : "Choose a file or drag it here"}
            </p>
            <p className="text-[14px] leading-relaxed text-ink-3">PDF, DOCX or TXT, up to 10 MB.</p>
          </div>
        )}
        {uploadStatus === "error" && (
          <p role="alert" className="flex items-start gap-2 text-[14px] leading-relaxed text-alert">
            <AlertCircle className="mt-[3px] h-4 w-4 shrink-0" aria-hidden="true" />
            {errorMessage}
          </p>
        )}
        {showVerification && parseResult?.details && (
          <ResumeVerification
            parsedData={parseResult.details}
            onConfirm={handleVerificationConfirm}
            onCancel={handleVerificationCancel}
            open={showVerification}
          />
        )}
      </SignedIn>
    </div>
  )
}
