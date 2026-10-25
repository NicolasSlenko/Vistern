"use client"

import { useState } from "react"
import { SignUp } from "@clerk/nextjs"
import { AuthPage, clerkAppearance } from "@/components/auth/auth-page"
import { pill } from "@/components/resume-studio/pills"

export default function SignUpPage() {
  // Said plainly before an account exists, not buried in terms afterwards.
  const [acceptedAiUse, setAcceptedAiUse] = useState(false)

  if (!acceptedAiUse) {
    return (
      <AuthPage title="Vistern">
        <div className="flex w-full flex-col gap-5 px-2 py-4 sm:px-4">
          <div className="flex flex-col gap-2">
            <h1 className="font-serif text-[32px] leading-[1.05] tracking-[-0.03em] text-ink">
              Before we <em className="text-brand">begin</em>
            </h1>
            <p className="text-[15px] leading-relaxed text-ink-2">Here is exactly what happens to the resume you upload.</p>
          </div>

          <div className="flex flex-col gap-3 rounded-[18px] border border-hairline bg-fill p-5">
            <h2 className="label-mono text-ink-2">How we use AI</h2>
            <p className="text-[14px] leading-relaxed text-ink-2">
              A language model reads your resume to pull out your experience, score each bullet, match your skills against roles, and write
              the suggestions you see in the app. That is all it is used for.
            </p>
            <p className="text-[14px] leading-relaxed text-ink">
              Your resume is <strong className="font-medium">not</strong> used to train any model, ours or anyone else’s.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <button type="button" onClick={() => setAcceptedAiUse(true)} className={`${pill("brand", "h-11 px-5 text-[15px] font-medium")} w-full`}>
              I understand — create my account
            </button>
            <p className="text-center text-[12px] text-ink-3">
              Accepting agrees to our{" "}
              <a href="/privacy" target="_blank" rel="noreferrer" className="font-medium text-brand underline-offset-4 hover:underline">
                privacy policy
              </a>
              .
            </p>
          </div>
        </div>
      </AuthPage>
    )
  }

  return (
    <AuthPage title="Vistern">
      <SignUp appearance={clerkAppearance} path="/sign-up" routing="path" signInUrl="/sign-in" />
    </AuthPage>
  )
}
