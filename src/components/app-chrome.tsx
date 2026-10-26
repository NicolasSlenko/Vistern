"use client"

import { usePathname } from "next/navigation"
import { Header } from "@/components/header"
import { StudentShell } from "@/components/student/student-shell"
import { Footer } from "@/components/footer"
import { ResumeProvider } from "@/contexts/resume-context"

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  if (pathname === "/" || pathname === "/landing-page")
    return children
  if (
    ["/home", "/career", "/community", "/jobs", "/student-profile"].includes(pathname) ||
    pathname.startsWith("/community/") ||
    pathname.startsWith("/jobs/")
  )
    return children
  if (pathname === "/resume" || pathname.startsWith("/resume/"))
    return <StudentShell>{children}</StudentShell>
  if (pathname === "/onboarding")
    return <ResumeProvider>{children}</ResumeProvider>
  const toolPages = ["/profile", "/dashboard", "/upload", "/match", "/settings", "/resumes"]
  const needsResume = ["/profile", "/dashboard", "/upload", "/match", "/resumes"]
  if (toolPages.includes(pathname) || pathname.startsWith("/resumes/"))
    return needsResume.includes(pathname) || pathname.startsWith("/resumes/")
      ? <ResumeProvider><StudentShell>{children}</StudentShell></ResumeProvider>
      : <StudentShell>{children}</StudentShell>
  return (
    <>
      <Header />
      <div className="pb-20" />
      {children}
      <Footer />
    </>
  )
}
