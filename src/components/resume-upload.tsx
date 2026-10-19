"use client"

import { useCallback, useEffect, useState } from "react"
import { useDropzone, type FileRejection } from "react-dropzone"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Loader2 } from "lucide-react"
import type { Resume } from "@/app/api/parse/resumeSchema"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { ResumeVerification } from "@/components/resume-verification"
import { useResume } from "@/contexts/resume-context"
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

      setProcessingMessage("Preparing resume feedback...")
      try {
        const xyzResponse = await fetch("/api/analyze/xyz-batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resumeData: data }),
        })
        const xyzResult = await xyzResponse.json()
        if (!xyzResult.success) {
          console.warn("XYZ batch analysis completed with warnings")
        }
      } catch (xyzError) {
        console.error("Error in XYZ batch analysis:", xyzError)
        // Feedback can be retried independently of saving the resume.
      }

      await refreshResumeData()

      if (onComplete) await onComplete()
      else router.push("/dashboard")
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
    <div className="space-y-6">
      {isProcessing && (
        <div className="fixed inset-0 z-[100] bg-background/95 flex items-center justify-center p-6">
          <div role="status" className="flex items-center gap-3 text-lg">
            <Loader2
              className="h-5 w-5 animate-spin motion-reduce:animate-none"
              aria-hidden="true"
            />
            <p>{processingMessage}</p>
          </div>
        </div>
      )}

      <SignedOut>
        <div className="rounded-md border p-8 text-center space-y-4">
          <h2 className="text-xl font-semibold">Sign in to upload a resume</h2>
          <p className="text-muted-foreground">
            Your resume and feedback will be saved to your account.
          </p>
          <SignInButton mode="modal">
            <Button>Sign in</Button>
          </SignInButton>
        </div>
      </SignedOut>

      <SignedIn>
        <Card>
          <CardHeader>
            <CardTitle>{uploadedFile ? "Review your upload" : "Upload a resume"}</CardTitle>
            <CardDescription>
              {uploadedFile
                ? "Review the extracted details before adding them to your profile."
                : "Supported formats: PDF, DOCX, and TXT, up to 10 MB."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {uploadedFile ? (
              <div className="space-y-5">
                <div>
                  <p className="font-medium break-all">{uploadedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatFileSize(uploadedFile.size)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button onClick={parseResume} disabled={isParsing || isProcessing}>
                    {isParsing ? "Reading resume..." : "Review resume"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={removeFile}
                    disabled={isParsing || isProcessing}
                  >
                    Choose another file
                  </Button>
                </div>
              </div>
            ) : (
              <div
                {...getRootProps({ role: "button", "aria-label": "Choose a resume file" })}
                className={cn(
                  "rounded-md border border-dashed p-8 text-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  isDragActive ? "border-primary" : "border-border hover:border-primary",
                  isUploading && "pointer-events-none opacity-60",
                )}
              >
                <input {...getInputProps()} />
                <p>
                  {isUploading
                    ? "Uploading..."
                    : isDragActive
                      ? "Drop your resume here"
                      : "Choose a file or drag it here"}
                </p>
              </div>
            )}
            {uploadStatus === "error" && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" aria-hidden="true" />
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
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
