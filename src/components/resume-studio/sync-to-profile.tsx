"use client"

import { useState } from "react"
import { Loader2, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import type { Resume } from "@/app/api/parse/resumeSchema"
import { applyChanges, proposeChanges, type ProposedChange } from "@/lib/profile/merge"
import { MergeReview } from "@/components/upload/merge-review"
import { pill } from "./pills"

/**
 * Bring a resume's wording back to the master profile, on demand.
 *
 * Upload reconciles once, but a resume keeps being edited afterwards — a
 * bullet rewritten here is work the profile should be allowed to have. This
 * runs the same comparison again, so the one place a student can say what
 * their profile holds is still the review list, not a silent overwrite.
 */
export function SyncToProfile({ resume }: { resume: Resume | null }) {
  const [pending, setPending] = useState<{ profile: Resume; changes: ProposedChange[] } | null>(null)
  const [busy, setBusy] = useState(false)

  const look = async () => {
    if (!resume) return
    setBusy(true)
    try {
      const response = await fetch("/api/profile")
      const result = await response.json()
      if (!result?.success) throw new Error("Couldn't read your profile")
      const changes = proposeChanges(result.data, resume)
      if (!changes.length) {
        toast.success("Your profile already has everything on this resume")
        return
      }
      setPending({ profile: result.data, changes })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't compare with your profile")
    } finally {
      setBusy(false)
    }
  }

  const save = async (accepted: Set<string>) => {
    if (!pending) return
    setBusy(true)
    try {
      const merged = applyChanges(pending.profile, pending.changes, accepted)
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(merged),
      })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error("Couldn't save your profile")
      toast.success(accepted.size === 0 ? "Profile left as it was" : `Added ${accepted.size} to your profile`)
      setPending(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't save your profile")
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={look}
        disabled={busy || !resume}
        title="Compare this resume with your master profile"
        className={pill("white", "h-10 px-4 text-[15px] font-medium")}
      >
        {busy && !pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <RefreshCw aria-hidden="true" />}
        <span className="max-sm:sr-only">Sync to profile</span>
      </button>

      {pending && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="What to bring across to your profile"
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/25 p-4 backdrop-blur-sm sm:p-8"
          onMouseDown={(event) => event.target === event.currentTarget && !busy && setPending(null)}
        >
          <div className="paper-frame w-full max-w-[760px]">
            <div className="paper p-5 sm:p-7">
              <MergeReview changes={pending.changes} saving={busy} onApply={save} onSkip={() => setPending(null)} />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
