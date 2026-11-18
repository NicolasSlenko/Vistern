"use client"

import { useMemo, useState } from "react"
import { Search, UsersRound } from "lucide-react"
import { cardMatches, type PublicCard } from "@/lib/community/public-card"
import { PersonCard } from "./person-card"

export interface DirectoryPerson {
  id: string
  card: PublicCard
  mine: boolean
}

/** Every listed card, searchable by name, school, skill, role or project. */
export function PeopleDirectory({ people }: { people: DirectoryPerson[] }) {
  const [query, setQuery] = useState("")
  const shown = useMemo(() => people.filter((person) => cardMatches(person.card, query)), [people, query])
  const others = people.filter((person) => !person.mine).length

  return (
    <section aria-labelledby="directory" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 id="directory" className="label-caps text-ink-2">
          {others === 0 ? "Students" : `${others} ${others === 1 ? "student" : "students"} sharing`}
        </h2>
        <label className="relative w-full sm:w-[320px]">
          <span className="sr-only">Search people</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by skill, school, role…"
            className="h-10 w-full rounded-full border border-rule-strong bg-sheet pl-9 pr-4 text-[14px] text-ink outline-none focus-visible:border-brand"
          />
        </label>
      </div>

      {people.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-[18px] border border-dashed border-rule-strong px-6 py-10">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-fill text-brand">
            <UsersRound className="h-[18px] w-[18px]" strokeWidth={1.7} aria-hidden="true" />
          </span>
          <p className="text-[18px] font-semibold tracking-[-0.02em] text-ink">Nobody is sharing a card yet</p>
          <p className="max-w-[52ch] text-[14px] leading-relaxed text-ink-2">Be the first: choose what to share above, and you’ll show up here for other students.</p>
        </div>
      ) : shown.length === 0 ? (
        <p className="text-[14px] text-ink-2" aria-live="polite">
          No one matches “{query}”.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((person) => (
            <li key={person.id}>
              <PersonCard card={person.card} mine={person.mine} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
