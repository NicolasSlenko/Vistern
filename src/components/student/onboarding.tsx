"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { ArrowLeft, ArrowRight, Check, GraduationCap, Sprout } from "lucide-react"
import { ResumeUpload } from "@/components/resume-upload"
import {
  backgroundFollowup,
  backgroundLabels,
  studentProfileSchema,
  toggleBackground,
  yearLabels,
  type OnboardingStep,
  type StudentProfile,
} from "@/lib/student-profile"
import { saveProfile } from "./save-profile"
import { GrowthTree } from "./growth-tree"

export function Onboarding({
  initialProfile,
  initialStep,
  hasResume,
  editing = false,
}: {
  initialProfile: StudentProfile | null
  initialStep: OnboardingStep
  hasResume: boolean
  editing?: boolean
}) {
  const router = useRouter()
  const [draft, setDraft] = useState(() => initialProfile || studentProfileSchema.parse({}))
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [resumeSaved, setResumeSaved] = useState(hasResume)
  const [error, setError] = useState("")
  const heading = useRef<HTMLHeadingElement>(null)
  const step = !draft.year ? "year" : initialStep === "done" ? "year" : initialStep
  const followup = backgroundFollowup(draft.backgroundAreas)
  const progress = step === "year" ? (draft.year ? 33 : 0) : step === "detail" ? 67 : 33
  useEffect(() => {
    heading.current?.focus()
  }, [step])

  async function advance(next: OnboardingStep) {
    if (!draft.year) {
      setError("Choose your year, or select Not sure.")
      return false
    }
    setSaving(true)
    setError("")
    try {
      const saved = await saveProfile({
        intent: "onboarding",
        year: draft.year,
        backgroundAreas: draft.backgroundAreas,
        backgroundNote: draft.backgroundNote,
        step: next,
      })
      setDraft(saved)
      router.push(next === "done" ? "/home" : `/onboarding?step=${next}${editing ? "&edit=1" : ""}`)
      router.refresh()
      return true
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "We couldn’t save your answers. Please try again.",
      )
      return false
    } finally {
      setSaving(false)
    }
  }

  async function completeResumeUpload() {
    setResumeSaved(true)
    if (!(await advance("done"))) {
      throw new Error(
        "Your resume is saved, but we couldn’t finish setup. Please try Use saved resume.",
      )
    }
  }

  const { title, description } = {
    year: { title: "What year are you in?", description: "" },
    resume: {
      title: "Do you have a resume?",
      description:
        "Upload your resume to fill in your education and experience, or continue without one.",
    },
    background: { title: "Tell us about your background", description: "Select all that apply." },
    detail: {
      title: followup?.title || "Tell us about your experience",
      description: "Include what you did and any tools or skills you used.",
    },
  }[step]
  const previousStep = {
    year: "year",
    resume: "year",
    background: "resume",
    detail: "background",
  } as const
  const nextStep = {
    year: "resume",
    resume: "background",
    background: followup ? "detail" : "done",
    detail: "done",
  } as const
  return (
    <div className="student-onboarding">
      <aside className="student-growth-panel">
        <div className="student-growth-intro">
          <span className="student-growth-kicker">
            <Sprout size={16} /> Your profile
          </span>
          <h2>Welcome to Vistern</h2>
          <p>You can upload a resume or add your background yourself.</p>
        </div>
        <div className="student-tree-stage">
          <GrowthTree progress={progress} />
        </div>
      </aside>
      <section
        className="student-onboarding-content"
        aria-labelledby="onboarding-title"
        aria-busy={saving || uploading}
      >
        <ol className="student-setup-track" aria-label="Setup steps">
          <li aria-current={step === "year" ? "step" : undefined} data-complete={step !== "year"}>
            <span>{step === "year" ? "1" : <Check size={13} />}</span>Your year
          </li>
          <li aria-current={step !== "year" ? "step" : undefined}>
            <span>2</span>Your background
          </li>
        </ol>
        <h1 id="onboarding-title" ref={heading} tabIndex={-1}>
          {title}
        </h1>
        {description && <p className="student-lead">{description}</p>}
        {step === "year" && (
          <fieldset className="student-options" disabled={saving}>
            <legend className="sr-only">Year of study</legend>
            {Object.entries(yearLabels).map(([value, label], index) => (
              <label key={value}>
                <input
                  type="radio"
                  name="year"
                  checked={draft.year === value}
                  onChange={() => {
                    setDraft({ ...draft, year: value as StudentProfile["year"] })
                    setError("")
                  }}
                />
                <span className="student-year-symbol" aria-hidden="true">
                  {index < 4 ? `0${index + 1}` : index === 4 ? <GraduationCap size={21} /> : "?"}
                </span>
                <span>{label}</span>
                <i aria-hidden="true">
                  <Check size={13} />
                </i>
              </label>
            ))}
          </fieldset>
        )}
        {step === "resume" && (
          <div className="student-upload">
            {resumeSaved && (
              <div className="student-existing">
                <Check size={18} />
                <p>You already have a saved resume.</p>
                <button
                  type="button"
                  className="student-button"
                  disabled={saving || uploading}
                  onClick={() => advance("done")}
                >
                  Use saved resume
                </button>
              </div>
            )}
            <ResumeUpload onComplete={completeResumeUpload} onBusyChange={setUploading} />
          </div>
        )}
        {step === "background" && (
          <fieldset className="student-options" disabled={saving}>
            <legend className="sr-only">Your background</legend>
            {Object.entries(backgroundLabels).map(([value, label]) => (
              <label key={value}>
                <input
                  type="checkbox"
                  checked={draft.backgroundAreas.includes(value as keyof typeof backgroundLabels)}
                  onChange={() =>
                    setDraft({
                      ...draft,
                      backgroundAreas: toggleBackground(
                        draft.backgroundAreas,
                        value as keyof typeof backgroundLabels,
                      ),
                    })
                  }
                />
                <span>{label}</span>
                <i aria-hidden="true">
                  <Check size={13} />
                </i>
              </label>
            ))}
          </fieldset>
        )}
        {step === "detail" && (
          <div className="student-note">
            <label htmlFor="background-note">
              {followup?.label || "What did you do?"} <span>Optional</span>
            </label>
            <textarea
              id="background-note"
              maxLength={600}
              rows={5}
              value={draft.backgroundNote}
              disabled={saving}
              onChange={(event) => setDraft({ ...draft, backgroundNote: event.target.value })}
            />
          </div>
        )}
        {error && (
          <p className="student-error" role="alert">
            {error}
          </p>
        )}
        <div className="student-form-actions">
          {step === "year" ? (
            <Link
              className="student-text-link"
              href={editing || hasResume ? "/home" : "/landing-page"}
            >
              <ArrowLeft size={16} />
              {editing || hasResume ? "Back to Home" : "Back to site"}
            </Link>
          ) : (
            <button
              type="button"
              className="student-text-link"
              disabled={saving || uploading}
              onClick={() => advance(previousStep[step])}
            >
              <ArrowLeft size={16} />
              Back
            </button>
          )}
          <button
            type="button"
            className="student-button"
            disabled={saving || uploading}
            onClick={() => advance(nextStep[step])}
          >
            {saving
              ? "Saving…"
              : step === "resume"
                ? "Continue without one"
                : nextStep[step] === "done"
                  ? "Go to Home"
                  : "Continue"}
            <ArrowRight size={16} />
          </button>
        </div>
      </section>
    </div>
  )
}
