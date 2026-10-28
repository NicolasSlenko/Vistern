"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { ArrowLeft, ArrowRight, X } from "lucide-react"

/** One stop per part of the app. `nav` is the sidebar entry the stop lights up. */
const stops = [
  {
    path: "/home",
    nav: "/home",
    title: "Home",
    body: "Where each visit starts. The big line up top is the one thing worth doing next.",
    points: ["Your resume score, and its weakest part", "Activities you’ve finished, as a growing tree", "Dates you’re preparing for"],
  },
  {
    path: "/career",
    nav: "/career",
    title: "Career",
    body: "Your plan. Choose activities that move you toward a role, tick off their steps and keep notes as you go.",
    points: ["Career paths, to see what a role involves day to day", "Project ideas, guides and coding practice", "All under Career in the sidebar"],
  },
  {
    path: "/profile",
    nav: "/profile",
    title: "Master profile",
    body: "One record of everything you’ve done: education, experience, projects and skills. Fill it in once and every resume draws from it.",
    points: ["Upload a resume to fill it in for you", "Edit any entry in place"],
  },
  {
    path: "/resumes",
    nav: "/profile",
    title: "My resumes",
    body: "A resume for each kind of role you’re applying to. Open one to see a suggested rewrite for every weak bullet.",
    points: ["Accept or dismiss each suggestion, line by line", "Editing a resume never changes your profile"],
  },
  {
    path: "/jobs",
    nav: "/jobs",
    title: "Jobs",
    body: "Browse internships and save the ones you’re considering. Saved roles show up on Home while you prepare.",
    points: ["Applications tracks each role from saved to offer"],
  },
  {
    path: "/community",
    nav: "/community",
    title: "Community",
    body: "Groups, research openings and people at UF to learn alongside.",
    points: ["Feed, people, sessions and messages are under Community in the sidebar"],
  },
] as const

const storageKey = "vistern-tour"
const startEvent = "vistern-tour-start"

function readStep(): number | null {
  try {
    const step = JSON.parse(localStorage.getItem(storageKey) || "null")
    return Number.isInteger(step) && step >= 0 && step < stops.length ? step : null
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

/** Start (or restart) the tour from its first stop. */
export function startTour() {
  writeStep(0)
  window.dispatchEvent(new Event(startEvent))
}

/**
 * A card that walks a new student through each part of the app, one page at a
 * time. Not modal: the page under it stays usable, so they can look around a
 * stop before moving on. Where they are in the tour is kept in localStorage,
 * because every page draws its own shell.
 */
export function GuidedTour() {
  const pathname = usePathname()
  const router = useRouter()
  const [step, setStep] = useState<number | null>(null)
  const heading = useRef<HTMLHeadingElement>(null)

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
      if (window.location.pathname !== stops[0].path) router.push(stops[0].path)
    }
    window.addEventListener(startEvent, onStart)
    return () => window.removeEventListener(startEvent, onStart)
  }, [router])

  function go(next: number) {
    writeStep(next)
    setStep(next)
    if (stops[next].path !== pathname) router.push(stops[next].path)
  }
  function close() {
    writeStep(null)
    setStep(null)
  }

  const stop = step === null ? null : stops[step]
  const here = stop?.path === pathname

  // Light up the stop's sidebar entry.
  useEffect(() => {
    if (!stop) return
    const item = document.querySelector(`.student-sidebar [data-nav="${stop.nav}"]`)
    item?.setAttribute("data-tour-spot", "")
    return () => item?.removeAttribute("data-tour-spot")
  }, [stop, pathname])

  // Bring the reader to the card when it opens or a new stop's page arrives.
  useEffect(() => {
    if (stop && here) heading.current?.focus({ preventScroll: true })
  }, [stop, here])

  const open = step !== null
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        writeStep(null)
        setStep(null)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])

  if (step === null || !stop) return null

  const last = step === stops.length - 1

  return (
    <section className="guided-tour" role="dialog" aria-modal="false" aria-labelledby="guided-tour-title" key={step}>
      <div className="flex items-center justify-between gap-3">
        <p className="label-mono text-ink-3">
          Tour · {step + 1} of {stops.length}
        </p>
        <button type="button" className="guided-tour-close" onClick={close} aria-label="End the tour">
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      <div className="guided-tour-track" aria-hidden="true">
        {stops.map((item, index) => (
          <span key={item.path} data-done={index <= step ? "" : undefined} />
        ))}
      </div>
      <h2 id="guided-tour-title" ref={heading} tabIndex={-1} className="font-serif text-[26px] leading-[1.08] tracking-[-0.025em] text-ink focus:outline-none">
        {stop.title}
      </h2>
      <p className="text-[14px] leading-relaxed text-ink-2">{stop.body}</p>
      <ul className="flex flex-col gap-1.5">
        {stop.points.map((point) => (
          <li key={point} className="flex gap-2 text-[13px] leading-snug text-ink-2">
            <span aria-hidden="true" className="mt-[7px] h-[5px] w-[5px] shrink-0 rounded-full bg-brand" />
            {point}
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-2 pt-1">
        {step > 0 && (
          <button type="button" onClick={() => go(step - 1)} className="white-button inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-[14px] font-medium">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back
          </button>
        )}
        {!here ? (
          <button type="button" onClick={() => go(step)} className="brand-button ml-auto inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-[14px] font-medium">
            Open {stop.title}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : last ? (
          <button type="button" onClick={close} className="brand-button ml-auto inline-flex h-10 items-center rounded-full px-4 text-[14px] font-medium">
            Finish tour
          </button>
        ) : (
          <button type="button" onClick={() => go(step + 1)} className="brand-button ml-auto inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-[14px] font-medium">
            Next: {stops[step + 1].title}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </section>
  )
}
