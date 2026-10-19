import React, { useEffect, useRef } from "react"
import { createRoot } from "react-dom/client"
import { Toaster } from "sonner"
import { StudentShell } from "../../src/components/student/student-shell"
import { Onboarding } from "../../src/components/student/onboarding"
import { StudentHome } from "../../src/components/student/student-home"
import { ResumeUpload } from "../../src/components/resume-upload"
import { getResumeObject } from "../../src/app/api/parse/resumeSchema"
import {
  stepSchema,
  studentProfileSchema,
  updateStudentProfile,
  type StudentProfile,
} from "../../src/lib/student-profile"
import "../../src/app/globals.css"
import "./preview.css"

const PROFILE = "vistern-meeting-profile",
  RESUME = "vistern-meeting-resume",
  FAIL = "vistern-meeting-fail"
const sample = getResumeObject()
sample.basics.name = "Sam Rivera"
sample.education = [
  {
    school: "Example University",
    degree: "BS",
    field: "Computer Science",
    start_date: "2024",
    end_date: "2028",
    achievements: [],
  },
]
sample.projects = [
  {
    name: "Campus study planner",
    description: "Built a small class project to organize assignments.",
    technologies: ["Python"],
    highlights: ["Designed the task list and tested it with classmates."],
    link: "",
    github: "",
  },
]
sample.skills.programming_languages = ["Python"]
const readProfile = (): StudentProfile | null => JSON.parse(localStorage.getItem(PROFILE) || "null")
const readResume = () => JSON.parse(localStorage.getItem(RESUME) || "null")
const reply = (data: unknown, status = 200) => Promise.resolve(Response.json(data, { status }))

// Test data stays in this browser. No auth, storage, AI, or team API is contacted.
const realFetch = window.fetch.bind(window)
window.fetch = async (input, init) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url
  if (!url.startsWith("/api/")) return realFetch(input, init)
  if (url === "/api/student-profile") {
    if (localStorage.getItem(FAIL) === "1") {
      localStorage.removeItem(FAIL)
      document.getElementById("demo-status")!.textContent =
        "Save error shown. Retry the same action to continue."
      return reply(
        { success: false, error: "Demo save failed. Your answers are still here; try again." },
        500,
      )
    }
    try {
      const data = updateStudentProfile(readProfile(), JSON.parse(String(init?.body)))
      localStorage.setItem(PROFILE, JSON.stringify(data))
      document.getElementById("demo-status")!.textContent = ""
      return reply({ success: true, data })
    } catch {
      return reply({ success: false, error: "Check your answers and try again." }, 400)
    }
  }
  if (url === "/api/upload") return reply({ success: true, filename: "demo/sample-resume.txt" })
  if (url === "/api/parse") return reply({ details: sample, missing: [] })
  if (url === "/api/resume" && init?.method === "POST") {
    localStorage.setItem(RESUME, String(init.body))
    return reply({ success: true })
  }
  if (url === "/api/resume") return reply({ success: true, data: readResume() })
  if (url === "/api/analyze/xyz-batch")
    return reply({ success: true, data: { projects: {}, experience: {} } })
  return reply(
    { success: false, error: "This service needs the team’s development environment." },
    503,
  )
}

function reset(withResume = false) {
  localStorage.removeItem(PROFILE)
  localStorage.removeItem(RESUME)
  localStorage.removeItem(FAIL)
  if (withResume) {
    localStorage.setItem(RESUME, JSON.stringify(sample))
    localStorage.setItem(
      PROFILE,
      JSON.stringify(studentProfileSchema.parse({ year: "junior", step: "resume" })),
    )
  }
  window.location.href = withResume ? "/onboarding?step=resume" : "/onboarding?step=year"
}

function Preview() {
  const toolbar = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const element = toolbar.current
    if (!element) return
    const observer = new ResizeObserver(() =>
      document.documentElement.style.setProperty(
        "--preview-toolbar-height",
        `${element.offsetHeight}px`,
      ),
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  const pathname = window.location.pathname
  const params = new URLSearchParams(window.location.search)
  const profile = readProfile(),
    resume = readResume()
  const requested = stepSchema.safeParse(params.get("step"))
  const onboarding = pathname === "/onboarding" || pathname === "/"
  return (
    <>
      <div ref={toolbar} className="demo-toolbar">
        <strong>Meeting preview</strong>
        <span>Sample data · no account or cloud connection</span>
        <div>
          <button onClick={() => reset()}>New student</button>
          <button onClick={() => reset(true)}>With a resume</button>
          <button
            onClick={() => {
              localStorage.setItem(FAIL, "1")
              document.getElementById("demo-status")!.textContent =
                "The next save will fail once. Retry to continue."
            }}
          >
            Try a save error
          </button>
          <a href="/DEMO.md" target="_blank">
            Demo guide
          </a>
        </div>
        <span id="demo-status" role="status" />
      </div>
      <StudentShell onboarding={onboarding}>
        {onboarding ? (
          <Onboarding
            initialProfile={profile}
            initialStep={
              requested.success
                ? requested.data
                : profile?.step === "done"
                  ? "year"
                  : profile?.step || "year"
            }
            hasResume={Boolean(resume)}
            editing={params.get("edit") === "1"}
          />
        ) : pathname === "/home" ? (
          <StudentHome profile={profile} resume={resume} />
        ) : pathname === "/upload" ? (
          <div className="demo-tools">
            <h1>Resume upload</h1>
            <p>
              Preview only: any selected file produces the same sample resume. No file is uploaded
              to a service.
            </p>
            <ResumeUpload
              onComplete={async () => {
                window.location.href = "/home"
              }}
            />
          </div>
        ) : (
          <div className="demo-tools">
            <h1>
              {pathname === "/dashboard"
                ? "Resume insights"
                : pathname === "/match"
                  ? "Job matching"
                  : pathname === "/profile"
                    ? "Resume & profile"
                    : "Existing application"}
            </h1>
            <p>
              This link connects to the existing Vistern application in the integrated branch. Its
              live data requires the team’s Clerk and AWS environment.
            </p>
            <a href="/home">Back to Home</a>
          </div>
        )}
      </StudentShell>
      <Toaster />
    </>
  )
}
createRoot(document.getElementById("root")!).render(<Preview />)
