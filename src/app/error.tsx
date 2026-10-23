"use client"

import { useState } from "react"
import { useAuth } from "@clerk/nextjs"
import Link from "next/link"

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { getToken, isLoaded } = useAuth()
  const [retrying, setRetrying] = useState(false)
  const [refreshFailed, setRefreshFailed] = useState(false)

  async function retry() {
    if (retrying) return
    setRetrying(true)
    setRefreshFailed(false)
    try {
      if (isLoaded) {
        const token = await getToken({ skipCache: true })
        if (!token) {
          window.location.assign("/sign-in")
          return
        }
      }
      reset()
    } catch {
      setRefreshFailed(true)
    } finally {
      setRetrying(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-12 text-foreground">
      <section className="w-full max-w-lg rounded-2xl border border-border bg-card p-8 shadow-sm">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[.16em] text-primary">Vistern</p>
        <h1 className="text-3xl font-semibold tracking-tight">We couldn’t load this page</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {refreshFailed
            ? "Your session couldn’t be refreshed. Sign in again to continue."
            : "Your connection or session may have interrupted the request. Try again to refresh your session and reload your work."}
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => { void retry() }} disabled={retrying} className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
            {retrying ? "Trying again…" : "Try again"}
          </button>
          <Link href="/sign-in" className="rounded-lg border border-border px-5 py-2.5 text-sm font-semibold text-foreground">Sign in again</Link>
        </div>
      </section>
    </main>
  )
}
