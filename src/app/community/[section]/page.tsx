import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowRight, CalendarDays, MessageCircle, UsersRound } from "lucide-react"
import { StudentShell } from "@/components/student/student-shell"
import { pill } from "@/components/resume-studio/pills"

const sections = {
  feed: {
    title: "Community feed",
    intro: "A place for useful opportunities, project updates, and questions from students.",
    icon: MessageCircle,
    emptyTitle: "Community posts are on the way",
    emptyCopy: "When posting is ready, you’ll be able to share a resource or ask a question here. For now, start with the campus directory and the people around you.",
    links: [
      { href: "/community", label: "Browse campus groups" },
      { href: "/career?view=guides", label: "Read career guides" },
    ],
  },
  people: {
    title: "People",
    intro: "Find peers, mentors, and teaching assistants who know the work you want to try.",
    icon: UsersRound,
    emptyTitle: "The people directory is taking shape",
    emptyCopy: "Profiles and introductions will appear here when students can choose to share them. Explore campus groups in the meantime.",
    links: [
      { href: "/community", label: "Find a campus group" },
      { href: "/onboarding?edit=1", label: "Review my background" },
    ],
  },
  sessions: {
    title: "Sessions",
    intro: "Make room for workshops, study groups, and career events in your plan.",
    icon: CalendarDays,
    emptyTitle: "No sessions listed yet",
    emptyCopy: "Check a group’s own site for its current schedule. You can add an event or preparation activity to your plan now.",
    links: [
      { href: "/community", label: "Explore campus groups" },
      { href: "/career?new=preparation", label: "Plan an activity" },
    ],
  },
  messages: {
    title: "Messages",
    intro: "Keep conversations with people in your community in one place.",
    icon: MessageCircle,
    emptyTitle: "Messaging isn’t available yet",
    emptyCopy: "The prototype shows how conversations could fit here. You can still use a group’s official contact links from the campus directory.",
    links: [
      { href: "/community", label: "Browse campus groups" },
      { href: "/community/people", label: "Explore people" },
    ],
  },
} as const

export default async function CommunitySectionPage({
  params,
}: {
  params: Promise<{ section: string }>
}) {
  const { section } = await params
  if (!(section in sections)) notFound()
  const data = sections[section as keyof typeof sections]
  const Icon = data.icon

  return (
    <StudentShell>
      <div className="zip-scope desk desk-bright min-h-[calc(100vh-var(--chrome-top,82px))] p-2 pb-10 sm:p-5 xl:p-6">
        <div className="paper-frame">
          <div className="paper flex min-h-[calc(100vh-var(--chrome-top,82px)-68px)] flex-col">
            <header className="flex min-h-[72px] flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-hairline px-4 py-[13px] sm:px-6">
              <h1 className="text-[17px] font-medium tracking-[-0.02em] text-ink sm:text-[18px]">{data.title}</h1>
            </header>

            <div className="flex-1 px-4 py-9 sm:px-8 sm:py-12">
              <div className="mx-auto flex max-w-[1080px] flex-col gap-9">
                <div className="flex flex-col gap-2">
                  <p className="label-mono text-ink-2">Community</p>
                  <p className="max-w-[58ch] font-serif text-[34px] leading-[1.06] tracking-[-0.03em] text-ink sm:text-[40px]">
                    {data.intro}
                  </p>
                </div>

                <section className="flex flex-col items-start gap-4 rounded-[18px] border border-dashed border-rule-strong px-6 py-12">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-fill text-brand">
                    <Icon className="h-[18px] w-[18px]" strokeWidth={1.7} aria-hidden="true" />
                  </span>
                  <h2 className="font-serif text-[26px] leading-tight tracking-[-0.025em] text-ink">{data.emptyTitle}</h2>
                  <p className="max-w-[54ch] text-[15px] leading-relaxed text-ink-2">{data.emptyCopy}</p>
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    {data.links.map((link, index) => (
                      <Link key={link.href} href={link.href} className={pill(index === 0 ? "brand" : "white")}>
                        {link.label}
                        <ArrowRight aria-hidden="true" />
                      </Link>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      </div>
    </StudentShell>
  )
}
