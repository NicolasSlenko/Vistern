"use client"

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { ArrowLeft, ArrowRight, Check, X } from "lucide-react"

type Step = {
  /** Selectors for the part of the page this step is about; the first one on screen wins. None, or none found, centres the card. */
  target?: string[]
  title: string
  body: string
  points?: string[]
}
type Section = { id: string; label: string; path: string; steps: Step[] }

const sidebarSection = (href: string) => [`.student-sidebar [data-nav-section="${href}"]`]

/** The tour, by section. Each section is one page; a student can skip any of them. */
const sections: Section[] = [
  {
    id: "home",
    label: "Home",
    path: "/home",
    steps: [
      {
        title: "Welcome to Vistern",
        body: "This walkthrough goes through each part of the app, one page at a time, and points out what everything on it is for.",
        points: [
          "Seven sections: Home, Career, Profile, Resumes, Jobs, Applications and Community",
          "Jump to any of them with the tabs above, or skip a section you don’t need",
          "On a keyboard, ← and → move through the steps and Esc ends the tour",
        ],
      },
      {
        target: [".student-sidebar nav"],
        title: "Getting around",
        body: "The sidebar (Menu, on a phone) is always there. Home is your overview; the other four each open into their own pages.",
        points: ["Career: your plan, career paths, projects, guides and practice", "Community: groups, a feed, people, sessions and messages", "Resume: your master profile, resumes and feedback", "Jobs: browsing roles and tracking applications"],
      },
      {
        target: ['[data-tour="home-next"]'],
        title: "Your next move",
        body: "The headline is the one thing worth doing next: the activity you’re in the middle of, or a suggestion if you haven’t started one.",
        points: ["Continue opens that activity where you left off", "My plan takes you to everything in your career plan", "“Coming up” appears when a date you set is close"],
      },
      {
        target: ['[data-tour="home-resume"]'],
        title: "Resume score",
        body: "How complete your resume is, out of 100. It’s measured on your master profile, so it moves as you add and improve entries.",
        points: ["The checks below the score are how well it’s written: clear bullets, numbers, strong verbs", "“Weakest part” tells you which section to work on first", "Review my bullets opens line-by-line rewrites"],
      },
      {
        target: ['[data-tour="home-growth"]'],
        title: "Growth",
        body: "Every activity you finish grows a leaf on this tree. Choose a leaf to see what it was.",
        points: ["The percentage is how far along your chosen roadmap you are", "Completed work lists everything you’ve finished"],
      },
      {
        target: ['[data-tour="home-dates"]'],
        title: "Dates",
        body: "The deadlines and events you’re preparing for: an application closing, a talk, an interview.",
        points: ["Add one to put it on your plan with a date", "Past dates stay until you write down how it went"],
      },
      {
        target: ['[data-tour="home-more"]'],
        title: "Everything else, at a glance",
        body: "The rest of your plan, the roles you’ve saved, and places to start at UF.",
        points: ["Saved roles stay here while you prepare and apply", "Each panel’s link opens its full page"],
      },
      {
        target: [".student-account-nav"],
        title: "Your account",
        body: "Restart this tour any time from here, switch between light and dark, and manage your account.",
      },
    ],
  },
  {
    id: "career",
    label: "Career",
    path: "/career",
    steps: [
      {
        target: [".career-page-heading"],
        title: "Career",
        body: "Where your plan lives: the roadmap you’re following and the activities you’ve added yourself.",
        points: ["Add an activity for anything you’re working on: a project, an application, interview prep, a club"],
      },
      {
        target: [".career-plan-pick", ".career-plan-roadmap-hero"],
        title: "Choose a track",
        body: "Pick the kind of work you want to try. Each track turns into a roadmap of stages, with the steps a student usually takes toward it.",
        points: ["Software engineering, Data & AI, Cybersecurity, and more", "You can change tracks later; your ticked steps stay saved for each one"],
      },
      {
        target: [".career-plan-track-grid", ".career-plan-roadmap-layout"],
        title: "Your roadmap",
        body: "Once you choose a track, its stages appear here. Tick off each step as you do it, and the progress bar and your growth tree fill in.",
        points: ["Suggested projects at your level appear beside the stages", "Steps are small on purpose: each is something you can do this week"],
      },
      {
        target: [".career-plan-work"],
        title: "Activities in your plan",
        body: "Your own work, outside the roadmap. Each activity has steps to tick, notes, and an optional date.",
        points: ["Choose one to see its progress, key details and technologies beside the list", "Save one for later to pause it without losing it", "Finished activities move to Completed work and grow a leaf"],
      },
      {
        target: sidebarSection("/career"),
        title: "More in Career",
        body: "The rest of Career is in the sidebar, or under Menu on a phone.",
        points: ["Career paths: what a role involves day to day, and what to learn for it", "Projects: ideas sorted by level and time", "Career guides: internships, new-grad hiring and more", "Coding practice: interview problems to work through"],
      },
    ],
  },
  {
    id: "profile",
    label: "Profile",
    path: "/profile",
    steps: [
      {
        target: ['[data-tour="studio-header"]'],
        title: "Master profile",
        body: "One record of everything you’ve done: education, experience, projects and skills. Fill it in once; every resume draws from it.",
        points: ["Changes save on their own; the note by the title says when", "The page on the right is your general resume, redrawn as you type", "Save as resume puts a copy of it on your shelf"],
      },
      {
        target: ['[data-tour="studio-left"]'],
        title: "Sections",
        body: "Choose a section to edit it. A dot beside one means there’s a review note waiting on it.",
        points: ["Profile, education, experience, projects, skills and more", "Add as many entries as you have: this isn’t limited to one page"],
      },
      {
        target: ['[data-tour="studio-form"]'],
        title: "Editing",
        body: "The section you chose, as a form. Each role, project and degree is its own card that you can edit, reorder or remove.",
        points: ["If the profile is empty, upload a resume here and we’ll fill it in for you"],
      },
      {
        target: ['[data-tour="studio-modes"]'],
        title: "Write, Review and Suggestions",
        body: "Write is where you edit. Review asks the AI to read the whole profile and leave notes on the entries that could be stronger. Suggestions is for line-level rewrites of individual bullets.",
        points: ["Each note points to the entry it’s about", "Mark a note done once you’ve dealt with it"],
      },
    ],
  },
  {
    id: "resumes",
    label: "Resumes",
    path: "/resumes",
    steps: [
      {
        target: ['[data-tour="resumes-header"]'],
        title: "My resumes",
        body: "Keep a separate resume for each kind of role you apply to. They’re edited on their own, so a rewrite here never changes your master profile.",
        points: ["Upload adds a new resume from a PDF"],
      },
      {
        target: ['[data-tour="resumes-shelf"] li:first-child', '[data-tour="resumes-shelf"]'],
        title: "The shelf",
        body: "Every resume as a page, with its score and the role it’s for. Open one to work on it.",
        points: ["A star marks the one you send most", "Hover a page to delete it"],
      },
      {
        title: "Inside a resume",
        body: "An open resume has three columns side by side.",
        points: ["Right: the file you uploaded, exactly as it looks", "Middle: its wording, to edit", "Left: the AI’s rewrite for each weak bullet; accept with a tick or dismiss with a cross"],
      },
    ],
  },
  {
    id: "jobs",
    label: "Jobs",
    path: "/jobs",
    steps: [
      {
        target: ['[data-tour="jobs-header"]'],
        title: "Jobs",
        body: "Where you look for roles and keep track of the ones you go for.",
        points: ["My applications opens your board", "With a resume added, you can match it against job listings"],
      },
      {
        target: ['[data-tour="jobs-places"]'],
        title: "Places to explore",
        body: "Hand-picked places to find internships and research: UF’s own resources and companies’ student programmes.",
      },
      {
        target: ['[data-tour="jobs-search"]'],
        title: "Your search",
        body: "Shortcuts for the work around applying.",
        points: ["Find matches using your resume", "Plan an application or interview as an activity", "Guides for internships and new-grad roles"],
      },
      {
        target: sidebarSection("/jobs"),
        title: "Applications",
        body: "Applications is a board with a column for each stage: saved, applied, interviewing, offer. The next section covers it.",
      },
    ],
  },
  {
    id: "applications",
    label: "Applications",
    path: "/jobs/applications",
    steps: [
      {
        target: ['[data-tour="apps-header"]'],
        title: "Applications",
        body: "Every role you’ve saved, and where each one stands. Save roles from the job board or from your live matches.",
        points: ["Find jobs takes you back to the job board to save more"],
      },
      {
        target: ['[data-tour="apps-summary"]'],
        title: "At a glance",
        body: "How many roles you’re tracking, how many are in progress, and how many have reached interviews or offers.",
      },
      {
        target: ['[data-tour="apps-board"]', '[data-tour="apps-empty"]'],
        title: "The board",
        body: "One column for each stage: Saved, Applied, Interviewing, Offer and Closed. Drag a role to another column as your application moves along; it saves as soon as you drop it.",
        points: ["On a touch screen, press and hold a card, then drag", "On a keyboard, focus a card, press Space, move with the arrow keys, then Space again", "The bin on a card removes the role, after asking you to confirm", "Listing opens the employer’s own posting"],
      },
      {
        target: ['[data-tour="apps-view"]', '[data-tour="apps-empty"]'],
        title: "Board or list",
        body: "Switch to List to see every role in one column with its stage shown as a label. Moving roles between stages is done on the board.",
      },
    ],
  },
  {
    id: "community",
    label: "Community",
    path: "/community",
    steps: [
      {
        target: ['[data-tour="community-orgs"]'],
        title: "Campus directory",
        body: "Computing groups, research programmes and organisations at UF, with links to each one’s site.",
        points: ["Add one to your plan to keep track of what you want to do there"],
      },
      {
        target: sidebarSection("/community"),
        title: "More in Community",
        body: "The rest of Community is in the sidebar, or under Menu on a phone.",
        points: ["Feed: posts from other students", "People: find others to build or study with", "Sessions: study groups and events", "Messages: your conversations"],
      },
      {
        title: "That’s the tour",
        body: "You’ve seen every part of Vistern. A good first step is to fill in your master profile, then choose a track in Career.",
        points: ["Take the tour again any time from the sidebar"],
      },
    ],
  },
]

const steps = sections.flatMap((section, sectionIndex) =>
  section.steps.map((step, index) => ({ ...step, section, sectionIndex, index })),
)
const sectionStart = (sectionIndex: number) => steps.findIndex((step) => step.sectionIndex === sectionIndex)

const storageKey = "vistern-tour"
const startEvent = "vistern-tour-start"

function readStep(): number | null {
  try {
    const step = JSON.parse(localStorage.getItem(storageKey) || "null")
    return Number.isInteger(step) && step >= 0 && step < steps.length ? step : null
  } catch {
    return null
  }
}
function writeStep(step: number | null) {
  try {
    if (step === null) localStorage.removeItem(storageKey)
    else localStorage.setItem(storageKey, JSON.stringify(step))
  } catch { /* The tour still runs for this page if storage is unavailable. */ }
}

/** Start (or restart) the tour from its first step. */
export function startTour() {
  writeStep(0)
  window.dispatchEvent(new Event(startEvent))
}

function findTarget(selectors: string[] | undefined): Element | null {
  for (const selector of selectors ?? []) {
    for (const element of document.querySelectorAll(selector)) {
      const rect = element.getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0) return element
    }
  }
  return null
}

type Box = { top: number; left: number; width: number; height: number }
const PAD = 8
const GAP = 16
const EDGE = 12
const CARD_WIDTH = 392

/** Where the cut-out goes: the target with a little room round it, kept on screen. */
function spotFor(element: Element | null): Box | null {
  if (!element) return null
  const rect = element.getBoundingClientRect()
  const top = Math.max(rect.top - PAD, EDGE / 2)
  const left = Math.max(rect.left - PAD, EDGE / 2)
  const bottom = Math.min(rect.bottom + PAD, window.innerHeight - EDGE / 2)
  const right = Math.min(rect.right + PAD, window.innerWidth - EDGE / 2)
  if (bottom <= top || right <= left) return null
  return { top, left, width: right - left, height: bottom - top }
}

/** Beside the cut-out if there's room, then below, above, and failing all that the corner. */
function cardAt(spot: Box | null, width: number, height: number): { top: number; left: number } {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const clampTop = (top: number) => Math.min(Math.max(top, EDGE), vh - height - EDGE)
  const clampLeft = (left: number) => Math.min(Math.max(left, EDGE), vw - width - EDGE)
  if (!spot) return { top: (vh - height) / 2, left: (vw - width) / 2 }
  const right = spot.left + spot.width
  const bottom = spot.top + spot.height
  if (right + GAP + width <= vw - EDGE) return { top: clampTop(spot.top), left: right + GAP }
  if (spot.left - GAP - width >= EDGE) return { top: clampTop(spot.top), left: spot.left - GAP - width }
  if (bottom + GAP + height <= vh - EDGE) return { top: bottom + GAP, left: clampLeft(spot.left) }
  if (spot.top - GAP - height >= EDGE) return { top: spot.top - GAP - height, left: clampLeft(spot.left) }
  // Nowhere clear of it: whichever corner covers least of it.
  const corners = [
    { top: vh - height - EDGE, left: vw - width - EDGE },
    { top: vh - height - EDGE, left: EDGE },
    { top: EDGE, left: vw - width - EDGE },
    { top: EDGE, left: EDGE },
  ]
  const covered = ({ top, left }: { top: number; left: number }) =>
    Math.max(0, Math.min(left + width, right) - Math.max(left, spot.left)) *
    Math.max(0, Math.min(top + height, bottom) - Math.max(top, spot.top))
  return corners.reduce((best, corner) => (covered(corner) < covered(best) ? corner : best))
}

/** Whether a target leaves room for the card beside it; if not, it goes to the top of the screen so the card can sit below. */
const roomBeside = (rect: DOMRect) =>
  rect.right + PAD + GAP + CARD_WIDTH <= window.innerWidth - EDGE || rect.left - PAD - GAP - CARD_WIDTH >= EDGE

const same = (a: Box | null, b: Box | null) =>
  a === b || (!!a && !!b && Math.abs(a.top - b.top) < 0.5 && Math.abs(a.left - b.left) < 0.5 && Math.abs(a.width - b.width) < 0.5 && Math.abs(a.height - b.height) < 0.5)

/**
 * A walkthrough of the whole app, section by section. Everything but the part
 * of the page a step is about goes dark, and a card beside it says what it's
 * for. Where the student is in the tour is kept in localStorage, because every
 * page draws its own shell.
 */
export function GuidedTour() {
  const pathname = usePathname()
  const router = useRouter()
  const [step, setStep] = useState<number | null>(null)
  const [spot, setSpot] = useState<Box | null>(null)
  const [card, setCard] = useState<{ top: number; left: number } | null>(null)
  const [phone, setPhone] = useState(false)
  const cardRef = useRef<HTMLElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const target = useRef<Element | null>(null)

  useEffect(() => {
    // Onboarding hands over with ?tour=1; take it, then drop it from the URL
    // so a reload or a shared link doesn't start the tour again.
    const params = new URLSearchParams(window.location.search)
    if (params.get("tour") === "1") {
      writeStep(0)
      params.delete("tour")
      const query = params.toString()
      window.history.replaceState(window.history.state, "", `${window.location.pathname}${query ? `?${query}` : ""}`)
    }
    setStep(readStep())
    const onStart = () => {
      setStep(0)
      if (window.location.pathname !== steps[0].section.path) router.push(steps[0].section.path)
    }
    window.addEventListener(startEvent, onStart)
    return () => window.removeEventListener(startEvent, onStart)
  }, [router])

  const current = step === null ? null : steps[step]
  const here = current?.section.path === pathname

  const go = useCallback(
    (next: number) => {
      writeStep(next)
      setStep(next)
      if (steps[next].section.path !== window.location.pathname) router.push(steps[next].section.path)
    },
    [router],
  )
  const close = useCallback(() => {
    writeStep(null)
    setStep(null)
  }, [])

  // Measure the target and the card, and put both where they belong.
  const measure = useCallback(() => {
    const isPhone = window.innerWidth < 640
    setPhone(isPhone)
    const nextSpot = spotFor(target.current)
    setSpot((previous) => (same(previous, nextSpot) ? previous : nextSpot))
    const element = cardRef.current
    if (!element || isPhone) return setCard(null)
    const next = cardAt(nextSpot, element.offsetWidth, element.offsetHeight)
    setCard((previous) => (previous && Math.abs(previous.top - next.top) < 0.5 && Math.abs(previous.left - next.left) < 0.5 ? previous : next))
  }, [])

  // On each step: wait for its target to render (the page may still be
  // arriving), bring it into view, then follow it while the scroll settles.
  useEffect(() => {
    if (!current || !here) return
    target.current = null
    let frame = 0
    let settleUntil = 0
    const started = performance.now()
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const tick = (now: number) => {
      if (!target.current && current.target) {
        const found = findTarget(current.target)
        if (found) {
          target.current = found
          const element = found as HTMLElement
          const atTop = window.innerWidth < 640 || !roomBeside(found.getBoundingClientRect())
          const margin = element.style.scrollMarginTop
          element.style.scrollMarginTop = atTop ? "calc(var(--chrome-top, 0px) + 20px)" : ""
          element.scrollIntoView({ block: atTop ? "start" : "center", behavior: reduce ? "auto" : "smooth" })
          element.style.scrollMarginTop = margin
          settleUntil = now + 700
        } else if (now - started < 3000) {
          frame = requestAnimationFrame(tick)
          return measure()
        }
      }
      measure()
      if (now < settleUntil) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    const observer = new ResizeObserver(measure)
    observer.observe(document.body)
    window.addEventListener("resize", measure)
    window.addEventListener("scroll", measure, true)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      window.removeEventListener("resize", measure)
      window.removeEventListener("scroll", measure, true)
    }
  }, [current, here, measure])

  // The card's size depends on its text, so place it again once it renders.
  useLayoutEffect(() => {
    if (current) measure()
  }, [current, measure])

  // Keep focus in the card and take the reader to it at each step.
  useEffect(() => {
    if (current) heading.current?.focus({ preventScroll: true })
  }, [current])

  useEffect(() => {
    if (step === null) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close()
      else if (event.key === "ArrowRight" && step < steps.length - 1) go(step + 1)
      else if (event.key === "ArrowLeft" && step > 0) go(step - 1)
      else if (event.key === "Tab" && cardRef.current) {
        const focusable = cardRef.current.querySelectorAll<HTMLElement>("button:not(:disabled)")
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (event.shiftKey && (document.activeElement === first || !cardRef.current.contains(document.activeElement))) {
          event.preventDefault()
          last?.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first?.focus()
        }
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [step, go, close])

  if (step === null || !current) return null

  const lastStep = step === steps.length - 1
  const lastInSection = current.index === current.section.steps.length - 1
  const nextSection = sections[current.sectionIndex + 1]
  const vw = typeof window === "undefined" ? 0 : window.innerWidth
  const vh = typeof window === "undefined" ? 0 : window.innerHeight
  // With nothing to point at, the cut-out shrinks to a point in the middle and everything is dark.
  const hole = here && spot ? spot : { top: vh / 2, left: vw / 2, width: 0, height: 0 }

  return (
    <div className="guided-tour-layer">
      {/* Catches clicks on the dark: the page is shown, not used, while the tour is open. */}
      <div className="guided-tour-blocker" aria-hidden="true" />
      <div
        className="guided-tour-spot"
        data-empty={here && spot ? undefined : ""}
        aria-hidden="true"
        style={{ top: hole.top, left: hole.left, width: hole.width, height: hole.height }}
      />
      <section
        ref={cardRef}
        className="guided-tour"
        data-phone={phone ? "" : undefined}
        role="dialog"
        aria-modal="true"
        aria-labelledby="guided-tour-title"
        aria-describedby="guided-tour-body"
        style={card && !phone ? { top: card.top, left: card.left } : undefined}
      >
        <div className="flex items-start justify-between gap-3">
          <nav aria-label="Tour sections" className="flex flex-wrap gap-1.5">
            {sections.map((section, index) => (
              <button
                key={section.id}
                type="button"
                className="guided-tour-chip"
                data-done={index < current.sectionIndex ? "" : undefined}
                aria-current={index === current.sectionIndex ? "step" : undefined}
                onClick={() => go(sectionStart(index))}
              >
                {index < current.sectionIndex && <Check className="h-3 w-3" aria-hidden="true" />}
                {section.label}
              </button>
            ))}
          </nav>
          <button type="button" className="guided-tour-close" onClick={close} aria-label="End the tour">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="guided-tour-track" aria-hidden="true">
          {current.section.steps.map((item, index) => (
            <span key={item.title} data-done={index <= current.index ? "" : undefined} />
          ))}
        </div>

        <div key={step} className="guided-tour-copy flex flex-col gap-2.5">
          <p className="label-mono text-ink-3">
            {current.section.label} · {current.index + 1} of {current.section.steps.length}
          </p>
          <h2 id="guided-tour-title" ref={heading} tabIndex={-1} className="font-serif text-[25px] leading-[1.1] tracking-[-0.025em] text-ink focus:outline-none">
            {current.title}
          </h2>
          <p id="guided-tour-body" className="text-[14px] leading-relaxed text-ink-2">
            {current.body}
          </p>
          {current.points && (
            <ul className="flex flex-col gap-1.5">
              {current.points.map((point) => (
                <li key={point} className="flex gap-2 text-[13px] leading-snug text-ink-2">
                  <span aria-hidden="true" className="mt-[7px] h-[5px] w-[5px] shrink-0 rounded-full bg-brand" />
                  {point}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          {nextSection && (
            <button type="button" className="guided-tour-skip" onClick={() => go(sectionStart(current.sectionIndex + 1))}>
              Skip section
            </button>
          )}
          <span className="ml-auto flex items-center gap-2">
            {step > 0 && (
              <button type="button" onClick={() => go(step - 1)} aria-label="Previous step" className="white-button inline-flex h-10 w-10 items-center justify-center rounded-full">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
            {!here ? (
              <button type="button" onClick={() => go(step)} className="brand-button inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-[14px] font-medium">
                Back to {current.section.label}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : lastStep ? (
              <button type="button" onClick={close} className="brand-button inline-flex h-10 items-center rounded-full px-4 text-[14px] font-medium">
                Finish tour
              </button>
            ) : (
              <button type="button" onClick={() => go(step + 1)} className="brand-button inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-[14px] font-medium">
                {lastInSection ? `Next: ${nextSection.label}` : "Next"}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </span>
        </div>
      </section>
    </div>
  )
}
