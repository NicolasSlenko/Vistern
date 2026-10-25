import { StrictMode, useEffect, useState } from "react"
import { createRoot } from "react-dom/client"
import { ProfileStudio } from "../../src/components/resume-studio/profile-studio"
import { ResumeDocStudio } from "../../src/components/resume-studio/resume-doc-studio"
import { ResumeShelf } from "../../src/components/resume-studio/resume-shelf"
import { SAMPLE_BULLET_REVIEW, SAMPLE_DOCUMENTS, SAMPLE_PROFILE, SAMPLE_SUBMISSIONS } from "./sample"
import "../../src/app/globals.css"
import "./preview.css"

/**
 * A standalone look at the resume studio, with no Clerk, Supabase, S3 or
 * OpenAI behind it: scripts/studio-preview.mjs bundles this and serves it on
 * :4192. The routes the studio calls are answered from preview/studio/sample.ts.
 */

/** The width the "Wide" switch lays the studio out at: 1512px less the shell's 224px sidebar. */
const WIDE_PX = 1288

let profile = structuredClone(SAMPLE_PROFILE)
const documents = structuredClone(SAMPLE_DOCUMENTS)
let bulletReview: unknown = null

const reply = (body: unknown, wait = 260) =>
  new Promise<Response>((done) =>
    setTimeout(() => done(new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json" } })), wait),
  )

const realFetch = window.fetch.bind(window)
window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url
  const method = init?.method ?? "GET"

  if (url.startsWith("/api/profile")) {
    if (method === "POST") {
      profile = JSON.parse(String(init!.body))
      return reply({ success: true, data: profile }, 700)
    }
    return reply({ success: true, data: profile })
  }

  const document = url.match(/^\/api\/resume-documents\/([^/?]+)/)?.[1]
  if (document) {
    const found = documents.find((item) => item.id === document)
    if (!found) return reply({ success: false, error: "Resume not found" })
    if (method === "PATCH") {
      Object.assign(found, JSON.parse(String(init!.body)))
      return reply({ success: true, data: { id: found.id, score: found.score } }, 700)
    }
    return reply({ success: true, data: found }, 320)
  }
  if (url.startsWith("/api/resume-documents")) return reply({ success: true, data: documents }, 320)
  if (url.startsWith("/api/resume-submissions")) return reply({ success: true, data: SAMPLE_SUBMISSIONS }, 420)

  if (url.startsWith("/api/analyze/bullets")) {
    if (method === "POST") {
      bulletReview = SAMPLE_BULLET_REVIEW
      return reply({ success: true, data: bulletReview }, 2400)
    }
    return reply({ success: true, data: bulletReview }, 300)
  }
  // No real PDF to sign a URL for; the pane shows its stand-in page instead.
  if (url.startsWith("/api/resume-preview")) return reply({ success: false, error: "No file in the preview build." }, 600)
  if (url.startsWith("/api/analyze/xyz-batch")) return reply({ success: true, data: {} }, 2200)
  return realFetch(input as RequestInfo, init)
}

type View = "profile" | "shelf" | "resume"

const VIEWS: { id: View; label: string }[] = [
  { id: "profile", label: "Master profile" },
  { id: "shelf", label: "Shelf" },
  { id: "resume", label: "One resume" },
]

/**
 * The student shell's bars, drawn flat, so the studio sits in the room it
 * really gets. "Wide" lays it out at 1512px and scales it down to fit this
 * window: the studio's columns follow a container query, not the viewport,
 * so a scaled-up container shows the three-column layout honestly.
 */
function Preview() {
  const [dark, setDark] = useState(false)
  const [wide, setWide] = useState(false)
  const [view, setView] = useState<View>("resume")
  // scale() takes a number, and CSS can't divide one length by another, so
  // the factor is worked out here and handed over as a custom property.
  const [scale, setScale] = useState(1)

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark)
  }, [dark])
  useEffect(() => {
    const measure = () => setScale(Math.min(1, window.innerWidth / WIDE_PX))
    measure()
    window.addEventListener("resize", measure)
    return () => window.removeEventListener("resize", measure)
  }, [])

  return (
    <div className="preview-shell" data-wide={wide || undefined} style={{ "--preview-scale": scale } as React.CSSProperties}>
      <aside className="preview-sidebar">
        <span className="preview-brand">vistern</span>
        {["Home", "Career", "Community", "Resume", "Jobs"].map((item) => (
          <span key={item} data-current={item === "Resume" || undefined}>
            {item}
          </span>
        ))}
      </aside>
      <header className="preview-topbar">
        <span className="preview-views">
          {VIEWS.map((option) => (
            <button key={option.id} type="button" data-current={view === option.id || undefined} onClick={() => setView(option.id)}>
              {option.label}
            </button>
          ))}
        </span>
        <button type="button" onClick={() => setWide(!wide)}>
          {wide ? "Narrow" : "Wide (1512px)"}
        </button>
        <button type="button" onClick={() => setDark(!dark)}>
          {dark ? "Light mode" : "Dark mode"}
        </button>
      </header>
      <main className="preview-main">
        <div className="preview-stage">
          {view === "profile" ? <ProfileStudio /> : view === "shelf" ? <ResumeShelf /> : <ResumeDocStudio id={documents[0].id} />}
        </div>
      </main>
    </div>
  )
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Preview />
  </StrictMode>,
)
