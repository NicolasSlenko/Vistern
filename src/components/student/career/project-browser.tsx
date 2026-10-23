"use client"

import Link from "next/link"
import { useState } from "react"
import { Accessibility, ArrowLeft, ArrowRight, ArrowUpRight, BriefcaseBusiness, CalendarDays, ChartNoAxesCombined, CloudSun, Code2, KeyRound, Link2, ListTodo, LockKeyhole, MapPinned, MessagesSquare, Network, NotebookPen, NotebookTabs, PanelsTopLeft, ScanEye, Search, SearchCheck, ShieldCheck } from "lucide-react"
import { careerProjectDraft, careerProjects, projectLevels, projectPaths, type CareerProject } from "@/lib/career/projects"
import type { ActivityFields } from "@/lib/career/workspace"

const pathIcons = {
  fullstack: Code2,
  data: ChartNoAxesCombined,
  cyber: ShieldCheck,
  product: PanelsTopLeft,
} as const

const projectIcons = {
  "campus-portfolio": BriefcaseBusiness,
  "student-task-board": ListTodo,
  "weather-dashboard": CloudSun,
  "short-link-api": Link2,
  "notes-cli": NotebookPen,
  "realtime-study-chat": MessagesSquare,
  "public-data-story": ChartNoAxesCombined,
  "study-flashcards": NotebookTabs,
  "photo-classifier": ScanEye,
  "notes-search": SearchCheck,
  "password-safety": KeyRound,
  "lab-network-inventory": Network,
  "private-chat-design": LockKeyhole,
  "campus-service-finder": MapPinned,
  "accessible-course-page": Accessibility,
  "club-event-discovery": CalendarDays,
} as const

function pathLabel(id: CareerProject["path"]) {
  return projectPaths.find((path) => path.id === id)?.label || id
}

export function ProjectBrowser({
  resource,
  onChoose,
}: {
  resource?: string
  onChoose: (draft: ActivityFields) => void
}) {
  const [path, setPath] = useState<(typeof projectPaths)[number]["id"]>(() => projectPaths.find((item) => item.id === resource)?.id || "all")
  const [level, setLevel] = useState<(typeof projectLevels)[number]>("All levels")
  const [query, setQuery] = useState("")
  const selected = careerProjects.find((project) => project.id === resource)

  if (selected) return <ProjectDetail project={selected} onChoose={onChoose} />

  const filtered = careerProjects.filter((project) => {
    const matchesPath = path === "all" || project.path === path
    const matchesLevel = level === "All levels" || project.level === level
    const text = `${project.title} ${project.summary} ${project.tools.join(" ")}`.toLowerCase()
    return matchesPath && matchesLevel && text.includes(query.trim().toLowerCase())
  })

  return (
    <section className="career-projects">
      <header className="career-projects-hero">
        <span className="career-eyebrow">Projects / turn learning into proof</span>
        <div className="career-projects-hero-row">
          <div>
            <h2>Build something real.</h2>
            <p>Pick a small build, make it your own, and leave with work you can show. Each project has a clear outcome and a starting plan.</p>
          </div>
          <span className="career-projects-total">{String(careerProjects.length).padStart(2, "0")} IDEAS<br />04 PATHS</span>
        </div>
      </header>

      <div className="career-project-controls">
        <div className="career-project-control-group" role="group" aria-label="Filter by career path">
          <span className="career-project-control-label">For your path</span>
          <div className="career-project-pills">
            {projectPaths.map((item) => (
              <button key={item.id} type="button" aria-pressed={path === item.id} onClick={() => setPath(item.id)}>{item.label}</button>
            ))}
          </div>
        </div>
        <div className="career-project-control-bottom">
          <div className="career-project-control-group" role="group" aria-label="Filter by difficulty">
            <span className="career-project-control-label">By level</span>
            <div className="career-project-pills">
              {projectLevels.map((item) => (
                <button key={item} type="button" aria-pressed={level === item} onClick={() => setLevel(item)}>{item}</button>
              ))}
            </div>
          </div>
          <label className="career-project-search">
            <Search size={17} aria-hidden="true" />
            <span className="sr-only">Search projects</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search projects or skills" />
          </label>
        </div>
      </div>

      <p className="career-project-results" role="status">{filtered.length} {filtered.length === 1 ? "project" : "projects"} to explore</p>
      {filtered.length ? (
        <div className="career-project-sections">
          {(["Starter", "Stretch"] as const).map((section) => {
            const items = filtered.filter((project) => project.level === section)
            return items.length ? (
              <section key={section} aria-label={`${section} projects`}>
                <div className="career-project-section-heading">
                  <div><h3>{section}</h3><span>{String(items.length).padStart(2, "0")}</span></div>
                  <p>{section === "Starter" ? "Approachable builds for a strong first portfolio piece." : "A bigger challenge once you have the basics."}</p>
                </div>
                <div className="career-project-grid">
                  {items.map((project) => <ProjectCard key={project.id} project={project} />)}
                </div>
              </section>
            ) : null
          })}
        </div>
      ) : (
        <div className="career-project-empty">
          <h3>No projects match those filters.</h3>
          <p>Try another path, level, or search term.</p>
          <button type="button" className="student-text-link" onClick={() => { setPath("all"); setLevel("All levels"); setQuery("") }}>Clear filters</button>
        </div>
      )}
      <div className="career-project-custom">
        <div><span className="career-eyebrow">Your own idea</span><h3>Have a project already in mind?</h3><p>Start from classwork, keep improving an existing build, or sketch something new.</p></div>
        <Link href="/career?view=build">Create your own plan <ArrowRight size={17} aria-hidden="true" /></Link>
      </div>
    </section>
  )
}

function ProjectCard({ project }: { project: CareerProject }) {
  const Icon = projectIcons[project.id as keyof typeof projectIcons] || pathIcons[project.path]
  return (
    <Link className="career-project-card" href={`/career?view=projects&resource=${project.id}`}>
      <div className={`career-project-art career-project-art-${project.path}`} aria-hidden="true">
        <span className="career-project-art-grid" />
        <span className="career-project-art-orbit" />
        <Icon size={62} strokeWidth={1.4} />
        <span className="career-project-art-index">{project.id.slice(0, 3).toUpperCase()}</span>
      </div>
      <div className="career-project-card-content">
        <div className="career-project-card-meta"><span>{pathLabel(project.path)}</span><ArrowUpRight size={17} aria-hidden="true" /></div>
        <h4>{project.title}</h4>
        <p>{project.summary}</p>
        <div className="career-project-card-footer"><span>{project.tools[0]}</span><span>{project.time}</span></div>
      </div>
    </Link>
  )
}

function ProjectDetail({ project, onChoose }: { project: CareerProject; onChoose: (draft: ActivityFields) => void }) {
  const Icon = pathIcons[project.path]
  return (
    <article className="career-project-detail">
      <Link className="career-back-link" href="/career?view=projects"><ArrowLeft size={16} aria-hidden="true" /> All projects</Link>
      <div className="career-project-detail-hero">
        <div>
          <span className="career-eyebrow">{pathLabel(project.path)} / {project.level} project</span>
          <h2>{project.title}</h2>
          <p>{project.summary}</p>
          <div className="career-project-detail-meta"><span>{project.time}</span>{project.tools.map((tool) => <span key={tool}>{tool}</span>)}</div>
          <button type="button" className="student-button" onClick={() => onChoose(careerProjectDraft(project))}>Add to my plan <ArrowRight size={17} aria-hidden="true" /></button>
        </div>
        <div className={`career-project-detail-art career-project-art-${project.path}`} aria-hidden="true"><Icon size={88} strokeWidth={1.2} /><span>{project.level.toUpperCase()}</span></div>
      </div>
      <div className="career-project-detail-layout">
        <section>
          <span className="career-eyebrow">01 / The outcome</span>
          <h3>What you will have to show</h3>
          <p>{project.outcome}</p>
          <span className="career-eyebrow career-project-steps-label">02 / The build plan</span>
          <h3>Start with these steps</h3>
          <ol className="career-project-steps">{project.steps.map((step, index) => <li key={step}><span>{String(index + 1).padStart(2, "0")}</span><p>{step}</p></li>)}</ol>
        </section>
        <aside className="career-project-detail-aside">
          <span className="career-eyebrow">Make it yours</span>
          <p>Choose a subject, audience, or dataset that matters to you. Keep the first version small, then document your decisions and what you learned.</p>
          {project.inspiration && <a href={project.inspiration} target="_blank" rel="noopener noreferrer">View original project inspiration <ArrowUpRight size={15} aria-hidden="true" /></a>}
          <Link href={`/career?view=explore&resource=${project.path}`}>Explore the {pathLabel(project.path)} path <ArrowRight size={15} aria-hidden="true" /></Link>
        </aside>
      </div>
    </article>
  )
}
