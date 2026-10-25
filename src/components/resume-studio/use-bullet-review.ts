"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import type { Resume } from "@/app/api/parse/resumeSchema"
import { applyRewrite, liveRewrites, rewriteKey, type BulletRewrite } from "@/lib/resume-suggestions"

/**
 * The AI's line-level rewrites for whatever resume is open, and what the
 * student has done about each one.
 *
 * Answers are kept in this browser rather than the database: a rewrite is a
 * passing offer, and once it's been taken or turned down there's nothing
 * worth syncing. The rewrites themselves are cached server-side, so
 * reopening a resume doesn't pay for the model again.
 */

const answeredKey = (scope: string) => `vistern-rewrites-answered:${scope}`

export function useBulletReview(resume: Resume | null, { scope, resumeDocumentId }: { scope: string; resumeDocumentId?: string }) {
  const [all, setAll] = useState<BulletRewrite[]>([])
  const [asking, setAsking] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [answered, setAnswered] = useState<Set<string>>(new Set())

  // What's already been answered, from the last visit.
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(answeredKey(scope)) || "[]")
      if (Array.isArray(stored)) setAnswered(new Set(stored.filter((key): key is string => typeof key === "string")))
    } catch {
      /* An unreadable answer list just means every suggestion is offered again. */
    }
  }, [scope])

  const remember = useCallback(
    (key: string) => {
      setAnswered((current) => {
        const next = new Set(current).add(key)
        try {
          localStorage.setItem(answeredKey(scope), JSON.stringify([...next]))
        } catch {
          /* Private browsing: the answer holds for this session only. */
        }
        return next
      })
    },
    [scope],
  )

  // The rewrites last generated for this resume.
  useEffect(() => {
    let live = true
    const query = resumeDocumentId ? `?resumeDocumentId=${encodeURIComponent(resumeDocumentId)}` : ""
    fetch(`/api/analyze/bullets${query}`)
      .then((response) => response.json())
      .then((result) => {
        if (!live) return
        const rewrites = result?.data?.rewrites
        if (Array.isArray(rewrites)) setAll(rewrites)
      })
      .catch(() => {})
      .finally(() => live && setLoaded(true))
    return () => {
      live = false
    }
  }, [resumeDocumentId])

  const ask = useCallback(async () => {
    if (!resume) return
    setAsking(true)
    try {
      const response = await fetch("/api/analyze/bullets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeData: resume, resumeDocumentId }),
      })
      const result = await response.json()
      if (!result.success) throw new Error(result.error || "The AI couldn't read it this time")
      setAll(result.data.rewrites ?? [])
      // A fresh reading is a fresh set of offers, so old answers don't suppress them.
      setAnswered(new Set())
      try {
        localStorage.removeItem(answeredKey(scope))
      } catch {
        /* Nothing to clear. */
      }
      const count = result.data.rewrites?.length ?? 0
      toast.success(count === 0 ? "Nothing to change — your bullets read well" : `${count} ${count === 1 ? "bullet" : "bullets"} to look at`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't review the bullets")
    } finally {
      setAsking(false)
    }
  }, [resume, resumeDocumentId, scope])

  // Only the rewrites that still match the words in front of us, minus the ones already answered.
  const live = useMemo(() => liveRewrites(resume, all), [resume, all])
  const open = useMemo(() => live.filter((rewrite) => !answered.has(rewriteKey(rewrite))), [live, answered])

  /** The rewrites for one entry, by "field.line", for the form to look up as it draws each bullet. */
  const forEntry = useCallback(
    (section: BulletRewrite["section"], entryIndex: number) => {
      const byField = new Map<string, { rewrite: BulletRewrite; answered: boolean }>()
      for (const rewrite of live) {
        if (rewrite.section !== section || rewrite.entryIndex !== entryIndex) continue
        byField.set(`${rewrite.field}.${rewrite.bulletIndex}`, { rewrite, answered: answered.has(rewriteKey(rewrite)) })
      }
      return byField
    },
    [live, answered],
  )

  /** Takes a rewrite: the words go in, and it isn't offered again. */
  const accept = useCallback(
    (rewrite: BulletRewrite, commit: (resume: Resume) => void) => {
      if (!resume) return
      commit(applyRewrite(resume, rewrite))
      remember(rewriteKey(rewrite))
    },
    [resume, remember],
  )

  /** Turns a rewrite down: the line stays as it is, and it isn't offered again. */
  const reject = useCallback((rewrite: BulletRewrite) => remember(rewriteKey(rewrite)), [remember])

  /** How many open suggestions point into each section, for the counts in the left bar. */
  const counts = useMemo(() => {
    const bySection: Partial<Record<BulletRewrite["section"], number>> = {}
    for (const rewrite of open) bySection[rewrite.section] = (bySection[rewrite.section] ?? 0) + 1
    return bySection
  }, [open])

  return { all, live, open, counts, asking, loaded, ask, accept, reject, forEntry, answered }
}
