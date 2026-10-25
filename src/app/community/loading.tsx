import { StudentShell } from "@/components/student/student-shell"

/** The community page with nothing in it yet, so loading and loaded are the same shape. */
export default function Loading() {
  return (
    <StudentShell>
      <div className="zip-scope desk desk-bright min-h-[calc(100vh-var(--chrome-top,82px))] p-2 pb-10 sm:p-5 xl:p-6">
        <div className="paper-frame">
          <div className="paper flex min-h-[calc(100vh-var(--chrome-top,82px)-68px)] flex-col" role="status" aria-busy="true">
            <header className="flex min-h-[72px] flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-hairline px-4 py-[13px] sm:px-6">
              <span className="h-4 w-36 rounded-full bg-fill" />
              <span className="h-10 w-[150px] rounded-full bg-fill" />
            </header>

            <div className="flex-1 px-4 py-9 sm:px-8 sm:py-12">
              <div className="mx-auto flex max-w-[1080px] flex-col gap-9">
                <div className="flex flex-col gap-3">
                  <span className="h-3 w-24 rounded-full bg-fill" />
                  <span className="h-10 w-full max-w-[36rem] rounded-[10px] bg-fill" />
                  <span className="h-4 w-full max-w-[30rem] rounded-full bg-fill" />
                </div>
                <div className="flex flex-col gap-4">
                  <span className="h-3 w-40 rounded-full bg-fill" />
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {Array.from({ length: 6 }, (_, index) => (
                      <span key={index} className="h-[186px] rounded-[18px] bg-fill" />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <span className="sr-only">Loading your workspace…</span>
          </div>
        </div>
      </div>
    </StudentShell>
  )
}
