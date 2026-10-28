import React from "react"
import { SAMPLE_FEEDBACK } from "./sample"

// Bundled only by scripts/studio-preview.mjs, never by Next. It stands in for
// next/link, next/navigation and the resume context so the studio can be seen
// without Clerk, S3 or OpenAI.
export default function Link({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
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

export function useResume() {
  return {
    xyzFeedback: SAMPLE_FEEDBACK,
    actionableInsights: SAMPLE_FEEDBACK.actionableInsights,
    resumeData: null,
    setResumeData: () => {},
    isLoading: false,
    setIsLoading: () => {},
    refreshResumeData: async () => {},
    currentFileName: "alex-rivera-resume.pdf",
    setCurrentFileName: () => {},
    showFeedback: true,
    toggleFeedback: () => {},
    addXp: () => {},
    setCharacterClass: () => {},
    debugSetLevel: () => {},
  }
}

// sonner writes to a portal the preview doesn't mount; the console is enough here.
export const toast = Object.assign(
  (message: string) => console.log("toast:", message),
  {
    success: (message: string) => console.log("toast ✓", message),
    error: (message: string) => console.log("toast ✗", message),
  },
)
