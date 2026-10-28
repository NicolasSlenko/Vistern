import type { ReactNode } from "react"
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Check,
  Compass,
  FileText,
  Home,
  PanelLeft,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Sprout,
  Star,
  Users,
  X,
} from "lucide-react"
import { GrowthTree } from "@/components/student/growth-tree"

/* Still pictures of the signed-in app, drawn from the same sample student the
   preview harnesses use (preview/studio/sample.ts). Nothing here is live: the
   landing page shows the product rather than describing it. */

export const STUDIO_W = 1280
export const STUDIO_H = 800

type Section = "Home" | "Career" | "Community" | "Resume" | "Jobs"

const NAV: { label: Section; icon: typeof Home }[] = [
  { label: "Home", icon: Home },
  { label: "Career", icon: Compass },
  { label: "Community", icon: Users },
  { label: "Resume", icon: FileText },
  { label: "Jobs", icon: Search },
]

/** The student shell: sidebar on paper, the sheet floating on the sky. */
export function AppWindow({ current, children }: { current: Section; children: ReactNode }) {
  return (
    <div className="lm-app" aria-hidden="true">
      <aside className="lm-app-side">
        <span className="lm-app-brand">
          <span><Sprout size={18} /></span>vistern
        </span>
        {NAV.map(({ label, icon: Icon }) => (
          <span key={label} className="lm-app-nav" data-current={label === current || undefined}>
            <Icon size={17} /> {label}
          </span>
        ))}
        <span className="lm-app-user">
          <i>AR</i> Alex Rivera
        </span>
      </aside>
      <div className="lm-app-desk">
        <div className="lm-app-frame">
          <div className="lm-app-sheet">{children}</div>
        </div>
      </div>
    </div>
  )
}

/** A hand-drawn squiggle under a line, in the ink of how much it matters. */
export function PenMark({ ink, className, style }: { ink: "fix" | "look" | "optional"; className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={`lm-pen ${className ?? ""}`} data-ink={ink} viewBox="0 0 200 8" preserveAspectRatio="none" style={style}>
      <path
        pathLength={1}
        d="M1 5 C 12 1, 18 8, 30 4 S 50 1, 62 5 S 84 8, 96 4 S 118 1, 130 5 S 152 8, 164 4 S 186 1, 199 5"
      />
    </svg>
  )
}

const RESUME_EXPERIENCE = [
  { text: "Worked on the data ingestion service with two other interns", ink: "fix" as const },
  { text: "Helped migrate reporting jobs off the legacy scheduler", ink: "fix" as const },
  { text: "Attended daily standups and wrote documentation", ink: "fix" as const },
  { text: "Shipped the ingestion rewrite a sprint early" },
]

/** The typeset resume page, as the studio's right column shows it. */
function ResumePage() {
  return (
    <div className="lm-doc">
      <h4>ALEX RIVERA</h4>
      <p className="lm-doc-contact">(352) 555-0148 · a.rivera@ufl.edu · linkedin.com/in/alexrivera · github.com/alexrivera</p>
      <h5>EDUCATION</h5>
      <p><b>University of Florida</b></p>
      <p><i>B.S., Computer Science, GPA: 3.74</i></p>
      <ul><li>Dean&apos;s List, four semesters</li><li>UF Honors Program</li></ul>
      <h5>EXPERIENCE</h5>
      <p><b>Software Engineering Intern</b></p>
      <p><i>Sabal Analytics</i></p>
      <ul>
        {RESUME_EXPERIENCE.map(({ text, ink }) => (
          <li key={text}>
            <span className="lm-doc-marked">
              {text}
              {ink && <PenMark ink={ink} />}
            </span>
          </li>
        ))}
      </ul>
      <p><b>Student Technician</b></p>
      <p><i>UF Computing Help Desk</i></p>
      <ul>
        <li>Resolved 40+ hardware and account tickets a week against a 24-hour SLA</li>
        <li>Wrote six runbooks that cut average triage time from 18 to 7 minutes</li>
      </ul>
      <h5>PROJECTS</h5>
      <p><b>Trailhead</b> | <i>Next.js, SQLite, Mapbox</i></p>
      <ul>
        <li>Cut first paint from 2.1s to 380ms by pre-rendering the map tiles a user already walked</li>
        <li>Built an offline sync layer that reconciles 10k waypoints without a server round trip</li>
      </ul>
      <p><b>Course Swap</b> | <i>Flask, Postgres</i></p>
      <ul>
        <li><span className="lm-doc-marked">Made a website where students can swap classes<PenMark ink="fix" /></span></li>
        <li><span className="lm-doc-marked">Used Flask and Postgres<PenMark ink="look" /></span></li>
      </ul>
      <h5>TECHNICAL SKILLS</h5>
      <p><b>Languages:</b> Python, TypeScript, Java, C</p>
      <p><b>Frameworks:</b> React, Next.js, Flask, pandas, NumPy, PyTorch</p>
    </div>
  )
}

const SUGGESTIONS = [
  {
    ink: "fix" as const,
    original: "Worked on the data ingestion service with two other interns",
    suggested: "Rebuilt the data ingestion service with two other interns, cutting nightly load time from 50 to 12 minutes",
    why: "“Worked on” says you were present, not what changed.",
  },
  {
    ink: "fix" as const,
    original: "Helped migrate reporting jobs off the legacy scheduler",
    suggested: "Migrated 14 reporting jobs off the legacy scheduler onto Airflow, retiring the last Cron box",
    why: "“Helped” hides your share. Name the count.",
  },
  {
    ink: "look" as const,
    original: "Used Flask and Postgres",
    suggested: "Modelled swap requests as a bipartite graph in Postgres, matching cycles of three in one query",
    why: "The stack is already listed. Show what you did with it.",
  },
]

const INK_LABEL = { fix: "Fix", look: "Worth a look", optional: "Optional" }

/** The resume studio in Suggestions mode: rewrites, wording, the marked-up page. */
export function StudioScreen() {
  return (
    <AppWindow current="Resume">
      <div className="lm-studio">
        <div className="lm-studio-bar">
          <span className="lm-icon-btn"><ArrowLeft size={16} /></span>
          <strong>alex-rivera-swe.pdf</strong>
          <span className="lm-icon-btn lm-ml-auto"><PanelLeft size={15} /></span>
          <span className="lm-seg">
            <span>Write</span>
            <span data-current><Sparkles size={14} /> Suggestions</span>
          </span>
          <span className="lm-icon-btn lm-star"><Star size={15} fill="currentColor" /></span>
          <span className="lm-ghost-btn"><RefreshCw size={14} /> Sync to profile</span>
          <span className="lm-brand-btn"><Sparkles size={14} /> Review bullets</span>
        </div>
        <div className="lm-studio-cols">
          <div className="lm-studio-suggest">
            <span className="label-mono">6 suggestions · 3 to fix</span>
            {SUGGESTIONS.map((item, index) => (
              <div className="lm-suggest" key={item.original} data-open={index === 0 || undefined}>
                <span className="lm-suggest-ink" data-ink={item.ink}>
                  <i /> {INK_LABEL[item.ink]}
                </span>
                <s>{item.original}</s>
                <p>{item.suggested}</p>
                {index === 0 && (
                  <>
                    <small>{item.why}</small>
                    <span className="lm-suggest-actions">
                      <span><Check size={14} /> Use this</span>
                      <span><X size={14} /></span>
                    </span>
                  </>
                )}
              </div>
            ))}
          </div>
          <div className="lm-studio-words">
            <h3>Experience</h3>
            <span className="lm-studio-count">2 entries</span>
            <div className="lm-entry">
              <strong>Sabal Analytics</strong> <span>· Software Engineering Intern</span>
              <small>2025-05 · 2025-08 · Tampa, FL</small>
            </div>
            <div className="lm-entry">
              <strong>UF Computing Help Desk</strong> <span>· Student Technician</span>
              <small>2024-01 · 2025-04 · Gainesville, FL</small>
            </div>
            <div className="lm-entry lm-entry-add"><Plus size={15} /> Add a role</div>
          </div>
          <div className="lm-studio-paper">
            <ResumePage />
          </div>
        </div>
      </div>
    </AppWindow>
  )
}

/** Home: the next thing to work on, and the tree that grows as a plan is done. */
export function HomeScreen() {
  return (
    <AppWindow current="Home">
      <div className="lm-page">
        <div className="lm-page-head">
          <h3>Home</h3>
          <span className="lm-link">Open my plan</span>
        </div>
        <div className="lm-home">
          <div className="lm-home-main">
            <div className="lm-card lm-home-hero">
              <small>Start with what interests you</small>
              <strong>What would you like to work on next?</strong>
              <p>You can develop a project, explore the work behind a career, or find people to learn with at UF.</p>
              <span className="lm-row">
                <span className="lm-brand-btn">Work on a project</span>
                <span className="lm-link">Explore career paths</span>
              </span>
            </div>
            <h4>Around UF</h4>
            <div className="lm-list-row"><i>acm</i><div><b>Meet other CS students</b><small>Computing groups and activities through UF ACM.</small></div></div>
            <div className="lm-list-row"><i>UF</i><div><b>Find a research starting point</b><small>Research opportunities and peer advising at UF.</small></div></div>
          </div>
          <div className="lm-home-side">
            <div className="lm-card lm-home-tree">
              <GrowthTree progress={72} compact decorative />
              <b>Your growth</b>
              <small>3 of 5 plan steps done this semester</small>
            </div>
            <h4>Your dates</h4>
            <div className="lm-date"><span>NOV<br /><b>04</b></span><div><b>Career fair</b><small>Reitz Union · bring 10 copies</small></div></div>
            <div className="lm-date"><span>NOV<br /><b>12</b></span><div><b>Mock interview</b><small>Career Connections Center</small></div></div>
          </div>
        </div>
      </div>
    </AppWindow>
  )
}

const TRACKS = [
  ["Software engineering", "Build the apps and tools people use."],
  ["Data & AI", "Turn messy information into useful answers."],
  ["Cybersecurity", "Understand systems and help protect them."],
  ["Product & UX", "Figure out what to build and make it easier to use."],
]

/** Career: tracks, then the stages of the one chosen. */
export function CareerScreen() {
  return (
    <AppWindow current="Career">
      <div className="lm-page">
        <div className="lm-page-head">
          <div>
            <h3>Career</h3>
            <p>Keep your work, learning, and preparation together.</p>
          </div>
          <span className="lm-ghost-btn">Add an activity</span>
        </div>
        <span className="label-mono lm-brand-text">Choose your direction</span>
        <strong className="lm-display">A roadmap built around your path.</strong>
        <div className="lm-tracks">
          {TRACKS.map(([title, body], index) => (
            <div className="lm-card lm-track" key={title} data-current={index === 0 || undefined}>
              <span className="label-mono">Track 0{index + 1} <ArrowRight size={13} /></span>
              <b>{title}</b>
              <small>{body}</small>
            </div>
          ))}
        </div>
        <div className="lm-stages">
          {["Learn the fundamentals", "Ship a project", "Get it reviewed", "Apply"].map((stage, index) => (
            <span key={stage} data-done={index < 2 || undefined} data-current={index === 2 || undefined}>
              <i>{index < 2 ? <Check size={12} /> : index + 1}</i>
              {stage}
            </span>
          ))}
        </div>
      </div>
    </AppWindow>
  )
}

const JOBS: Record<string, [string, string, number][]> = {
  Saved: [["Software Engineering Intern", "Northwind Labs", 86], ["Data Engineering Intern", "Bayfront Data", 79]],
  Applied: [["SWE Intern, Summer 2027", "Palmetto Systems", 82], ["Platform Intern", "Coastline Health", 74]],
  Interviewing: [["Backend Intern", "Sabal Analytics", 88]],
  Offer: [],
}

/** Jobs: saved roles and where each one stands. */
export function JobsScreen() {
  return (
    <AppWindow current="Jobs">
      <div className="lm-page">
        <div className="lm-page-head">
          <div>
            <h3>Applications</h3>
            <p>Saved roles and <em>where each one stands</em>.</p>
          </div>
        </div>
        <div className="lm-stats">
          {[["Saved roles", 5], ["In progress", 3], ["Interviews", 1], ["Offers", 0]].map(([label, value]) => (
            <div key={label}><span className="label-mono">{label}</span><b>{value}</b></div>
          ))}
        </div>
        <div className="lm-board">
          {Object.entries(JOBS).map(([stage, jobs]) => (
            <div className="lm-board-col" key={stage}>
              <span className="label-mono">{stage} · {jobs.length}</span>
              {jobs.map(([title, company, match]) => (
                <div className="lm-card lm-job" key={title}>
                  <b>{title}</b>
                  <small><Briefcase size={12} /> {company}</small>
                  <span className="lm-match">{match}% match</span>
                </div>
              ))}
              {jobs.length === 0 && <div className="lm-board-empty">Nothing here yet</div>}
            </div>
          ))}
        </div>
      </div>
    </AppWindow>
  )
}

/** The master profile: one record of what the student has done. */
export function ProfileScreen() {
  const sections: [string, number][] = [["Profile", 0], ["Education", 1], ["Experience", 2], ["Projects", 2], ["Skills", 18], ["Awards", 1], ["Activities", 1]]
  return (
    <AppWindow current="Resume">
      <div className="lm-profile">
        <div className="lm-profile-nav">
          <span className="label-mono">Master profile</span>
          {sections.map(([label, count]) => (
            <span key={label} data-current={label === "Projects" || undefined}>
              {label}
              {count ? <i>{count}</i> : null}
            </span>
          ))}
        </div>
        <div className="lm-profile-body">
          <h3>Projects</h3>
          <span className="lm-studio-count">2 entries · merged from 3 uploads</span>
          <div className="lm-card lm-profile-entry">
            <b>Trailhead</b>
            <small>Next.js · SQLite · Mapbox</small>
            <ul>
              <li>Cut first paint from 2.1s to 380ms by pre-rendering the map tiles a user already walked</li>
              <li>Built an offline sync layer that reconciles 10k waypoints without a server round trip</li>
            </ul>
          </div>
          <div className="lm-card lm-profile-entry">
            <b>Course Swap</b>
            <small>Flask · Postgres</small>
            <ul>
              <li>Built a section-swap matcher that pairs students with conflicting schedules in one step</li>
            </ul>
          </div>
        </div>
      </div>
    </AppWindow>
  )
}
