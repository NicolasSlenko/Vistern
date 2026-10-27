"use client"

import { useState } from "react"
import { ArrowLeft, ArrowRight, Check, Loader2, RefreshCw, SkipForward, Sparkles } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, ProseField, TagsField } from "./fields"
import { pill } from "./pills"
import type { ListSectionSpec } from "./sections"
import { OptionCards, OptionSkeletons, PlaceholderHint, fetchDraft, fetchFixOptions, useOptionChoice } from "./bullet-options"
import type { BulletOption, DraftAnswers, WritableSection } from "@/lib/bullet-writing"

/**
 * "Write it with AI" for a student starting an entry from nothing.
 *
 * 1. The facts: name or role, where, when, with what.
 * 2. Their story in three short answers — what they did, for whom, and any
 *    result — which is the context the AI needs to write honest bullets.
 * 3. The AI drafts the bullets, three versions of each, and the student walks
 *    through them one at a time: pick, edit, regenerate or skip.
 * 4. A last look, then the entry is added to their profile.
 */

type Entry = Record<string, unknown>

/** Where each section keeps its bullets. */
const BULLET_FIELD: Record<WritableSection, string> = {
  experience: "responsibilities",
  projects: "highlights",
  extracurriculars: "achievements",
}

const STEP_TITLES = ["The basics", "Your story", "Choose your bullets", "Review"]

export function NewEntryWizard({
  open,
  onOpenChange,
  section,
  spec,
  count,
  onCreate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  section: WritableSection
  spec: ListSectionSpec
  /** How many bullets to draft, from the student's other entries. */
  count: number
  onCreate: (entry: Entry) => void
}) {
  const [step, setStep] = useState(0)
  const [basics, setBasics] = useState<Entry>(() => spec.blank())
  const [answers, setAnswers] = useState<DraftAnswers>({ what: "", problem: "", result: "" })
  const [drafts, setDrafts] = useState<BulletOption[][]>([])
  const [at, setAt] = useState(0)
  const [chosen, setChosen] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const choice = useOptionChoice(drafts[at] ?? [])

  // The short facts of the entry; links, long prose and bullet lists come from the story.
  const basicFields = spec.fields.filter((field) => (field.kind === "text" || field.kind === "tags") && !field.web && field.key !== "location")
  const title = String(basics[spec.titleKey] ?? "").trim()

  const reset = () => {
    setStep(0)
    setBasics(spec.blank())
    setAnswers({ what: "", problem: "", result: "" })
    setDrafts([])
    setAt(0)
    setChosen([])
    setError(null)
  }
  const close = (next: boolean) => {
    onOpenChange(next)
    if (!next) reset()
  }

  const draft = async () => {
    setStep(2)
    setLoading(true)
    setError(null)
    try {
      const bullets = await fetchDraft({ section, entry: basics, answers, count })
      setDrafts(bullets.map((bullet) => bullet.options))
      setAt(0)
      setChosen([])
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "The AI couldn't draft bullets this time")
    } finally {
      setLoading(false)
    }
  }

  // New versions of just the bullet on screen, told to avoid the ones already shown.
  const regenerateCurrent = async () => {
    const current = drafts[at]
    if (!current?.length) return
    setLoading(true)
    setError(null)
    try {
      const story = [answers.what, answers.problem, answers.result].filter((part) => part.trim()).join("\n")
      const next = await fetchFixOptions({
        section,
        entry: { ...basics, [BULLET_FIELD[section]]: chosen },
        bullet: current[0].text,
        context: story,
        avoid: current.map((option) => option.text),
      })
      setDrafts((all) => all.map((options, index) => (index === at ? next : options)))
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "The AI couldn't write options this time")
    } finally {
      setLoading(false)
    }
  }

  const advance = (bullet?: string) => {
    if (bullet) setChosen((all) => [...all, bullet])
    if (at + 1 < drafts.length) setAt(at + 1)
    else setStep(3)
  }

  const create = () => {
    const entry: Entry = { ...basics, [BULLET_FIELD[section]]: chosen }
    if (section === "projects" && !String(entry.description ?? "").trim()) entry.description = answers.what.trim()
    onCreate(entry)
    toast.success(`${title || "Entry"} added to your profile`)
    close(false)
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="zip-scope flex max-h-[90vh] flex-col gap-5 overflow-y-auto rounded-[18px] border-hairline bg-sheet p-6 sm:max-w-xl sm:rounded-[18px]">
        <DialogHeader className="flex flex-col gap-2">
          <p className="label-mono text-ink-3">
            Step {step + 1} of 4 · {STEP_TITLES[step]}
          </p>
          <DialogTitle className="flex items-center gap-2 font-serif text-[26px] font-normal leading-tight tracking-[-0.025em] text-ink">
            <Sparkles className="h-5 w-5 shrink-0 text-brand" aria-hidden="true" /> Write {/^[aeiou]/i.test(spec.singular) ? "an" : "a"} {spec.singular} with AI
          </DialogTitle>
          <DialogDescription className="text-[14px] leading-relaxed text-ink-2">
            {step === 0 && "Start with the facts. You can change any of them later."}
            {step === 1 && "Tell it in your own words. The AI only uses what you say here, so specifics and numbers make better bullets."}
            {step === 2 && "For each bullet, pick the version that sounds most like you, and edit it if you like."}
            {step === 3 && "Here's the entry. Add it to your profile and you can keep editing it there."}
          </DialogDescription>
        </DialogHeader>

        {step === 0 && (
          <div className="grid grid-cols-1 gap-x-5 gap-y-[18px] sm:grid-cols-2">
            {basicFields.map((field) =>
              field.kind === "tags" ? (
                <TagsField
                  key={field.key}
                  className="sm:col-span-2"
                  label={field.label}
                  placeholder={field.placeholder}
                  value={Array.isArray(basics[field.key]) ? (basics[field.key] as string[]) : []}
                  onChange={(value) => setBasics((current) => ({ ...current, [field.key]: value }))}
                />
              ) : (
                <Field
                  key={field.key}
                  className={field.half ? "" : "sm:col-span-2"}
                  label={field.label}
                  placeholder={field.placeholder}
                  hint={field.hint}
                  value={String(basics[field.key] ?? "")}
                  onChange={(value) => setBasics((current) => ({ ...current, [field.key]: value }))}
                />
              ),
            )}
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col gap-[18px]">
            <ProseField
              label="What did you do or build?"
              placeholder="e.g. Built a Discord bot in Python that reminds my club about meetings and tracks attendance."
              value={answers.what}
              onChange={(what) => setAnswers((current) => ({ ...current, what }))}
            />
            <ProseField
              label="What problem did it solve, and for whom?"
              placeholder="e.g. Our 60-person club kept missing meetings because announcements got buried."
              value={answers.problem}
              onChange={(problem) => setAnswers((current) => ({ ...current, problem }))}
              rows={2}
            />
            <ProseField
              label="Any results or numbers? (optional)"
              placeholder="e.g. Attendance went from about 20 to 35 a week."
              value={answers.result}
              onChange={(result) => setAnswers((current) => ({ ...current, result }))}
              rows={2}
            />
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-3">
            {!loading && drafts.length > 0 && (
              <p className="label-mono text-ink-2">
                Bullet {at + 1} of {drafts.length}
              </p>
            )}
            {loading ? (
              <OptionSkeletons />
            ) : error ? (
              <p role="alert" className="text-[14px] text-alert">
                {error}
              </p>
            ) : (
              <OptionCards options={drafts[at] ?? []} selected={choice.selected} edited={choice.edited} onSelect={choice.select} onEdit={choice.setEdited} />
            )}
            <PlaceholderHint text={choice.edited} />
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-2 rounded-[14px] border border-hairline p-4">
            <p className="text-[16px] font-medium tracking-[-0.01em] text-ink">{title || `New ${spec.singular}`}</p>
            {chosen.length ? (
              <ul className="flex list-disc flex-col gap-1.5 pl-5 text-[14.5px] leading-snug text-ink">
                {chosen.map((bullet, index) => (
                  <li key={index}>{bullet}</li>
                ))}
              </ul>
            ) : (
              <p className="text-[14px] text-ink-3">No bullets chosen. You can add them yourself in the editor.</p>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-hairline pt-4">
          <div>
            {step > 0 && step !== 2 && (
              <button type="button" onClick={() => setStep(step === 3 ? 1 : step - 1)} className={pill("text", "h-9 px-3 text-[14px] font-medium")}>
                <ArrowLeft aria-hidden="true" /> Back
              </button>
            )}
            {step === 2 && (
              <button type="button" disabled={loading} onClick={error && !drafts.length ? draft : regenerateCurrent} className={pill("white", "h-9 px-4 text-[14px] font-medium")}>
                {loading ? <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <RefreshCw aria-hidden="true" />}
                {error && !drafts.length ? "Try again" : "Regenerate"}
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {step === 0 && (
              <button type="button" disabled={!title} onClick={() => setStep(1)} className={pill("brand", "h-9 px-4 text-[14px] font-medium")}>
                Next <ArrowRight aria-hidden="true" />
              </button>
            )}
            {step === 1 && (
              <button type="button" disabled={!answers.what.trim()} onClick={draft} className={pill("brand", "h-9 px-4 text-[14px] font-medium")}>
                <Sparkles aria-hidden="true" /> Draft my bullets
              </button>
            )}
            {step === 2 && drafts.length > 0 && (
              <>
                <button type="button" disabled={loading} onClick={() => advance()} className={pill("text", "h-9 px-3 text-[14px] font-medium")}>
                  <SkipForward aria-hidden="true" /> Skip
                </button>
                <button type="button" disabled={loading || !choice.ready} onClick={() => advance(choice.edited.trim())} className={pill("brand", "h-9 px-4 text-[14px] font-medium")}>
                  <Check aria-hidden="true" /> {at + 1 < drafts.length ? "Use this, next" : "Use this"}
                </button>
              </>
            )}
            {step === 3 && (
              <button type="button" onClick={create} className={pill("brand", "h-9 px-4 text-[14px] font-medium")}>
                <Check aria-hidden="true" /> Add to profile
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
