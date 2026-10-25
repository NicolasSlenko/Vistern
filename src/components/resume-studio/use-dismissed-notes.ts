"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import type { ReviewNote } from "./review-notes"

/**
 * Which review notes the student has ticked off.
 *
 * A review can return dozens of notes at once, most of them small, and a
 * list that never shrinks stops being read. Ticking one puts it away.
 *
 * Notes are remembered by *what they say*, not by their position in the
 * feedback. Their ids are positional ("experience-0-1"), so reordering an
 * entry or regenerating the review would otherwise make a dismissal hide a
 * different note than the one that was read. Keying on the text means a
 * repeated note stays away and a genuinely new one still appears.
 *
 * This lives in the browser rather than the database: it is a reading aid,
 * not a change to the resume, and the notes themselves are regenerated
 * server-side whenever the AI is asked again.
 */

const STORE = "vistern-notes-dismissed"

/**
 * What a note is remembered by: its section and its words, loosely
 * normalised. Only these two fields are needed, so a caller holding a
 * looser shape than ReviewNote can still put one away.
 */
export interface NoteIdentity {
  section?: string
  text: string
}

export const noteKey = (note: NoteIdentity) =>
  `${note.section ?? "general"}:${note.text.trim().toLowerCase().replace(/\s+/g, " ")}`

function read(scope: string): Set<string> {
  try {
    const stored = JSON.parse(localStorage.getItem(`${STORE}:${scope}`) || "[]")
    return new Set(Array.isArray(stored) ? stored.filter((key): key is string => typeof key === "string") : [])
  } catch {
    // Unreadable or unavailable storage just means every note is offered again.
    return new Set()
  }
}

export function useDismissedNotes(notes: ReviewNote[], scope = "profile") {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  // Read after mount: localStorage is not there during the server render,
  // and seeding state from it directly would mismatch the first paint.
  useEffect(() => setDismissed(read(scope)), [scope])

  const save = useCallback(
    (next: Set<string>) => {
      setDismissed(next)
      try {
        localStorage.setItem(`${STORE}:${scope}`, JSON.stringify([...next]))
      } catch {
        /* Private browsing: the choice holds for this session only. */
      }
    },
    [scope],
  )

  const dismiss = useCallback((note: NoteIdentity) => save(new Set(dismissed).add(noteKey(note))), [dismissed, save])

  const restore = useCallback(() => save(new Set()), [save])

  /** Only the notes still worth showing. */
  const open = useMemo(() => notes.filter((note) => !dismissed.has(noteKey(note))), [notes, dismissed])

  /** How many of the current notes have been put away, for the "show them again" line. */
  const hidden = notes.length - open.length

  return { open, hidden, dismiss, restore, isDismissed: (note: ReviewNote) => dismissed.has(noteKey(note)) }
}
