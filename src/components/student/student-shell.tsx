"use client"

import Link from "next/link"
import dynamic from "next/dynamic"
import { usePathname } from "next/navigation"
import { Fragment, useRef, useState } from "react"
import { SignOutButton } from "@clerk/nextjs"
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
} from "lucide-react"
import "./student.css"

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
  { href: "/profile", label: "My resume" },
  { href: "/dashboard", label: "Resume feedback" },
  { href: "/upload", label: "Upload resume" },
]

export function StudentShell({
  children,
  onboarding = false,
}: {
  children: React.ReactNode
  onboarding?: boolean
}) {
  const pathname = usePathname()
  const activeHref = resumePages.some((page) => page.href === pathname)
    ? "/profile"
    : pathname === "/match"
      ? "/jobs"
      : pathname
  const pageTitle =
    resumePages.find((page) => page.href === pathname)?.label ||
    (pathname === "/match" ? "Job matches" : null) ||
    links.find((link) => link.href === activeHref)?.label ||
    "Settings"
  const [open, setOpen] = useState(false)
  const menu = useRef<HTMLButtonElement>(null)
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
            <p className="student-nav-label">Your workspace</p>
            <nav aria-label="Main navigation">
              {links.map(({ href, label, icon: Icon }) => (
                <Fragment key={href}>
                  <Link
                    href={href}
                    aria-current={href === activeHref ? "page" : undefined}
                  >
                    <Icon size={19} />
                    {label}
                  </Link>
                  {href === "/profile" && activeHref === "/profile" && (
                    <div className="student-subnav">
                      {resumePages.map((page) => (
                        <Link
                          key={page.href}
                          href={page.href}
                          aria-current={
                            pathname === page.href ? "page" : undefined
                          }
                        >
                          {page.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </Fragment>
              ))}
            </nav>
            <div className="student-account-nav">
              <Link href="/settings">
                <Settings size={17} />
                Settings
              </Link>
            </div>
            <Link className="student-sidebar-bottom" href="/onboarding?edit=1">
              <UserRound size={19} />
              <span>Your background</span>
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
            <span>{pageTitle}</span>
            <AccountControls />
          </header>
          {open && (
            <nav
              id="student-mobile-nav"
              className="student-mobile-nav"
              aria-label="Mobile navigation"
            >
              {links.map(({ href, label, icon: Icon }) => (
                <Fragment key={href}>
                  <Link
                    href={href}
                    onClick={closeMenu}
                    aria-current={href === activeHref ? "page" : undefined}
                  >
                    <Icon size={18} />
                    {label}
                  </Link>
                  {href === "/profile" &&
                    activeHref === "/profile" &&
                    resumePages.map((page) => (
                      <Link
                        key={page.href}
                        href={page.href}
                        onClick={closeMenu}
                        aria-current={
                          pathname === page.href ? "page" : undefined
                        }
                      >
                        {page.label}
                      </Link>
                    ))}
                </Fragment>
              ))}
              <Link href="/settings" onClick={closeMenu}>
                Settings
              </Link>
              <Link href="/onboarding?edit=1" onClick={closeMenu}>
                Your background
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
      <UserButton />
      <SignOutButton redirectUrl="/">
        <button type="button">Sign out</button>
      </SignOutButton>
    </div>
  )
}
