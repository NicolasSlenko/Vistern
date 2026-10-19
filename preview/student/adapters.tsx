import React from "react"
import type { Resume } from "../../src/app/api/parse/resumeSchema"

// These adapters are bundled only by scripts/student-preview.mjs, never by Next.
export default function Link({
  href,
  children,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a href={href} {...props}>
      {children}
    </a>
  )
}
export function useRouter() {
  return {
    push: (href: string) => {
      window.location.href = href
    },
    refresh: () => {},
    replace: (href: string) => window.location.replace(href),
  }
}
export function usePathname() {
  return window.location.pathname
}
export function UserButton() {
  return (
    <span className="demo-avatar" aria-label="Sample student">
      S
    </span>
  )
}
export function SignOutButton({ children }: { children: React.ReactNode; redirectUrl?: string }) {
  return (
    <span
      onClick={() => {
        window.location.href = "/onboarding?edit=1"
      }}
    >
      {children}
    </span>
  )
}
export function SignedIn({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
export function SignedOut() {
  return null
}
export function SignInButton({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
export function useResume() {
  return {
    setResumeData: (data: Resume | null) => {
      localStorage.setItem("vistern-meeting-resume", JSON.stringify(data))
    },
    setCurrentFileName: () => {},
    refreshResumeData: async () => {},
  }
}
