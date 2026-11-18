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
