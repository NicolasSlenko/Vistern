"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { pill } from "@/components/resume-studio/pills"
import {
  DEFAULT_SHARING,
  SHARE_FIELDS,
  pickCard,
  type CardSource,
  type ShareField,
  type Sharing,
} from "@/lib/community/public-card"
import { PersonCard } from "./person-card"

/**
 * Where a student decides what the People directory shows of them. Every
 * switch starts off; the preview is exactly what others will see.
 */
export function SharingPanel() {
  const router = useRouter()
  const [source, setSource] = useState<CardSource | null>(null)
  const [saved, setSaved] = useState<Sharing>(DEFAULT_SHARING)
  const [sharing, setSharing] = useState<Sharing>(DEFAULT_SHARING)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [open, setOpen] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let live = true
    fetch("/api/community/sharing")
      .then((response) => response.json())
      .then((result) => {
        if (!live) return
        if (!result.success) throw new Error(result.error)
        setSource(result.data.source)
        setSaved(result.data.sharing)
        setSharing(result.data.sharing)
        // Someone who has never set up a card is shown how, open.
        if (!result.data.card) setOpen(true)
      })
      .catch(() => live && setFailed(true))
      .finally(() => live && setLoading(false))
    return () => {
      live = false
    }
  }, [])

  const preview = useMemo(() => (source ? pickCard(source, sharing) : null), [source, sharing])
  const dirty = JSON.stringify(sharing) !== JSON.stringify(saved)

  const toggle = (field: ShareField) =>
    setSharing((current) => ({
      ...current,
      fields: current.fields.includes(field) ? current.fields.filter((id) => id !== field) : [...current.fields, field],
    }))

  const save = async (next: Sharing) => {
    setSaving(true)
    try {
      const response = await fetch("/api/community/sharing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      })
      const result = await response.json()
      if (result.data?.sharing) {
        setSaved(result.data.sharing)
        setSharing(result.data.sharing)
      }
      if (!response.ok || !result.success) throw new Error(result.error || "Couldn't save your card")
      toast.success(result.data.sharing.listed ? "Your card is in the directory" : "Your card is hidden")
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't save your card")
    } finally {
      setSaving(false)
    }
  }

  const missing = (field: ShareField) => source !== null && source[field] === undefined

  return (
    <section aria-labelledby="your-card" className="flex flex-col gap-4 rounded-[18px] border border-hairline bg-fill/50 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="your-card" className="text-[17px] font-semibold tracking-[-0.015em] text-ink">
            Your card
          </h2>
          <p className="flex items-center gap-1.5 text-[14px] text-ink-2">
            {loading ? (
              "Loading…"
            ) : failed ? (
              <span className="text-alert">Couldn’t load your card. Refresh to try again.</span>
            ) : saved.listed ? (
              <>
                <Eye className="h-4 w-4 text-brand" aria-hidden="true" /> Listed: signed-in students can see what you share
              </>
            ) : (
              <>
                <EyeOff className="h-4 w-4" aria-hidden="true" /> Hidden: nobody sees your card
              </>
            )}
          </p>
        </div>
        <button type="button" disabled={loading || failed} onClick={() => setOpen(!open)} aria-expanded={open} className={pill("white", "h-9 px-4 text-[14px] font-medium")}>
          {open ? "Close" : "Choose what to share"}
        </button>
      </div>

      {open && !loading && source && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)]">
          <div className="flex flex-col gap-5">
            <label className="flex items-start gap-3 rounded-[14px] border border-hairline bg-sheet p-4">
              <input
                type="checkbox"
                checked={sharing.listed}
                onChange={(event) => setSharing({ ...sharing, listed: event.target.checked })}
                className="mt-0.5 h-4 w-4 accent-[var(--color-brand)]"
              />
              <span className="flex flex-col gap-0.5">
                <span className="text-[15px] font-medium text-ink">Show me in People</span>
                <span className="text-[13px] text-ink-2">Off hides your card at once. Only signed-in students can see it.</span>
              </span>
            </label>

            <fieldset className="flex flex-col gap-2">
              <legend className="label-caps mb-1 text-ink-2">Name</legend>
              <div className="flex flex-wrap gap-2">
                {(["first", "full"] as const).map((style) => (
                  <label key={style} className="flex items-center gap-2 rounded-full border border-hairline bg-sheet px-3.5 py-2 text-[14px] text-ink">
                    <input
                      type="radio"
                      name="name-style"
                      checked={sharing.nameStyle === style}
                      onChange={() => setSharing({ ...sharing, nameStyle: style })}
                      className="accent-[var(--color-brand)]"
                    />
                    {style === "first" ? `First name (${source.firstName || "not set"})` : `Full name (${source.fullName || "not set"})`}
                  </label>
                ))}
              </div>
              {!source.fullName && (
                <p className="text-[13px] text-caution">
                  Add your name to your account or your <Link href="/profile" className="underline underline-offset-4">profile</Link> to be listed.
                </p>
              )}
            </fieldset>

            <label className="flex flex-col gap-2">
              <span className="label-caps text-ink-2">Headline</span>
              <input
                value={sharing.headline}
                maxLength={140}
                onChange={(event) => setSharing({ ...sharing, headline: event.target.value })}
                placeholder="CS junior into ML, looking for a research group"
                className="h-10 w-full rounded-[12px] border border-rule-strong bg-sheet px-3 text-[14px] text-ink outline-none focus-visible:border-brand"
              />
            </label>

            <fieldset className="flex flex-col gap-2">
              <legend className="label-caps mb-1 text-ink-2">Also share</legend>
              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {SHARE_FIELDS.map((field) => {
                  const empty = missing(field.id)
                  return (
                    <li key={field.id}>
                      <label className={`flex items-start gap-3 rounded-[12px] border border-hairline bg-sheet p-3 ${empty ? "opacity-60" : ""}`}>
                        <input
                          type="checkbox"
                          checked={sharing.fields.includes(field.id)}
                          onChange={() => toggle(field.id)}
                          className="mt-0.5 h-4 w-4 accent-[var(--color-brand)]"
                        />
                        <span className="flex flex-col">
                          <span className="text-[14px] font-medium text-ink">{field.label}</span>
                          <span className="text-[12px] text-ink-3">{empty ? "Nothing on your profile yet" : "hint" in field ? field.hint : ""}</span>
                        </span>
                      </label>
                    </li>
                  )
                })}
              </ul>
              <p className="text-[12px] text-ink-3">
                Your phone number, GPA and resume bullets are never shared.{" "}
                {source.verified
                  ? `Your card shows a ${source.verified} badge, from the school email you verified.`
                  : "Verify a .edu email in your account to get a school badge."}
              </p>
            </fieldset>

            <div className="flex flex-wrap items-center gap-2.5">
              <button type="button" onClick={() => save(sharing)} disabled={saving || !dirty} className={pill("brand")}>
                {saving && <Loader2 className="animate-spin" aria-hidden="true" />}
                {saving ? "Saving" : "Save card"}
              </button>
              {dirty && (
                <button type="button" onClick={() => setSharing(saved)} disabled={saving} className={pill("text")}>
                  Undo changes
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <p className="label-caps text-ink-2">What others see</p>
            {preview ? (
              <PersonCard card={preview} preview />
            ) : (
              <p className="rounded-[18px] border border-dashed border-rule-strong p-5 text-[14px] text-ink-2">Add your name to see your card.</p>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
