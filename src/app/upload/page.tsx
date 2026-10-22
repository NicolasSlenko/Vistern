import { ResumeUpload } from "@/components/resume-upload"

export default function UploadPage() {
  return (
    <div className="student-tool-page">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-6">Upload your resume</h1>
        <ResumeUpload />
      </div>
    </div>
  )
}
