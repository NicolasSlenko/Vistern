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
  if (["/home", "/career", "/community", "/jobs"].includes(pathname))
    return children
  if (pathname === "/onboarding")
    return <ResumeProvider>{children}</ResumeProvider>
  if (
    ["/profile", "/dashboard", "/upload", "/match", "/settings"].includes(
      pathname,
    )
  )
    return ["/profile", "/dashboard", "/upload", "/match"].includes(pathname)
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
