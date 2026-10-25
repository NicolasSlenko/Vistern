import Link from "next/link"
import {
  ArrowRight,
  Check,
  ChevronRight,
  CircleCheck,
  Compass,
  FileText,
  Search,
  Sprout,
} from "lucide-react"
import "./public-home.css"
// The paper theme, loaded after so its variables and chrome win.
import "./public-home-theme.css"

const steps = [
  {
    number: "01",
    icon: FileText,
    title: "Start with your story",
    description: "Bring in a resume, review what was found, and keep the details that reflect your actual experience.",
  },
  {
    number: "02",
    icon: Compass,
    title: "See the next step",
    description: "Turn your courses, projects, and goals into a clear plan for this semester.",
  },
  {
    number: "03",
    icon: Search,
    title: "Apply with context",
    description: "Explore roles with evidence of your fit, save opportunities, and learn from each application.",
  },
]

export function PublicHome() {
  return (
    <div className="public-home">
      <a className="public-skip" href="#public-main">Skip to content</a>
      <header className="public-header">
        <div className="public-container public-header-inner">
          <Link className="public-brand" href="/" aria-label="Vistern home">
            <span className="public-brand-mark"><Sprout size={22} strokeWidth={2.2} /></span>
            <span>Vistern</span>
          </Link>
          <nav className="public-nav" aria-label="Main navigation">
            <a href="#how-it-works">How it works</a>
            <a href="#student-context">For students</a>
          </nav>
          <div className="public-header-actions">
            <Link className="public-login" href="/sign-in">Log in</Link>
            <Link className="public-button public-button-small" href="/sign-up">Get started <ArrowRight size={16} /></Link>
          </div>
        </div>
      </header>

      <main id="public-main">
        <section className="public-hero public-container">
          <div className="public-hero-copy">
            <div className="public-eyebrow"><span className="public-eyebrow-dot" /> Your internship journey, made clearer</div>
            <h1>Know what to do <em>next.</em></h1>
            <p className="public-hero-description">Your experience is more than a resume. Vistern helps you bring it together, see where you stand, and make steady progress toward the roles you want.</p>
            <div className="public-hero-actions">
              <Link className="public-button" href="/sign-up">Build your plan <ArrowRight size={18} /></Link>
              <a className="public-secondary-link" href="#how-it-works">See how it works <ChevronRight size={17} /></a>
            </div>
            <p className="public-hero-note"><CircleCheck size={16} /> Built around real student experience and verified details.</p>
          </div>

          <div className="public-preview-wrap" aria-label="Example of a student progress plan">
            <div className="public-preview-orbit public-preview-orbit-one" />
            <div className="public-preview-orbit public-preview-orbit-two" />
            <div className="public-preview">
              <div className="public-preview-top">
                <span className="public-preview-logo"><Sprout size={18} /></span>
                <span>YOUR SEMESTER</span>
                <span className="public-preview-dots" aria-hidden="true"><i /><i /><i /></span>
              </div>
              <div className="public-preview-body">
                <div className="public-preview-kicker">A clearer path forward</div>
                <h2>Make your next move count.</h2>
                <p>Small steps, connected to your bigger goal.</p>
                <div className="public-preview-focus">
                  <span className="public-preview-focus-icon"><Compass size={20} /></span>
                  <div><span className="public-preview-label">UP NEXT</span><strong>Strengthen your project story</strong><small>Add the result your work created.</small></div>
                  <ArrowRight size={17} />
                </div>
                <div className="public-preview-section-label">Your progress</div>
                <div className="public-preview-row"><span className="public-preview-check"><Check size={14} /></span><span>Resume reviewed</span><span>Done</span></div>
                <div className="public-preview-row"><span className="public-preview-check"><Check size={14} /></span><span>Experience verified</span><span>Done</span></div>
                <div className="public-preview-row public-preview-row-active"><span className="public-preview-open" /><span>Explore matching roles</span><ChevronRight size={16} /></div>
              </div>
            </div>
            <div className="public-floating-note"><span><CircleCheck size={18} /></span><div><strong>Your work, connected</strong><small>Resume · goals · opportunities</small></div></div>
          </div>
        </section>

        <section id="how-it-works" className="public-steps">
          <div className="public-container">
            <div className="public-section-heading"><span>HOW VISTERN WORKS</span><h2>From where you are to what&apos;s next.</h2><p>A place to understand your progress and keep moving, one decision at a time.</p></div>
            <div className="public-step-grid">
              {steps.map(({ number, icon: Icon, title, description }) => (
                <article className="public-step" key={number}>
                  <div className="public-step-top"><span>{number}</span><Icon size={22} strokeWidth={1.8} /></div>
                  <h3>{title}</h3><p>{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="student-context" className="public-context public-container">
          <div className="public-context-copy"><span>BUILT FOR STUDENT LIFE</span><h2>Your semester matters.</h2><p>Courses, projects, campus opportunities, and recruiting seasons all shape your path. Vistern keeps that context close, so your next steps make sense for where you are now.</p><Link href="/sign-up">Start with your experience <ArrowRight size={17} /></Link></div>
          <div className="public-context-art" aria-hidden="true"><div className="public-context-circle"><Sprout size={48} strokeWidth={1.3} /></div><span className="public-context-chip public-context-chip-one">Coursework</span><span className="public-context-chip public-context-chip-two">Projects</span><span className="public-context-chip public-context-chip-three">Recruiting</span></div>
        </section>

        <section className="public-closing"><div className="public-container"><h2>Progress starts with one clear step.</h2><p>Bring your experience. We&apos;ll help you see what comes next.</p><Link className="public-button public-button-light" href="/sign-up">Get started <ArrowRight size={18} /></Link></div></section>
      </main>

      <footer className="public-footer"><div className="public-container"><Link className="public-brand" href="/"><span className="public-brand-mark"><Sprout size={18} /></span><span>Vistern</span></Link><span>Built for the journey from student to professional.</span><Link href="/privacy">Privacy</Link></div></footer>
    </div>
  )
}
