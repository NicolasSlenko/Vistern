import Link from "next/link"
import { ArrowRight, ChevronRight, CircleCheck, Sprout } from "lucide-react"
import { LandingThemeToggle } from "./landing-theme-toggle"
import { HeroWindow } from "./motion/hero-window"
import { MarkupStory } from "./motion/markup-story"
import { GrowthStory } from "./motion/growth-story"
import { WorkspaceReel } from "./motion/workspace-reel"
import "../student/tree.css"
import "./public-home.css"
// The paper theme, loaded after so its variables and chrome win.
import "./public-home-theme.css"
// The scroll scenes and the app previews they show.
import "./landing-motion.css"

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
            <LandingThemeToggle />
            <Link className="public-login" href="/sign-in">Log in</Link>
            <Link className="public-button public-button-small" href="/sign-up">Get started <ArrowRight size={16} /></Link>
          </div>
        </div>
      </header>

      <main id="public-main">
        <section className="lm-hero" aria-labelledby="lm-hero-title">
          <div className="public-container lm-hero-copy">
            <div className="lm-hero-lede">
              <div className="public-eyebrow"><span className="public-eyebrow-dot" /> Your internship journey, made clearer</div>
              <h1 id="lm-hero-title">Know what to do <em>next.</em></h1>
            </div>
            <div className="lm-hero-side">
              <p className="public-hero-description">Your experience is more than a resume. Vistern helps you bring it together, see where you stand, and make steady progress toward the roles you want.</p>
              <div className="public-hero-actions">
                <Link className="public-button" href="/sign-up">Build your plan <ArrowRight size={18} /></Link>
                <a className="public-secondary-link" href="#how-it-works">See how it works <ChevronRight size={17} /></a>
              </div>
              <p className="public-hero-note"><CircleCheck size={16} /> Built around real student experience and verified details.</p>
            </div>
          </div>
          <div className="lm-hero-sky">
            <div className="public-container">
              <HeroWindow />
            </div>
          </div>
        </section>

        <MarkupStory />
        <GrowthStory />
        <WorkspaceReel />

        <section className="public-closing"><div className="public-container"><h2>Progress starts with one clear step.</h2><p>Bring your experience. We&apos;ll help you see what comes next.</p><Link className="public-button public-button-light" href="/sign-up">Get started <ArrowRight size={18} /></Link></div></section>
      </main>

      <footer className="public-footer"><div className="public-container"><Link className="public-brand" href="/"><span className="public-brand-mark"><Sprout size={18} /></span><span>Vistern</span></Link><span>Built for the journey from student to professional.</span><Link href="/privacy">Privacy</Link></div></footer>
    </div>
  )
}
