"use client"

import { useCallback, useEffect, useState } from "react"
import { Check, ChevronDown, Cpu, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
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
 * "full" is the Settings row; "compact" is the quick switch for page headers.
 */
export function AiProviderPicker({ variant = "compact" }: { variant?: "full" | "compact" }) {
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

  const menu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2" disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Cpu className="h-4 w-4" />}
          {selected?.label ?? "AI model"}
          <ChevronDown className="h-3 w-3 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
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
      </DropdownMenuContent>
    </DropdownMenu>
  )

  if (variant === "compact") return menu

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="space-y-0.5">
        <p className="text-sm font-medium">AI Model</p>
        <p className="text-xs text-muted-foreground">
          Which AI runs your resume analysis, matching and exports. {paidNote}.
        </p>
      </div>
      {menu}
    </div>
  )
}
