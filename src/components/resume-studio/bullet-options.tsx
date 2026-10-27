"use client"

import { Fragment, useCallback, useEffect, useState } from "react"
import { Check, Loader2, MessageSquarePlus, RefreshCw, Sparkles } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { pill } from "./pills"
import {
  hasPlaceholder,
  type BulletOption,
  type DraftAnswers,
  type WritableSection,
} from "@/lib/bullet-writing"

/**
 * Three AI-written versions of a bullet, side by side, so the student can see
 * the trade-off (impact, technical depth, brevity) and choose — then edit the
 * one they chose before it goes anywhere. The AI proposes; the student decides.
 */

type Entry = Record<string, unknown>

async function post<T>(body: unknown): Promise<T> {
  const response = await fetch("/api/analyze/bullet-options", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const result = await response.json()
  if (!response.ok || !result.success) throw new Error(result.error || "The AI couldn't write options this time")
  return result.data as T
}

export function fetchFixOptions(args: { section: WritableSection; entry: Entry; bullet: string; context?: string; avoid?: string[] }) {
  return post<{ options: BulletOption[] }>({ mode: "fix", ...args }).then((data) => data.options)
}

export function fetchDraft(args: { section: WritableSection; entry: Entry; answers: DraftAnswers; count: number }) {
  return post<{ bullets: { options: BulletOption[] }[] }>({ mode: "draft", ...args }).then((data) => data.bullets)
}

/** The bullet's words with any [fill-in] parts picked out, so they can't be missed. */
function WithPlaceholders({ text }: { text: string }) {
  const parts = text.split(/(\[[^\]]+\])/g)
  return (
    <>
      {parts.map((part, index) =>
        /^\[[^\]]+\]$/.test(part) ? (
          <mark key={index} className="rounded bg-caution/20 px-0.5 text-ink">
            {part}
          </mark>
        ) : (
          <Fragment key={index}>{part}</Fragment>
        ),
      )}
    </>
  )
}

/** A box that grows with its words. */
function EditBox({ value, onChange, label }: { value: string; onChange: (value: string) => void; label: string }) {
  return (
    <textarea
      aria-label={label}
      value={value}
      rows={2}
      onChange={(event) => onChange(event.target.value)}
      onClick={(event) => event.stopPropagation()}
      className="field-sizing-content w-full resize-none rounded-[10px] border border-hairline bg-sheet px-2.5 py-1.5 text-[14.5px] leading-snug text-ink outline-none focus-visible:border-brand"
    />
  )
}

/**
 * The options as cards. The chosen card turns into an editable box, so a
 * student who likes "option 2 but with my real number" doesn't start over.
 */
export function OptionCards({
  options,
  selected,
  edited,
  onSelect,
  onEdit,
}: {
  options: BulletOption[]
  selected: number | null
  edited: string
  onSelect: (index: number) => void
  onEdit: (text: string) => void
}) {
  return (
    <div role="radiogroup" aria-label="AI options" className="flex flex-col gap-2.5">
      {options.map((option, index) => {
        const chosen = selected === index
        return (
          <div
            key={`${index}-${option.text}`}
            role="radio"
            aria-checked={chosen}
            tabIndex={0}
            onClick={() => onSelect(index)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault()
                onSelect(index)
              }
            }}
            className={`flex cursor-pointer flex-col gap-1.5 rounded-[14px] border p-3.5 text-left transition-colors duration-150 ${
              chosen ? "border-brand bg-brand/5" : "border-hairline bg-sheet hover:border-rule-strong"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="label-mono text-ink-2">
                Option {index + 1} · {option.angle || "Rewrite"}
              </span>
              {chosen && <Check className="h-4 w-4 text-brand" aria-hidden="true" />}
            </div>
            {chosen ? (
              <EditBox value={edited} onChange={onEdit} label={`Edit option ${index + 1}`} />
            ) : (
              <p className="text-[14.5px] leading-snug text-ink">
                <WithPlaceholders text={option.text} />
              </p>
            )}
            {option.why && <p className="text-[12.5px] leading-snug text-ink-3">{option.why}</p>}
          </div>
        )
      })}
    </div>
  )
}

/** Loading stand-ins the same shape as the cards, so nothing jumps when they arrive. */
export function OptionSkeletons() {
  return (
    <div role="status" aria-label="Writing options" className="flex flex-col gap-2.5">
      {[0, 1, 2].map((index) => (
        <div key={index} className="flex animate-pulse flex-col gap-2 rounded-[14px] border border-hairline p-3.5 motion-reduce:animate-none">
          <div className="h-3 w-28 rounded bg-fill" />
          <div className="h-4 w-full rounded bg-fill" />
          <div className="h-4 w-3/4 rounded bg-fill" />
        </div>
      ))}
    </div>
  )
}

/** Shown under the cards when the chosen text still has a [fill-in] in it. */
export function PlaceholderHint({ text }: { text: string }) {
  if (!hasPlaceholder(text)) return null
  return (
    <p className="text-[13px] leading-snug text-caution">
      Replace the <mark className="rounded bg-caution/20 px-0.5 text-ink">[highlighted]</mark> part with your real number before using it.
    </p>
  )
}

/**
 * Selection and editing for one set of options. Resets whenever new options
 * arrive, and pre-selects nothing: the student should read all three first.
 */
export function useOptionChoice(options: BulletOption[]) {
  const [selected, setSelected] = useState<number | null>(null)
  const [edited, setEdited] = useState("")
  useEffect(() => {
    setSelected(null)
    setEdited("")
  }, [options])
  const select = useCallback(
    (index: number) => {
      if (index === selected) return
      setSelected(index)
      setEdited(options[index]?.text ?? "")
    },
    [options, selected],
  )
  const ready = selected !== null && edited.trim() !== "" && !hasPlaceholder(edited)
  return { selected, edited, setEdited, select, ready }
}

/**
 * The "fix this bullet" window: the bullet as it stands, three options, and
 * two ways to ask again — plainly (Regenerate) or with facts the AI didn't
 * have (Add context).
 */
export function BulletOptionsDialog({
  open,
  onOpenChange,
  section,
  entry,
  bullet,
  onChoose,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  section: WritableSection
  entry: Entry
  bullet: string
  onChoose: (text: string) => void
}) {
  const [options, setOptions] = useState<BulletOption[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [seen, setSeen] = useState<string[]>([])
  const [contextOpen, setContextOpen] = useState(false)
  const [context, setContext] = useState("")
  const choice = useOptionChoice(options)

  const generate = useCallback(
    async ({ avoid, extra }: { avoid?: string[]; extra?: string } = {}) => {
      setLoading(true)
      setError(null)
      try {
        const next = await fetchFixOptions({ section, entry, bullet, context: extra, avoid })
        setOptions(next)
        setSeen((current) => [...current, ...next.map((option) => option.text)].slice(-12))
      } catch (failure) {
        setError(failure instanceof Error ? failure.message : "The AI couldn't write options this time")
      } finally {
        setLoading(false)
      }
    },
    [section, entry, bullet],
  )

  // A fresh window for each bullet: first options on open, nothing carried over.
  useEffect(() => {
    if (!open) return
    setOptions([])
    setSeen([])
    setContext("")
    setContextOpen(false)
    generate()
    // Only when the window opens or the bullet changes; generate is stable per bullet.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, bullet])

  const use = () => {
    if (!choice.ready) return
    onChoose(choice.edited.trim())
    onOpenChange(false)
    toast.success("Bullet updated")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="zip-scope flex max-h-[90vh] flex-col gap-5 overflow-y-auto rounded-[18px] border-hairline bg-sheet p-6 sm:max-w-xl sm:rounded-[18px]">
        <DialogHeader className="flex flex-col gap-2">
          <DialogTitle className="flex items-center gap-2 font-serif text-[26px] font-normal leading-tight tracking-[-0.025em] text-ink">
            <Sparkles className="h-5 w-5 shrink-0 text-brand" aria-hidden="true" /> Improve this bullet
          </DialogTitle>
          <DialogDescription className="text-[14px] leading-relaxed text-ink-2">
            Three ways to write it. Pick the one that fits you best, edit it if you like, then use it. Nothing changes until you do.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5 rounded-[14px] bg-fill px-3.5 py-3">
          <span className="label-mono text-ink-3">Now</span>
          <p className="text-[14.5px] leading-snug text-ink-2">{bullet}</p>
        </div>

        {loading ? (
          <OptionSkeletons />
        ) : error ? (
          <p role="alert" className="text-[14px] text-alert">
            {error}
          </p>
        ) : (
          <OptionCards options={options} selected={choice.selected} edited={choice.edited} onSelect={choice.select} onEdit={choice.setEdited} />
        )}

        <PlaceholderHint text={choice.edited} />

        {contextOpen && (
          <div className="flex flex-col gap-2">
            <label htmlFor="bullet-context" className="label-mono text-ink-2">
              What should the AI know?
            </label>
            <textarea
              id="bullet-context"
              rows={3}
              value={context}
              onChange={(event) => setContext(event.target.value)}
              placeholder="e.g. It served about 200 students. I wrote the scheduler in Python. It cut setup from a day to an hour."
              className="field-sizing-content w-full resize-none rounded-[10px] border border-hairline bg-sheet px-3 py-2 text-[14.5px] leading-snug text-ink outline-none focus-visible:border-brand"
            />
            <button
              type="button"
              disabled={loading || !context.trim()}
              onClick={() => generate({ extra: context, avoid: seen })}
              className={pill("brand", "h-9 self-start px-4 text-[14px] font-medium")}
            >
              <RefreshCw aria-hidden="true" /> Rewrite with this
            </button>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-hairline pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" disabled={loading} onClick={() => generate({ avoid: seen, extra: context })} className={pill("white", "h-9 px-4 text-[14px] font-medium")}>
              {loading ? <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <RefreshCw aria-hidden="true" />}
              Regenerate
            </button>
            {!contextOpen && (
              <button type="button" onClick={() => setContextOpen(true)} className={pill("text", "h-9 px-3 text-[14px] font-medium")}>
                <MessageSquarePlus aria-hidden="true" /> Add context
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => onOpenChange(false)} className={pill("text", "h-9 px-3 text-[14px] font-medium")}>
              Cancel
            </button>
            <button type="button" disabled={!choice.ready} onClick={use} className={pill("brand", "h-9 px-4 text-[14px] font-medium")}>
              <Check aria-hidden="true" /> Use this
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
