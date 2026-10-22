import * as React from "react"
import { ThemeProvider } from "@/components/theme-provider"
import { AppChrome } from "@/components/app-chrome"

export const AppProviders = ({children}: {children: React.ReactNode}) => {
    return (
      <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
      >
        <AppChrome>{children}</AppChrome>
      </ThemeProvider>
    )
}
