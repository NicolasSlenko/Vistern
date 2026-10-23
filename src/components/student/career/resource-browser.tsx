import Link from "next/link"
import { ArrowRight, ArrowUpRight, BookOpen, Check, Code2, Compass } from "lucide-react"
import { careers, guides } from "@/lib/career/catalog"
import { undergradPaths, type UndergradPath } from "@/lib/career/undergrad-paths"
import { activityDraft, sourceDraft } from "@/lib/career/templates"
import type { ActivityFields } from "@/lib/career/workspace"

export function ResourceBrowser({
  view,
  resource,
  onChoose,
}: {
  view: string
  resource?: string
  onChoose: (draft: ActivityFields) => void
}) {
  if (view === "practice") return <PracticeView onChoose={onChoose} />

  if (view === "guides") {
    const guide = guides.find((guide) => guide.id === resource)
    return guide ? <GuideDetail guide={guide} onChoose={onChoose} /> : <GuideIndex />
  }
  const career = careers.find((career) => career.id === resource)
  const path = undergradPaths.find((item) => item.id === resource)
  if (path && career) return <PathDetail path={path} career={career} onChoose={onChoose} />
  if (career)
    return (
      <article className="career-reading">
        <Link className="student-text-link" href="/career?view=explore">
          All careers
        </Link>
        <h2>{career.name}</h2>
        <p className="career-reading-intro">{career.daily}</p>
        <section>
          <h3>Useful foundations</h3>
          <ul>
            {career.skills.map((skill) => (
              <li key={skill}>{skill}</li>
            ))}
          </ul>
        </section>
        <section>
          <h3>A way to try the work</h3>
          <p>{career.experiment}</p>
        </section>
        <div className="career-actions">
          <button
            className="student-button"
            onClick={() =>
              onChoose({
                ...sourceDraft({ type: "career", id: career.id }),
                notes: career.experiment,
              })
            }
          >
            Add an exploration activity
          </button>
          <a
            className="student-text-link"
            href={career.roadmap}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open learning roadmap
          </a>
        </div>
        <Link className="student-text-link" href="/community">
          Find people to learn with
        </Link>
      </article>
    )
  return (
    <section className="career-paths">
      <div className="career-paths-intro">
        <div>
          <span className="career-eyebrow">Explore your direction</span>
          <h2>Four paths. Many ways to begin.</h2>
          <p>Choose a kind of work that sounds interesting. Each path starts with practical steps you can try during college.</p>
        </div>
        <span className="career-paths-count">01 — 04 / UNDERGRAD PATHS</span>
      </div>
      <div className="career-path-grid">
        {undergradPaths.map((path) => (
          <Link
            key={path.id}
            className="career-path-card"
            href={`/career?view=explore&resource=${path.id}`}
          >
            <div className="career-path-card-top"><span>PATH {path.number}</span><ArrowUpRight size={20} aria-hidden="true" /></div>
            <h3>{path.title}</h3>
            <p>{path.short}</p>
            <div className="career-path-card-bottom"><span>{path.roles.join("  ·  ")}</span><strong>Explore path <ArrowRight size={16} aria-hidden="true" /></strong></div>
          </Link>
        ))}
      </div>
      <div className="career-paths-footnote"><Compass size={19} aria-hidden="true" /><p>You don’t need to commit today. Try one small project, then compare what you enjoyed.</p></div>
    </section>
  )
}

function GuideIndex() {
  const startingIds = new Set(["careers", "projects", "internships", "coding"])
  const starting = guides.filter((guide) => startingIds.has(guide.id))
  const further = guides.filter((guide) => !startingIds.has(guide.id))
  const cards = (items: typeof guides) => (
    <div className="career-guide-grid">
      {items.map((guide, index) => (
        <Link key={guide.id} className="career-guide-card" href={`/career?view=guides&resource=${guide.id}`}>
          <span className="career-eyebrow">GUIDE {String(index + 1).padStart(2, "0")}</span>
          <BookOpen size={21} aria-hidden="true" />
          <h3>{guide.title}</h3>
          <p>{guide.intro}</p>
          <strong>Read guide <ArrowRight size={16} aria-hidden="true" /></strong>
        </Link>
      ))}
    </div>
  )
  return (
    <section className="career-guides">
      <header className="career-resource-hero">
        <span className="career-eyebrow">A little guidance goes a long way</span>
        <h2>Good questions to ask next.</h2>
        <p>Short guides for the decisions students actually face: what to try, where to learn, and how to turn experience into evidence.</p>
      </header>
      <div className="career-guide-section-head"><h3>Start here</h3><span>01 / FOUNDATIONS</span></div>
      {cards(starting)}
      <div className="career-guide-section-head"><h3>Go further</h3><span>02 / OPPORTUNITIES</span></div>
      {cards(further)}
    </section>
  )
}

function GuideDetail({
  guide,
  onChoose,
}: {
  guide: (typeof guides)[number]
  onChoose: (draft: ActivityFields) => void
}) {
  return (
    <article className="career-guide-detail">
      <Link className="career-back-link" href="/career?view=guides">← All guides</Link>
      <header className="career-resource-hero">
        <span className="career-eyebrow">CAREER GUIDE / {guide.sections.length} SHORT SECTIONS</span>
        <h2>{guide.title}</h2>
        <p>{guide.intro}</p>
        <button className="student-button" onClick={() => onChoose(sourceDraft({ type: "guide", id: guide.id }))}>
          Add to my plan <ArrowRight size={16} aria-hidden="true" />
        </button>
      </header>
      <div className="career-guide-detail-layout">
        <div className="career-guide-sections">
          {guide.sections.map(([title, detail], index) => (
            <section key={title}>
              <span className="career-eyebrow">{String(index + 1).padStart(2, "0")}</span>
              <div><h3>{title}</h3><p>{detail}</p></div>
            </section>
          ))}
        </div>
        <aside className="career-guide-resources">
          <span className="career-eyebrow">Keep exploring</span>
          <h3>Helpful resources</h3>
          {guide.resources.map(([title, description, href]) => (
            <a key={href} href={href} target="_blank" rel="noopener noreferrer">
              <strong>{title} <ArrowUpRight size={15} aria-hidden="true" /></strong>
              <span>{description}</span>
            </a>
          ))}
        </aside>
      </div>
    </article>
  )
}

function PracticeView({ onChoose }: { onChoose: (draft: ActivityFields) => void }) {
  const routine = [
    ["Choose one pattern", "Pick a topic that connects to class or an interview goal. Start with a problem you can discuss."],
    ["Work it through", "Try it yourself, explain the approach aloud, and check edge cases before reading a solution."],
    ["Write down the lesson", "Record what was hard and what you would recognize faster next time."],
  ]
  return (
    <section className="career-practice">
      <header className="career-resource-hero career-practice-hero">
        <span className="career-eyebrow">Coding practice / a useful routine</span>
        <h2>Practice with purpose.</h2>
        <p>A focused session is more valuable than a long streak. Choose one idea, solve deliberately, and keep a note you can return to.</p>
        <button className="student-button" onClick={() => onChoose({
          ...activityDraft("practice"),
          title: "Practice one coding pattern",
          steps: routine.map(([title]) => ({ title, done: false })),
        })}>Plan a practice session <ArrowRight size={16} aria-hidden="true" /></button>
      </header>
      <div className="career-practice-layout">
        <div>
          <div className="career-guide-section-head"><h3>A simple session</h3><span>01 / REPEATABLE</span></div>
          <ol className="career-practice-routine">
            {routine.map(([title, detail], index) => <li key={title}><span>{String(index + 1).padStart(2, "0")}</span><div><h4>{title}</h4><p>{detail}</p></div></li>)}
          </ol>
        </div>
        <aside className="career-practice-resources">
          <Code2 size={24} aria-hidden="true" />
          <span className="career-eyebrow">Pick a resource</span>
          <a href="https://neetcode.io/roadmap" target="_blank" rel="noopener noreferrer"><strong>NeetCode roadmap <ArrowUpRight size={16} aria-hidden="true" /></strong><span>Topics, problems, and explanations</span></a>
          <a href="https://leetcode.com/studyplan/" target="_blank" rel="noopener noreferrer"><strong>LeetCode study plans <ArrowUpRight size={16} aria-hidden="true" /></strong><span>Structured problem sets</span></a>
          <Link href="/career?view=guides&resource=coding">Why practice matters <ArrowRight size={16} aria-hidden="true" /></Link>
        </aside>
      </div>
    </section>
  )
}

function PathDetail({
  path,
  career,
  onChoose,
}: {
  path: UndergradPath
  career: (typeof careers)[number]
  onChoose: (draft: ActivityFields) => void
}) {
  return (
    <article className="career-path-detail">
      <Link className="career-back-link" href="/career?view=explore">← All paths</Link>
      <header className="career-path-detail-hero">
        <div>
          <span className="career-eyebrow">PATH {path.number} / UNDERGRAD ROADMAP</span>
          <h2>{path.title}</h2>
          <p>{path.short} {path.focus}</p>
          <div className="career-path-role-tags" aria-label="Possible roles">{path.roles.map((role) => <span key={role}>{role}</span>)}</div>
        </div>
        <button
          className="student-button"
          onClick={() => onChoose({
            ...sourceDraft({ type: "career", id: path.id }),
            title: `Explore ${path.title}`,
            notes: path.project,
            steps: path.steps.map((step) => ({ title: step.title, done: false })),
          })}
        >
          Add path to my plan <ArrowRight size={17} aria-hidden="true" />
        </button>
      </header>
      <div className="career-path-detail-layout">
        <div className="career-roadmap">
          <div className="career-roadmap-heading"><span className="career-eyebrow">Your first moves</span><span>4 practical stages</span></div>
          <ol className="career-roadmap-list">
            {path.steps.map((step, index) => (
              <li key={step.title}>
                <span className="career-roadmap-number">{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.detail}</p>
                  <div className="career-roadmap-proof"><Check size={15} aria-hidden="true" /><span>Something to show: {step.proof}</span></div>
                </div>
              </li>
            ))}
          </ol>
          <div className="career-path-checkpoint">
            <span className="career-eyebrow">Remember</span>
            <h3>Start before you feel ready.</h3>
            <p>A class project, campus club, research group, or small independent build can give you experience to discuss. You can explore multiple paths.</p>
            <Link href={`/career?view=projects&resource=${path.id}`}>Browse projects for this path <ArrowRight size={16} aria-hidden="true" /></Link>
          </div>
        </div>
        <aside className="career-path-sidebar">
          <section><span className="career-eyebrow">Useful foundations</span><ul>{path.foundations.map((item) => <li key={item}>{item}</li>)}</ul></section>
          <section><span className="career-eyebrow">A project to try</span><p>{path.project}</p><Link href={`/career?view=projects&resource=${path.id}`}>See project ideas <ArrowRight size={15} aria-hidden="true" /></Link></section>
          <section><span className="career-eyebrow">What the work is like</span><p>{career.daily}</p></section>
          <a href={career.roadmap} target="_blank" rel="noopener noreferrer">See a deeper roadmap <ArrowUpRight size={16} aria-hidden="true" /></a>
        </aside>
      </div>
    </article>
  )
}
