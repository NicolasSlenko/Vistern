"use client"

import { useEffect, useId, useState } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { pill } from "@/components/resume-studio/pills"
import { questionnaireOptions, type QuestionnaireData } from "@/app/questionnaire/data"

/**
 * The search the matcher runs, as four sets of chips.
 *
 * It saves the whole questionnaire back, not just these four: /api/preferences
 * stores one record, so the fields this modal doesn't show are carried over
 * from what's already there and only defaulted when nothing has been set.
 */

const chip = (on: boolean) =>
  `inline-flex h-9 shrink-0 items-center rounded-full border px-3.5 text-[14px] tracking-[-0.01em] transition-colors duration-150 ${
    on ? "border-brand bg-brand/10 font-medium text-brand" : "border-rule-strong text-ink-2 hover:bg-fill hover:text-ink"
  }`

function ChipGroup({
  label,
  options,
  chosen,
  onToggle,
  className = "flex flex-wrap gap-2",
}: {
  label: string
  options: readonly string[]
  chosen: string[]
  onToggle: (value: string) => void
  className?: string
}) {
  const id = useId()
  return (
    <div className="flex flex-col gap-2.5">
      <p id={id} className="label-mono text-ink-2">
        {label}
      </p>
      <div role="group" aria-labelledby={id} className={className}>
        {options.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={chosen.includes(option)}
            onClick={() => onToggle(option)}
            className={chip(chosen.includes(option))}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  )
}

export function PrefsModal({
  open,
  onClose,
  currentPrefs,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  currentPrefs: Partial<QuestionnaireData>
  onSaved: (newPrefs: QuestionnaireData) => void
}) {
  const [jobType, setJobType] = useState<string[]>(currentPrefs.jobType || [])
  const [roleTypes, setRoleTypes] = useState<string[]>(currentPrefs.roleTypes || [])
  const [location, setLocation] = useState<string[]>(currentPrefs.location || [])
  const [degreeLevel, setDegreeLevel] = useState<string[]>(currentPrefs.degreeLevel || [])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setJobType(currentPrefs.jobType || [])
      setRoleTypes(currentPrefs.roleTypes || [])
      setLocation(currentPrefs.location || [])
      setDegreeLevel(currentPrefs.degreeLevel || [])
    }
  }, [open, currentPrefs])

  const toggle = (arr: string[], val: string, set: (v: string[]) => void) =>
    set(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val])

  const handleSave = async () => {
    if (!roleTypes.length || !location.length) {
      toast.error("Please select at least one role type and location.")
      return
    }
    setSaving(true)
    try {
      const merged: QuestionnaireData = {
        techSectors: currentPrefs.techSectors || ["Web Development"],
        roleTypes,
        workEnvironment: currentPrefs.workEnvironment || ["Flexible / Your Choice"],
        companySize: currentPrefs.companySize || ["Medium (201-1000 employees)"],
        experienceLevel: currentPrefs.experienceLevel || ["Entry Level (0-2 years)"],
        workSchedule: currentPrefs.workSchedule || ["Flexible Hours"],
        technicalSkills: currentPrefs.technicalSkills || ["JavaScript / TypeScript"],
        location,
        salaryExpectations: currentPrefs.salaryExpectations || ["$75k - $100k"],
        jobType,
        degreeLevel,
      }
      const res = await fetch("/api/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(merged),
      })
      if (!res.ok) throw new Error("Failed")
      toast.success("Preferences saved — refreshing jobs…")
      onSaved(merged)
      onClose()
    } catch {
      toast.error("Failed to save preferences")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="zip-scope flex max-h-[84vh] flex-col gap-5 overflow-y-auto rounded-[18px] border-hairline bg-sheet p-6 sm:max-w-lg sm:rounded-[18px]">
        <DialogHeader className="flex flex-col gap-1.5">
          <DialogTitle className="font-serif text-[26px] font-normal leading-tight tracking-[-0.025em] text-ink">
            Search preferences
          </DialogTitle>
          <p className="text-[14px] leading-relaxed text-ink-2">
            What the matcher looks for. Changing any of it reruns the search.
          </p>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          <ChipGroup
            label="Degree requirement"
            options={questionnaireOptions.degreeLevel}
            chosen={degreeLevel}
            onToggle={(v) => toggle(degreeLevel, v, setDegreeLevel)}
          />
          <ChipGroup
            label="Job type"
            options={questionnaireOptions.jobType}
            chosen={jobType}
            onToggle={(v) => toggle(jobType, v, setJobType)}
          />
          <ChipGroup
            label="Role types"
            options={questionnaireOptions.roleTypes}
            chosen={roleTypes}
            onToggle={(v) => toggle(roleTypes, v, setRoleTypes)}
            className="flex max-h-52 flex-wrap gap-2 overflow-y-auto pr-1"
          />
          <ChipGroup
            label="Location"
            options={questionnaireOptions.location}
            chosen={location}
            onToggle={(v) => toggle(location, v, setLocation)}
          />
        </div>

        <DialogFooter className="gap-2 sm:gap-2.5">
          <button type="button" onClick={onClose} disabled={saving} className={pill("white")}>
            Cancel
          </button>
          <button type="button" onClick={handleSave} disabled={saving} className={pill("brand")}>
            {saving && <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden="true" />}
            {saving ? "Saving…" : "Save and refresh"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
