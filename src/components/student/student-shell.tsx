"use client"

import Link from "next/link"
import dynamic from "next/dynamic"
import { usePathname } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { SignOutButton } from "@clerk/nextjs"
import { useTheme } from "next-themes"
import {
  Home,
  Compass,
  Users,
  FileText,
  Search,
  Settings,
  Sprout,
  Menu,
  X,
  UserRound,
  ChevronRight,
  ChevronDown,
  Moon,
  Sun,
} from "lucide-react"
import { careerNavigationEvent, navigateCareer } from "@/lib/career/navigation"
import "./student.css"
// The paper theme, loaded after so its variables and chrome win.
import "./student-theme.css"

// Clerk's account widget needs the browser session; keep its server placeholder stable.
const UserButton = dynamic(
  () => import("@clerk/nextjs").then((module) => module.UserButton),
  {
    ssr: false,
    loading: () => (
      <span className="student-avatar-placeholder" aria-hidden="true" />
    ),
  },
)

const links = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/career", label: "Career", icon: Compass },
  { href: "/community", label: "Community", icon: Users },
  { href: "/profile", label: "Resume", icon: FileText },
  { href: "/jobs", label: "Jobs", icon: Search },
]
const resumePages = [
  { href: "/profile", label: "Master profile" },
  { href: "/resumes", label: "My resumes" },
  { href: "/dashboard", label: "Resume feedback" },
  { href: "/upload", label: "Upload resume" },
]
const careerPages = [
  { href: "/career", label: "My plan" },
  { href: "/career?view=explore", label: "Career paths" },
  { href: "/career?view=projects", label: "Projects" },
  { href: "/career?view=guides", label: "Career guides" },
  { href: "/career?view=practice", label: "Coding practice" },
]
const communityPages = [
  { href: "/community", label: "Campus directory" },
  { href: "/community/feed", label: "Community feed" },
  { href: "/community/people", label: "People" },
  { href: "/community/sessions", label: "Sessions" },
  { href: "/community/messages", label: "Messages" },
]
const jobsPages = [
  { href: "/jobs", label: "Browse jobs" },
  { href: "/jobs/applications", label: "Applications" },
]
const sectionPages: Record<string, { href: string; label: string }[]> = {
  "/career": careerPages,
  "/community": communityPages,
  "/profile": resumePages,
  "/jobs": jobsPages,
}
const expandedStorageKey = "vistern-sidebar-expanded"

export function StudentShell({
  children,
  onboarding = false,
  activeSubpage,
}: {
  children: React.ReactNode
  onboarding?: boolean
  activeSubpage?: string
}) {
  const pathname = usePathname()
  const activeHref = resumePages.some((page) => page.href === pathname) || pathname.startsWith("/resumes/")
    ? "/profile"
    : pathname === "/match"
      ? "/jobs"
      : pathname.startsWith("/community/")
        ? "/community"
        : pathname.startsWith("/jobs/")
          ? "/jobs"
          : pathname
  const [careerSubpage, setCareerSubpage] = useState(activeSubpage || "plan")
  const isCurrentSubpage = (href: string) => activeHref === "/career" && activeSubpage
    ? (href === "/career" ? ["plan", "build", "history"].includes(careerSubpage) : href.endsWith(`view=${careerSubpage}`))
    : pathname === href
  const [open, setOpen] = useState(false)
  const [expandedSections, setExpandedSections] = useState<string[]>(
    sectionPages[activeHref] ? [activeHref] : [],
  )
  const [restoredSections, setRestoredSections] = useState(false)
  const menu = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    try {
      const stored = JSON.parse(sessionStorage.getItem(expandedStorageKey) || "null")
      if (Array.isArray(stored)) {
        const sections = stored.filter((href): href is string => typeof href === "string" && href in sectionPages)
        setExpandedSections(sectionPages[activeHref] && !sections.includes(activeHref) ? [...sections, activeHref] : sections)
      }
    } catch { /* Keep the current section open if saved navigation state is unavailable. */ }
    setRestoredSections(true)
  }, [activeHref])
  useEffect(() => {
    if (restoredSections) sessionStorage.setItem(expandedStorageKey, JSON.stringify(expandedSections))
  }, [expandedSections, restoredSections])
  useEffect(() => setCareerSubpage(activeSubpage || "plan"), [activeSubpage])
  useEffect(() => {
    const updateCareerSubpage = () => setCareerSubpage(new URLSearchParams(window.location.search).get("view") || "plan")
    window.addEventListener(careerNavigationEvent, updateCareerSubpage)
    window.addEventListener("popstate", updateCareerSubpage)
    return () => {
      window.removeEventListener(careerNavigationEvent, updateCareerSubpage)
      window.removeEventListener("popstate", updateCareerSubpage)
    }
  }, [])
  function toggleSection(href: string) {
    setExpandedSections((current) => current.includes(href)
      ? current.filter((entry) => entry !== href)
      : [...current, href])
  }
  function closeMenu() {
    setOpen(false)
    menu.current?.focus()
  }
  return (
    <div
      className={`student-app ${onboarding ? "student-entry" : "student-workspace"}`}
      onKeyDown={(event) => {
        if (open && event.key === "Escape") closeMenu()
      }}
      onClickCapture={(event) => {
        if (pathname !== "/career" || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
        const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null
        if (!anchor || anchor.hasAttribute("download") || anchor.getAttribute("target") === "_blank") return
        const destination = new URL((anchor as HTMLAnchorElement).href)
        if (destination.origin !== window.location.origin || destination.pathname !== "/career") return
        event.preventDefault()
        event.stopPropagation()
        setOpen(false)
        if (destination.href !== window.location.href) navigateCareer(destination.href)
      }}
    >
      <a href="#student-main" className="student-skip">
        Skip to content
      </a>
      {onboarding ? (
        <header className="student-entry-header">
          <Brand />
          <AccountControls />
        </header>
      ) : (
        <>
          <aside className="student-sidebar">
            <Brand />
            <nav aria-label="Main navigation">
              {links.map(({ href, label, icon: Icon }) => {
                const pages = sectionPages[href]
                const expanded = expandedSections.includes(href)
                return <div className="student-nav-section" key={href}>
                  {pages ? <button type="button" className="student-nav-disclosure" aria-current={href === activeHref ? "page" : undefined} aria-expanded={expanded} aria-controls={`student-subnav-${href.slice(1)}`} onClick={() => toggleSection(href)}><Icon size={19} /><span>{label}</span><ChevronDown size={15} aria-hidden="true" /></button>
                    : <Link href={href} aria-current={href === activeHref ? "page" : undefined}><Icon size={19} />{label}</Link>}
                  {pages && expanded && <div id={`student-subnav-${href.slice(1)}`} className="student-subnav">{pages.map((page) => <Link key={page.href} href={page.href} aria-current={isCurrentSubpage(page.href) ? "page" : undefined}>{page.label}</Link>)}</div>}
                </div>
              })}
            </nav>
            <div className="student-account-nav">
              <Link href="/settings">
                <Settings size={17} />
                Settings
              </Link>
            </div>
            <Link className="student-sidebar-bottom" href="/student-profile" aria-current={pathname === "/student-profile" ? "page" : undefined}>
              <UserRound size={19} />
              <span>Student profile</span>
              <ChevronRight size={16} />
            </Link>
          </aside>
          <header className="student-topbar">
            <button
              type="button"
              ref={menu}
              className="student-menu"
              aria-expanded={open}
              aria-controls="student-mobile-nav"
              onClick={() => setOpen(!open)}
            >
              {open ? <X size={21} /> : <Menu size={21} />}
              <span>Menu</span>
            </button>
            <AccountControls />
          </header>
          {open && (
            <nav
              id="student-mobile-nav"
              className="student-mobile-nav"
              aria-label="Mobile navigation"
            >
              {links.map(({ href, label, icon: Icon }) => {
                const pages = sectionPages[href]
                const expanded = expandedSections.includes(href)
                return <div className="student-mobile-nav-section" key={href}>
                  {pages ? <button type="button" className="student-nav-disclosure" aria-current={href === activeHref ? "page" : undefined} aria-expanded={expanded} aria-controls={`student-mobile-subnav-${href.slice(1)}`} onClick={() => toggleSection(href)}><Icon size={18} /><span>{label}</span><ChevronDown size={15} aria-hidden="true" /></button>
                    : <Link href={href} onClick={closeMenu} aria-current={href === activeHref ? "page" : undefined}><Icon size={18} />{label}</Link>}
                  {pages && expanded && <div id={`student-mobile-subnav-${href.slice(1)}`} className="student-mobile-subnav">{pages.map((page) => <Link key={page.href} href={page.href} onClick={closeMenu} aria-current={isCurrentSubpage(page.href) ? "page" : undefined}>{page.label}</Link>)}</div>}
                </div>
              })}
              <Link href="/settings" onClick={closeMenu}>
                Settings
              </Link>
              <Link href="/student-profile" onClick={closeMenu} aria-current={pathname === "/student-profile" ? "page" : undefined}>
                Student profile
              </Link>
            </nav>
          )}
        </>
      )}
      <main id="student-main" tabIndex={-1} className="student-main">
        {children}
      </main>
    </div>
  )
}

function Brand() {
  return (
    <Link className="student-brand" href="/home" aria-label="Vistern home">
      <span>
        <Sprout size={24} strokeWidth={1.7} />
      </span>
      vistern
    </Link>
  )
}

function AccountControls() {
  return (
    <div className="student-account">
      <ThemeToggle />
      <UserButton />
      <SignOutButton redirectUrl="/">
        <button type="button">Sign out</button>
      </SignOutButton>
    </div>
  )
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const dark = mounted && resolvedTheme === "dark"
  return (
    <button
      type="button"
      className="student-theme-toggle"
      onClick={() => setTheme(dark ? "light" : "dark")}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Light mode" : "Dark mode"}
    >
      {dark ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
    </button>
  )
}
