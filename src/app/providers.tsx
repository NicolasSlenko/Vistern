import * as React from "react"
import { ThemeProvider } from "@/components/theme-provider"
import { AppChrome } from "@/components/app-chrome"
import { ResumeProvider } from "@/contexts/resume-context"

export const AppProviders = ({children}: {children: React.ReactNode}) => {
    return (
      <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
      >
        <ResumeProvider>
          <AppChrome>{children}</AppChrome>
        </ResumeProvider>
      </ThemeProvider>
    )
}