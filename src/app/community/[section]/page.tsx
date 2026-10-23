import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowRight, CalendarDays, MessageCircle, UsersRound } from "lucide-react"
import { StudentShell } from "@/components/student/student-shell"

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
      <div className="career-page scaffold-page">
        <header className="career-page-heading">
          <div>
            <span className="scaffold-eyebrow">Community</span>
            <h1>{data.title}</h1>
            <p>{data.intro}</p>
          </div>
        </header>
        <section className="scaffold-empty">
          <span className="scaffold-empty-icon"><Icon size={24} strokeWidth={1.7} /></span>
          <div>
            <h2>{data.emptyTitle}</h2>
            <p>{data.emptyCopy}</p>
            <div className="scaffold-actions">
              {data.links.map((link, index) => (
                <Link key={link.href} className={index === 0 ? "student-button" : "student-button student-secondary"} href={link.href}>
                  {link.label}<ArrowRight size={16} />
                </Link>
              ))}
            </div>
          </div>
        </section>
      </div>
    </StudentShell>
  )
}
