import { ResumeUpload } from "@/components/resume-upload"

export default function UploadPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-6 text-3xl font-semibold">Upload your resume</h1>
      <ResumeUpload />
    </main>
  )
}
