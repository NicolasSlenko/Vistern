import Link from "next/link"
import { ResumeUpload } from "@/components/resume-upload"
import { pill } from "@/components/resume-studio/pills"

export default function UploadPage() {
  return (
    <div className="zip-scope desk desk-bright min-h-[calc(100vh-82px)] p-2 pb-10 sm:p-5 xl:p-6">
      <div className="paper-frame">
        <div className="paper flex min-h-[calc(100vh-150px)] flex-col">
          <header className="flex min-h-[72px] flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-hairline px-4 py-[13px] sm:px-6">
            <h1 className="text-[17px] font-medium tracking-[-0.02em] text-ink sm:text-[18px]">Upload a resume</h1>
            <div className="flex items-center gap-2.5">
              <Link href="/resumes" className={pill("white", "h-10 px-4 text-[15px] font-medium")}>
                Your resumes
              </Link>
            </div>
          </header>

          <div className="flex-1 px-4 py-9 sm:px-8 sm:py-12">
            <div className="mx-auto flex max-w-[1000px] flex-col gap-9">
              <div className="flex flex-col gap-2">
                <p className="max-w-[58ch] font-serif text-[34px] leading-[1.06] tracking-[-0.03em] text-ink sm:text-[40px]">
                  Start from the resume <em className="text-brand">you already have</em>
                </p>
                <p className="max-w-[60ch] text-[15px] leading-relaxed text-ink-2">
                  We’ll read the file, show you what we found, and let you correct it before anything reaches your profile.
                </p>
              </div>

              <ResumeUpload />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
