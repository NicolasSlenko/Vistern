"use client"

import { useCallback, useMemo, useState } from "react"
import { toast } from "sonner"
import type { Resume } from "@/app/api/parse/resumeSchema"
import { applyRewrite, liveRewrites, rewriteKey, type BulletRewrite } from "@/lib/resume-suggestions"

/**
 * Line-level rewrites for the master profile's general resume.
 *
 * Same shape as useBulletReview so the studio draws the panel, the marks on
 * the page and the ticks on each bullet exactly as /resumes/[id] does. The AI
 * isn't connected yet: `ask` only says so. To wire it, have `ask` POST the
 * profile to /api/analyze/bullets (it needs a target other than a resume
 * document) and put the returned rewrites into `setAll`; everything below
 * that line already works.
 */
export function useProfileBulletReview(resume: Resume | null) {
  const [all, setAll] = useState<BulletRewrite[]>([])
  const [answered, setAnswered] = useState<Set<string>>(new Set())
  const asking = false
  const loaded = true

  const ask = useCallback(() => {
    if (!resume) return
    toast.info("AI suggestions for the master profile aren't connected yet")
  }, [resume])

  const remember = useCallback((key: string) => setAnswered((current) => new Set(current).add(key)), [])

  const live = useMemo(() => liveRewrites(resume, all), [resume, all])
  const open = useMemo(() => live.filter((rewrite) => !answered.has(rewriteKey(rewrite))), [live, answered])

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

  const accept = useCallback(
    (rewrite: BulletRewrite, commit: (resume: Resume) => void) => {
      if (!resume) return
      commit(applyRewrite(resume, rewrite))
      remember(rewriteKey(rewrite))
    },
    [resume, remember],
  )

  const reject = useCallback((rewrite: BulletRewrite) => remember(rewriteKey(rewrite)), [remember])

  const counts = useMemo(() => {
    const bySection: Partial<Record<BulletRewrite["section"], number>> = {}
    for (const rewrite of open) bySection[rewrite.section] = (bySection[rewrite.section] ?? 0) + 1
    return bySection
  }, [open])

  return { all, live, open, counts, asking, loaded, ask, accept, reject, forEntry, answered, setAll }
}
