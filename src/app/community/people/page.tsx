import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { StudentShell } from "@/components/student/student-shell"
import { PeopleDirectory, type DirectoryPerson } from "@/components/community/people-directory"
import { SharingPanel } from "@/components/community/sharing-panel"
import { listDirectory, refreshMyCard } from "@/lib/community/people-store"

export const dynamic = "force-dynamic"

export default async function PeoplePage() {
  const { userId } = await auth()
  if (!userId) redirect("/sign-in")

  let people: DirectoryPerson[] = []
  let failed = false
  try {
    // Onboarding answers can change outside the profile, so the reader's own
    // card catches up here (it writes only when something differs).
    await refreshMyCard(userId)
    people = (await listDirectory(userId)).map(({ id, card, mine }) => ({ id, card, mine }))
  } catch (error) {
    console.error("Error loading the People directory:", error)
    failed = true
  }

  return (
    <StudentShell>
      <div className="zip-scope desk desk-bright min-h-[calc(100vh-var(--chrome-top,82px))] p-2 pb-10 sm:p-5 xl:p-6">
        <div className="paper-frame">
          <div className="paper flex min-h-[calc(100vh-var(--chrome-top,82px)-68px)] flex-col">
            <header className="flex min-h-[72px] flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-hairline px-4 py-[13px] sm:px-6">
              <h1 className="text-[17px] font-medium tracking-[-0.02em] text-ink sm:text-[18px]">People</h1>
            </header>

            <div className="flex-1 px-4 py-9 sm:px-8 sm:py-12">
              <div className="mx-auto flex max-w-[1080px] flex-col gap-9">
                <div className="flex flex-col gap-2">
                  <p className="label-caps text-ink-2">Community</p>
                  <p className="max-w-[58ch] font-serif text-[34px] leading-[1.06] tracking-[-0.03em] text-ink sm:text-[40px]">
                    Find students who know the work <em className="text-brand">you want to try</em>
                  </p>
                  <p className="max-w-[60ch] text-[15px] leading-relaxed text-ink-2">
                    Everyone here chose to be listed, and chose what to show. Your card stays hidden until you turn it on.
                  </p>
                </div>

                <SharingPanel />

                {failed ? (
                  <p className="rounded-[18px] border border-dashed border-rule-strong px-6 py-8 text-[14px] text-ink-2">
                    The directory couldn’t load right now. Try again in a moment.
                  </p>
                ) : (
                  <PeopleDirectory people={people} />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </StudentShell>
  )
}
