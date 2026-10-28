"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"

export type SaveState = "clean" | "dirty" | "saving" | "saved" | "failed"

/** How long after typing stops before what's open is saved. */
const SAVE_AFTER_MS = 1400
/** How long "Saved" lingers before the note goes quiet. */
const SAVED_FOR_MS = 2400

/**
 * Edits land in state at once and go to the server a moment after typing
 * stops, so the form never waits on the network. The returned `state` drives
 * the note in the top bar, and `saveNow` is what the "Save now" button
 * presses when something is still unsaved.
 */
export function useAutosave<T>(save: (value: T) => Promise<void>) {
  const [state, setState] = useState<SaveState>("clean")
  const pending = useRef<T | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // The save function can be a new closure each render; the timer should use the latest.
  const saveRef = useRef(save)
  saveRef.current = save

  const persist = useCallback(async (value: T) => {
    setState("saving")
    try {
      await saveRef.current(value)
      pending.current = null
      setState("saved")
      if (savedTimer.current) clearTimeout(savedTimer.current)
      savedTimer.current = setTimeout(() => setState((current) => (current === "saved" ? "clean" : current)), SAVED_FOR_MS)
    } catch (error) {
      setState("failed")
      toast.error(error instanceof Error ? error.message : "Couldn't save your changes")
    }
  }, [])

  const queue = useCallback(
    (value: T) => {
      pending.current = value
      setState("dirty")
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => persist(value), SAVE_AFTER_MS)
    },
    [persist],
  )

  const saveNow = useCallback(() => {
    if (pending.current === null) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    persist(pending.current)
  }, [persist])

  useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      if (savedTimer.current) clearTimeout(savedTimer.current)
    },
    [],
  )

  // Closing the tab mid-edit shouldn't lose the last few words without a word about it.
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (pending.current === null) return
      event.preventDefault()
    }
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [])

  return { state, queue, saveNow }
}
