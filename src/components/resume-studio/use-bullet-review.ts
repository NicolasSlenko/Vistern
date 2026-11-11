"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import type { Resume } from "@/app/api/parse/resumeSchema"
import { BULLET_FIELDS, applyRewrite, liveRewrites, rewriteKey, type BulletRewrite, type BulletSection } from "@/lib/resume-suggestions"

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

/** Every bullet the route would send, so an unchanged resume isn't sent again. */
function bulletFingerprint(resume: Resume): string {
  const lines: string[] = []
  for (const section of Object.keys(BULLET_FIELDS) as BulletSection[]) {
    ;((resume[section] ?? []) as Record<string, unknown>[]).forEach((entry, entryIndex) => {
      for (const field of BULLET_FIELDS[section]) {
        const bullets = Array.isArray(entry[field]) ? (entry[field] as unknown[]) : []
        bullets.forEach((bullet, bulletIndex) => lines.push(`${section}.${entryIndex}.${field}.${bulletIndex}:${String(bullet)}`))
      }
    })
  }
  return lines.join("\n")
}

/**
 * `target: "profile"` reviews the master profile's general resume: its
 * rewrites are cached apart from any resume document's.
 */
export function useBulletReview(
  resume: Resume | null,
  { scope, resumeDocumentId, target = "resume" }: { scope: string; resumeDocumentId?: string; target?: "resume" | "profile" },
) {
  const [all, setAll] = useState<BulletRewrite[]>([])
  const [asking, setAsking] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [answered, setAnswered] = useState<Set<string>>(new Set())
  // The bullets the last answer was for; asking again about the same words is free.
  const lastAsked = useRef<string | null>(null)

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
    const query =
      target === "profile"
        ? "?for=profile"
        : resumeDocumentId
          ? `?resumeDocumentId=${encodeURIComponent(resumeDocumentId)}`
          : ""
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
  }, [resumeDocumentId, target])

  const clearAnswers = useCallback(() => {
    // A fresh reading is a fresh set of offers, so old answers don't suppress them.
    setAnswered(new Set())
    try {
      localStorage.removeItem(answeredKey(scope))
    } catch {
      /* Nothing to clear. */
    }
  }, [scope])

  const ask = useCallback(async () => {
    if (!resume) return
    const fingerprint = bulletFingerprint(resume)
    if (fingerprint === lastAsked.current) {
      // Nothing has changed since the last answer: offer it again without a request.
      clearAnswers()
      toast.success(all.length === 0 ? "Nothing to change — your bullets read well" : `${all.length} ${all.length === 1 ? "bullet" : "bullets"} to look at`)
      return
    }
    setAsking(true)
    try {
      const response = await fetch("/api/analyze/bullets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeData: resume, resumeDocumentId, for: target }),
      })
      const result = await response.json()
      if (!result.success) throw new Error(result.error || "The AI couldn't read it this time")
      setAll(result.data.rewrites ?? [])
      lastAsked.current = fingerprint
      clearAnswers()
      const count = result.data.rewrites?.length ?? 0
      toast.success(count === 0 ? "Nothing to change — your bullets read well" : `${count} ${count === 1 ? "bullet" : "bullets"} to look at`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't review the bullets")
    } finally {
      setAsking(false)
    }
  }, [resume, resumeDocumentId, target, all.length, clearAnswers])

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
