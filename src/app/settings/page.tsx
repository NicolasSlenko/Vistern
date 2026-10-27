"use client"

import { useState, useEffect } from "react"
import { useUser, useClerk } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { Field } from "@/components/resume-studio/fields"
import { pill } from "@/components/resume-studio/pills"
import { cn } from "@/lib/utils"
import { Save, Loader2, AlertTriangle, Trash2, UserX, Check } from "lucide-react"
import { toast } from "sonner"

/**
 * Settings: the handful of things about an account that aren't work.
 *
 * Name and email sit with Clerk, the AI-feedback switch with the browser, and
 * data sharing on the server — three different homes, so each panel says
 * where what you change is kept.
 */

function DeleteAccountDialog() {
  const { signOut } = useClerk()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [confirmText, setConfirmText] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const res = await fetch("/api/delete-account", { method: "DELETE" })
      const result = await res.json()
      if (result.success) {
        toast.success("Account deleted successfully.")
        await signOut()
        router.push("/")
      } else {
        toast.error(result.error || "Failed to delete account")
      }
    } catch {
      toast.error("An error occurred while deleting your account.")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setConfirmText(""); }}>
      <DialogTrigger asChild>
        <button type="button" className={pill("danger")}>
          <UserX aria-hidden="true" /> Delete account
        </button>
      </DialogTrigger>
      <DialogContent className="zip-scope flex flex-col gap-5 border-hairline bg-sheet p-6 rounded-[18px] sm:max-w-md sm:rounded-[18px]">
        <DialogHeader className="flex flex-col gap-2">
          <DialogTitle className="flex items-center gap-2 font-serif text-[26px] leading-tight font-normal tracking-[-0.025em] text-ink">
            <AlertTriangle className="h-5 w-5 shrink-0 text-alert" aria-hidden="true" /> Delete your account
          </DialogTitle>
          <DialogDescription className="text-[15px] leading-relaxed text-ink-2">
            This is permanent. Every resume, preference and score goes with it, and your Clerk account is removed too.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <label htmlFor="delete-confirm" className="label-mono text-ink-2">
            Type DELETE to confirm
          </label>
          <input
            id="delete-confirm"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="DELETE"
            disabled={isDeleting}
            autoComplete="off"
            className="h-10 w-full rounded-[12px] border border-rule-strong bg-sheet px-3 font-mono text-[14px] tracking-[0.04em] text-ink outline-none transition-colors placeholder:text-ink-2/50 focus-visible:border-brand disabled:opacity-50"
          />
        </div>
        <DialogFooter className="gap-2 sm:gap-2.5">
          <DialogClose asChild>
            <button type="button" disabled={isDeleting} className={pill("white")}>
              Cancel
            </button>
          </DialogClose>
          <button
            type="button"
            onClick={handleDelete}
            disabled={confirmText !== "DELETE" || isDeleting}
            className={`${pill("danger")} disabled:opacity-50`}
          >
            {isDeleting ? <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Trash2 aria-hidden="true" />}
            {isDeleting ? "Deleting…" : "Permanently delete"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** A panel on the sheet: a hairline card under a small monospace heading. */
function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-[18px] border border-hairline bg-sheet p-5 shadow-card-rest sm:p-6">
      <h2 className="label-mono text-ink-2">{title}</h2>
      {children}
    </section>
  )
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-5">
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="text-[15px] font-medium tracking-[-0.01em] text-ink">{label}</p>
        <p className="max-w-[58ch] text-[13px] leading-relaxed text-ink-3">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-label={label}
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full p-[3px] transition-colors duration-200",
          checked ? "bg-brand" : "bg-rule",
          disabled && "cursor-not-allowed opacity-50",
        )}
      >
        <span
          className={cn(
            "pointer-events-none block h-[18px] w-[18px] rounded-full bg-sheet shadow-[0_1px_2px_rgb(10_24_17/0.25)] transition-transform duration-200 ease-glide motion-reduce:transition-none",
            checked ? "translate-x-5" : "translate-x-0",
          )}
        />
      </button>
    </div>
  )
}

export default function SettingsPage() {
  const { user, isLoaded } = useUser()

  // Profile fields
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [profileDirty, setProfileDirty] = useState(false)

  // App preferences
  const [showAiFeedback, setShowAiFeedback] = useState(true)
  const [dataSharing, setDataSharing] = useState(false)
  const [isLoadingSettings, setIsLoadingSettings] = useState(true)
  const [isSavingSettings, setIsSavingSettings] = useState(false)

  // Initialize from Clerk user
  useEffect(() => {
    if (isLoaded && user) {
      setFirstName(user.firstName ?? "")
      setLastName(user.lastName ?? "")
    }
  }, [isLoaded, user])

  // Initialize AI feedback from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("showAiFeedback")
      setShowAiFeedback(stored !== null ? stored === "true" : true)
    }
  }, [])

  // Load app settings from S3
  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch("/api/settings")
        const result = await res.json()
        if (result.success && result.data) {
          setDataSharing(result.data.dataSharing ?? false)
        }
      } catch {
        console.error("Failed to load settings")
      } finally {
        setIsLoadingSettings(false)
      }
    }
    if (isLoaded) loadSettings()
  }, [isLoaded])

  const handleSaveProfile = async () => {
    if (!user) return
    setIsSavingProfile(true)
    try {
      await user.update({ firstName, lastName })
      setProfileDirty(false)
      toast.success("Profile updated successfully!")
    } catch (error) {
      toast.error("Failed to update profile.")
      console.error(error)
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handleAiFeedbackChange = (value: boolean) => {
    setShowAiFeedback(value)
    if (typeof window !== "undefined") {
      localStorage.setItem("showAiFeedback", String(value))
    }
    toast.success(value ? "AI feedback enabled" : "AI feedback disabled")
  }

  const handleDataSharingChange = async (value: boolean) => {
    setDataSharing(value)
    setIsSavingSettings(true)
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataSharing: value }),
      })
      const result = await res.json()
      if (!result.success) {
        setDataSharing(!value) // revert
        toast.error("Failed to save preference")
      } else {
        toast.success(value ? "Data sharing enabled" : "Data sharing disabled")
      }
    } catch {
      setDataSharing(!value) // revert
      toast.error("Failed to save preference")
    } finally {
      setIsSavingSettings(false)
    }
  }

  return (
    <div className="zip-scope desk desk-bright min-h-[calc(100vh-var(--chrome-top,82px))] p-2 pb-10 sm:p-5 xl:p-6">
      <div className="paper-frame">
        <div className="paper flex min-h-[calc(100vh-var(--chrome-top,82px)-68px)] flex-col">
          <header className="flex min-h-[72px] flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-hairline px-4 py-[13px] sm:px-6">
            <h1 className="text-[17px] font-medium tracking-[-0.02em] text-ink sm:text-[18px]">Settings</h1>
          </header>

          <div className="flex-1 px-4 py-9 sm:px-8 sm:py-12">
            {!isLoaded ? (
              <div role="status" className="flex min-h-48 items-center justify-center gap-3 text-[15px] text-ink-2">
                <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                Loading your settings…
              </div>
            ) : (
              <div className="mx-auto flex max-w-[1000px] flex-col gap-9">
                <div className="flex flex-col gap-2">
                  <p className="max-w-[58ch] font-serif text-[34px] leading-[1.06] tracking-[-0.03em] text-ink sm:text-[40px]">
                    Your account, <em className="text-brand">your rules</em>
                  </p>
                  <p className="max-w-[60ch] text-[15px] leading-relaxed text-ink-2">
                    Your name, what the app shows you, and what happens to your data.
                  </p>
                </div>

                <Panel title="Profile">
                  <p className="max-w-[60ch] text-[14px] leading-relaxed text-ink-2">
                    Your display name. Email and profile picture are handled by your Clerk account.
                  </p>
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <Field
                      label="First name"
                      value={firstName}
                      placeholder="First name"
                      autoComplete="given-name"
                      onChange={(value) => { setFirstName(value); setProfileDirty(true); }}
                    />
                    <Field
                      label="Last name"
                      value={lastName}
                      placeholder="Last name"
                      autoComplete="family-name"
                      onChange={(value) => { setLastName(value); setProfileDirty(true); }}
                    />
                  </div>

                  <dl className="flex flex-col gap-1.5">
                    <dt className="label-mono text-ink-2">Email</dt>
                    <dd className="rounded-[12px] bg-fill px-3 py-2 text-[15px] wrap-anywhere text-ink">
                      {user?.primaryEmailAddress?.emailAddress ?? "—"}
                    </dd>
                    <dd className="text-[13px] leading-normal text-ink-3">
                      Managed by Clerk. Open your profile avatar to change your email or password.
                    </dd>
                  </dl>

                  <button
                    type="button"
                    onClick={handleSaveProfile}
                    disabled={!profileDirty || isSavingProfile}
                    className={`${pill("brand")} self-start`}
                  >
                    {isSavingProfile ? (
                      <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
                    ) : profileDirty ? (
                      <Save aria-hidden="true" />
                    ) : (
                      <Check aria-hidden="true" />
                    )}
                    {isSavingProfile ? "Saving…" : profileDirty ? "Save changes" : "Saved"}
                  </button>
                </Panel>

                <Panel title="Preferences">
                  <ToggleRow
                    label="AI feedback"
                    description="Show AI-written suggestions for your resume."
                    checked={showAiFeedback}
                    onChange={handleAiFeedbackChange}
                  />
                  <hr className="border-t border-hairline" />
                  <ToggleRow
                    label="Data sharing for research"
                    description="Let the Grasshopper Labs team use your anonymised resume data for academic research."
                    checked={dataSharing}
                    onChange={handleDataSharingChange}
                    disabled={isLoadingSettings || isSavingSettings}
                  />
                </Panel>

                <Panel title="Delete account">
                  <p className="max-w-[60ch] text-[14px] leading-relaxed text-ink-2">
                    Remove your account and everything stored with it. There’s no way back from this.
                  </p>
                  <div className="self-start">
                    <DeleteAccountDialog />
                  </div>
                </Panel>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
