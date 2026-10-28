import { StudentShell } from "@/components/student/student-shell"

/** The home page with nothing in it yet, so loading and loaded are the same shape. */
export default function Loading() {
  return (
    <StudentShell>
      <div className="zip-scope desk desk-bright min-h-[calc(100vh-var(--chrome-top,82px))] p-2 pb-10 sm:p-5 xl:p-6">
        <div className="paper-frame">
          <div className="paper flex min-h-[calc(100vh-var(--chrome-top,82px)-68px)] flex-col" role="status" aria-busy="true">
            <div className="flex-1 px-4 py-9 sm:px-8 sm:py-12">
              <div className="mx-auto flex max-w-[1080px] flex-col gap-9">
                <div className="flex flex-col gap-4">
                  <span className="h-3 w-32 rounded-full bg-fill" />
                  <span className="h-[40px] w-full max-w-[30rem] rounded-[10px] bg-fill sm:h-[52px]" />
                  <span className="h-4 w-full max-w-[36rem] rounded-full bg-fill" />
                  <span className="flex gap-3 pt-1">
                    <span className="h-11 w-[170px] rounded-full bg-fill" />
                    <span className="h-11 w-[104px] rounded-full bg-fill" />
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                  {Array.from({ length: 3 }, (_, index) => (
                    <span key={index} className="h-[200px] rounded-[18px] bg-fill" />
                  ))}
                </div>
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                  {Array.from({ length: 2 }, (_, index) => (
                    <span key={index} className="h-[150px] rounded-[18px] bg-fill" />
                  ))}
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
