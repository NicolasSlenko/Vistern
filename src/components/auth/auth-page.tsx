import type React from "react"
import Link from "next/link"
import { Sprout } from "lucide-react"

/**
 * The frame the sign-in and sign-up screens sit in: the same sky and sheet
 * as the rest of the app, so the first screen looks like the product rather
 * than a stop on the way to it.
 */
export function AuthPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="zip-scope desk desk-bright flex min-h-screen flex-col items-center justify-center gap-6 p-4 sm:p-8">
      <Link href="/" aria-label={`${title} home`} className="flex items-center gap-2.5 text-ink transition-opacity hover:opacity-80">
        <span className="flex size-9 items-center justify-center rounded-xl bg-brand text-white">
          <Sprout size={20} strokeWidth={2.2} />
        </span>
        <span className="text-[20px] font-semibold tracking-[-0.04em]">{title}</span>
      </Link>
      <div className="paper-frame w-full max-w-[480px]">
        <div className="paper flex flex-col items-center px-4 py-6 sm:px-6">{children}</div>
      </div>
      <p className="text-[12px] text-ink-3">© 2026 Vistern. All rights reserved.</p>
    </div>
  )
}

/**
 * Clerk's widget, dressed as part of the sheet: no card of its own, the
 * theme's green on the main action, and the theme's hairlines everywhere
 * else. Clerk renders into our DOM, so these are its element slots rather
 * than our own classes.
 */
export const clerkAppearance = {
  variables: {
    colorPrimary: "var(--color-brand)",
    colorText: "var(--color-ink)",
    colorTextSecondary: "var(--color-ink-2)",
    colorBackground: "transparent",
    colorInputBackground: "var(--color-sheet)",
    colorInputText: "var(--color-ink)",
    borderRadius: "12px",
    fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
  },
  elements: {
    rootBox: "w-full",
    cardBox: "w-full shadow-none",
    card: "w-full border-0 bg-transparent shadow-none",
    header: "gap-1",
    headerTitle: "font-serif text-[30px] font-normal leading-tight tracking-[-0.03em] text-ink",
    headerSubtitle: "text-[14px] text-ink-2",
    socialButtonsBlockButton: "white-button rounded-full border-0 text-ink",
    dividerLine: "bg-hairline",
    dividerText: "label-mono text-ink-3",
    formFieldLabel: "label-mono text-ink-2",
    formFieldInput: "rounded-[10px] border-rule-strong bg-sheet text-ink",
    formButtonPrimary: "brand-button rounded-full text-[15px] font-medium normal-case tracking-[-0.01em] shadow-none",
    footer: "bg-transparent",
    footerAction: "bg-transparent",
    footerActionText: "text-ink-2",
    footerActionLink: "font-medium text-brand hover:underline",
    identityPreviewEditButton: "text-brand",
  },
} as const
