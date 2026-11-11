"use client"

import { useCallback, useEffect, useState } from "react"
import { Check, ChevronDown, Cpu, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { pill } from "@/components/resume-studio/pills"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { AiProvider, AiProviderInfo } from "@/lib/ai"

interface AiProviderState {
  providers: AiProviderInfo[]
  defaultProvider: AiProvider
  selectedProvider: AiProvider
  paidUsage: { used: number; limit: number; remaining: number }
}

// Lets every picker on the page update when one of them saves.
const CHANGE_EVENT = "ai-provider-changed"

/**
 * Dropdown for choosing which AI provider runs the user's requests.
 * "full" is the Settings row; "compact" is the quick switch for page headers;
 * "icon" is the square button beside the theme toggle in the student sidebar.
 */
export function AiProviderPicker({ variant = "compact" }: { variant?: "full" | "compact" | "icon" }) {
  const [state, setState] = useState<AiProviderState | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/ai-provider")
      const json = await res.json()
      if (json.success) setState(json.data)
    } catch {
      // The picker simply stays hidden if the endpoint is unavailable.
    }
  }, [])

  useEffect(() => {
    load()
    window.addEventListener(CHANGE_EVENT, load)
    return () => window.removeEventListener(CHANGE_EVENT, load)
  }, [load])

  const choose = async (provider: AiProvider) => {
    if (!state || provider === state.selectedProvider) return
    setSaving(true)
    try {
      const res = await fetch("/api/ai-provider", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      setState({ ...state, selectedProvider: provider })
      window.dispatchEvent(new Event(CHANGE_EVENT))
      toast.success(`AI model set to ${state.providers.find(p => p.id === provider)?.label}`)
    } catch (error) {
      toast.error(error instanceof Error && error.message ? error.message : "Couldn't change the AI model")
    } finally {
      setSaving(false)
    }
  }

  if (!state) return null

  const selected = state.providers.find(p => p.id === state.selectedProvider)
  const { remaining, limit } = state.paidUsage
  const paidNote = selected?.paid
    ? remaining > 0
      ? `${remaining} of ${limit} paid requests left today`
      : "Daily paid limit reached; using HiPerGator until tomorrow"
    : "Free through UF"

  const icon = variant === "icon"
  const trigger = icon ? (
    // Styled as the theme toggle it sits beside.
    <button
      type="button"
      disabled={saving}
      className="student-theme-toggle"
      aria-label={`AI model: ${selected?.label ?? "default"}. Change model`}
      title={`AI model: ${selected?.label ?? "default"}`}
    >
      {saving ? <Loader2 size={18} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Cpu size={18} aria-hidden="true" />}
    </button>
  ) : (
    <button type="button" disabled={saving} className={pill("white", "h-10 px-4 text-[15px] font-medium")}>
      {saving ? <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Cpu aria-hidden="true" />}
      {selected?.label ?? "AI model"}
      <ChevronDown className="opacity-60" aria-hidden="true" />
    </button>
  )

  const menu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      {/* In the sidebar the button sits at the bottom of a narrow column, so the menu opens up and to the right. */}
      <DropdownMenuContent align={icon ? "start" : "end"} side={icon ? "top" : "bottom"} className="w-64">
        <DropdownMenuLabel>AI model</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {state.providers.map(p => (
          <DropdownMenuItem
            key={p.id}
            disabled={!p.available}
            onSelect={() => choose(p.id)}
            className="flex items-start gap-2"
          >
            <Check className={`mt-0.5 h-4 w-4 ${p.id === state.selectedProvider ? "opacity-100" : "opacity-0"}`} />
            <div className="flex flex-col">
              <span className="text-sm">{p.label}</span>
              <span className="text-xs text-muted-foreground">
                {p.model} · {!p.available ? "not configured" : p.paid ? "paid" : "free"}
              </span>
            </div>
          </DropdownMenuItem>
        ))}
        {icon && (
          <>
            <DropdownMenuSeparator />
            <p className="px-2 py-1.5 text-xs text-muted-foreground">{paidNote}</p>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )

  if (variant !== "full") return menu

  return (
    <div className="flex items-start justify-between gap-5">
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="text-[15px] font-medium tracking-[-0.01em] text-ink">AI model</p>
        <p className="max-w-[58ch] text-[13px] leading-relaxed text-ink-3">
          Which AI runs your resume analysis, matching and exports. {paidNote}.
        </p>
      </div>
      {menu}
    </div>
  )
}
