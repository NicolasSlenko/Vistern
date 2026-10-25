"use client"

import Link from "next/link"
import { StudentShell } from "@/components/student/student-shell"
import { pill } from "@/components/resume-studio/pills"

export default function CommunityError({ reset }: { reset: () => void }) {
  return (
    <StudentShell onboarding>
      <div className="zip-scope desk desk-bright min-h-[calc(100vh-var(--chrome-top,82px))] p-2 pb-10 sm:p-5 xl:p-6">
        <div className="paper-frame">
          <div className="paper flex min-h-[calc(100vh-var(--chrome-top,82px)-68px)] flex-col">
            <div className="flex flex-1 items-center px-4 py-9 sm:px-8 sm:py-12">
              <div role="alert" className="mx-auto flex w-full max-w-[1080px] flex-col items-start gap-4">
                <p className="label-mono text-alert">Community</p>
                <h1 className="max-w-[20ch] font-serif text-[34px] leading-[1.06] tracking-[-0.03em] text-ink sm:text-[40px]">
                  We couldn’t load your workspace.
                </h1>
                <p className="max-w-[56ch] text-[15px] leading-relaxed text-ink-2">
                  Please try again or open resume insights below.
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button type="button" className={pill("brand")} onClick={reset}>
                    Try again
                  </button>
                  <Link href="/dashboard" className={pill("white")}>
                    Open resume insights
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </StudentShell>
  )
}
