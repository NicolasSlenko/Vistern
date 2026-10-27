import { StudentShell } from "@/components/student/student-shell"

/** Onboarding's two panels with nothing in them yet, so the step drops into place rather than replacing a line of text. */
export default function Loading() {
  return (
    <StudentShell onboarding>
      <div className="student-onboarding" role="status" aria-busy="true">
        <div className="student-growth-panel" />
        <div className="student-onboarding-content flex flex-col gap-4">
          <span className="h-3 w-28 rounded-full bg-fill" />
          <span className="h-9 w-full max-w-[24rem] rounded-[10px] bg-fill" />
          <span className="h-4 w-full max-w-[30rem] rounded-full bg-fill" />
          <span className="mt-4 grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }, (_, index) => (
              <span key={index} className="h-[72px] rounded-[14px] bg-fill" />
            ))}
          </span>
        </div>
        <span className="sr-only">Loading your workspace…</span>
      </div>
    </StudentShell>
  )
}
