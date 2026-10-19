"use client"

import Link from "next/link"
import { StudentShell } from "./student-shell"

export function StudentLoadError({ reset }: { reset: () => void }) {
  return (
    <StudentShell onboarding>
      <section className="student-load-error" role="alert">
        <h1>We couldn’t load your workspace.</h1>
        <p>Please try again or open resume insights below.</p>
        <button type="button" className="student-button" onClick={reset}>
          Try again
        </button>
        <Link className="student-text-link" href="/dashboard">
          Open resume insights
        </Link>
      </section>
    </StudentShell>
  )
}
