"use client"

import { usePathname } from "next/navigation"
import { Header } from "@/components/header"
import { StudentShell } from "@/components/student/student-shell"
import { Footer } from "@/components/footer"

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  if (
    ["/home", "/onboarding", "/career", "/community", "/jobs"].includes(
      pathname,
    )
  )
    return children
  if (
    ["/profile", "/dashboard", "/upload", "/match", "/settings"].includes(
      pathname,
    )
  )
    return <StudentShell>{children}</StudentShell>
  return (
    <>
      <Header />
      <div className="pb-20" />
      {children}
      <Footer />
    </>
  )
}
