import { Github, Globe, Linkedin, Mail } from "lucide-react"
import type { PublicCard } from "@/lib/community/public-card"

/**
 * One student as the People directory shows them: only what's on their card,
 * which only holds what they switched on.
 */
export function PersonCard({ card, mine = false, preview = false }: { card: PublicCard; mine?: boolean; preview?: boolean }) {
  const initials = card.name
    .split(" ")
    .map((word) => word[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()
  const study = [card.year, card.school?.program].filter(Boolean).join(" · ")
  const links = card.links ?? {}

  return (
    <article
      className={`flex h-full flex-col gap-4 rounded-[18px] border bg-sheet p-5 shadow-card-rest transition-colors duration-150 ${
        mine ? "border-brand/40" : "border-hairline hover:border-rule"
      }`}
    >
      <header className="flex items-start gap-3.5">
        {card.photo ? (
          // Clerk's image host; a plain img keeps next/image's domain list out of it.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={card.photo} alt="" className="h-12 w-12 shrink-0 rounded-full bg-fill object-cover" />
        ) : (
          <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-fill text-[15px] font-semibold text-brand">
            {initials}
          </span>
        )}
        <div className="flex min-w-0 flex-col gap-0.5">
          <h3 className="flex items-center gap-2 text-[16px] font-semibold tracking-[-0.015em] text-ink">
            <span className="truncate">{card.name}</span>
            {mine && !preview && <span className="label-caps rounded-full bg-brand/10 px-2 py-0.5 text-brand">You</span>}
          </h3>
          {card.headline && <p className="text-[14px] leading-snug text-ink-2">{card.headline}</p>}
        </div>
      </header>

      {(study || card.school || card.location) && (
        <dl className="flex flex-col gap-1 text-[13px] leading-snug text-ink-2">
          {card.school && (
            <div>
              <dt className="sr-only">School</dt>
              <dd className="text-ink">
                {card.school.school}
                {card.school.graduation && <span className="text-ink-3"> · {card.school.graduation}</span>}
              </dd>
            </div>
          )}
          {study && (
            <div>
              <dt className="sr-only">Study</dt>
              <dd>{study}</dd>
            </div>
          )}
          {card.location && (
            <div>
              <dt className="sr-only">Location</dt>
              <dd>{card.location}</dd>
            </div>
          )}
        </dl>
      )}

      {card.experience && (
        <section className="flex flex-col gap-1">
          <h4 className="label-caps text-ink-3">Roles</h4>
          <ul className="flex flex-col gap-0.5 text-[13px] text-ink-2">
            {card.experience.map((entry, index) => (
              <li key={index}>
                <span className="text-ink">{entry.position}</span>
                {entry.company && <span> · {entry.company}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {card.projects && (
        <section className="flex flex-col gap-1">
          <h4 className="label-caps text-ink-3">Projects</h4>
          <ul className="flex flex-col gap-0.5 text-[13px] text-ink-2">
            {card.projects.map((entry, index) => (
              <li key={index}>
                <span className="text-ink">{entry.name}</span>
                {entry.technologies.length > 0 && <span className="text-ink-3"> · {entry.technologies.join(", ")}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {card.skills && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Skills">
          {card.skills.map((skill) => (
            <li key={skill} className="rounded-full bg-fill px-2.5 py-1 text-[12px] text-ink-2">
              {skill}
            </li>
          ))}
        </ul>
      )}

      {(links.linkedin || links.github || links.portfolio || card.email) && (
        <footer className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-hairline pt-3">
          {links.linkedin && <CardLink href={links.linkedin} icon={Linkedin} label="LinkedIn" />}
          {links.github && <CardLink href={links.github} icon={Github} label="GitHub" />}
          {links.portfolio && <CardLink href={links.portfolio} icon={Globe} label="Website" />}
          {card.email && <CardLink href={`mailto:${card.email}`} icon={Mail} label="Email" />}
        </footer>
      )}
    </article>
  )
}

function CardLink({ href, icon: Icon, label }: { href: string; icon: typeof Mail; label: string }) {
  const external = !href.startsWith("mailto:")
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer nofollow" : undefined}
      className="inline-flex items-center gap-1.5 text-[13px] font-medium text-brand underline-offset-4 hover:underline"
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </a>
  )
}
