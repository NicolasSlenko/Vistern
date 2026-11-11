import { rewriteKey, type BulletRewrite } from "@/lib/resume-suggestions"
import type { PaperMark } from "@/components/resume-paper/resume-marks"
import { entryMark, sectionMark } from "@/components/resume-paper/resume-paper"
import type { ReviewNote } from "./review-notes"
import type { SectionRef } from "./sections"

/**
 * What each studio mode draws on the page.
 *
 * The left column is always the section list; the AI's output lives on the
 * page, where it is about something you can see. Suggestions are drawn on the
 * bullet they would rewrite; review notes on the entry, or the section, they
 * are about.
 */

export function rewriteMarks(
  rewrites: readonly BulletRewrite[],
  answered: ReadonlySet<string>,
  actions: {
    onAccept: (rewrite: BulletRewrite) => void
    onReject: (rewrite: BulletRewrite) => void
    onMore?: (rewrite: BulletRewrite) => void
    onGoTo: (rewrite: BulletRewrite) => void
  },
): PaperMark[] {
  return rewrites
    .filter((rewrite) => !answered.has(rewriteKey(rewrite)))
    .map((rewrite) => ({
      targets: [rewriteKey(rewrite)],
      note: {
        id: rewrite.id,
        severity: rewrite.severity,
        text: rewrite.suggested,
        why: rewrite.why,
        onAccept: () => actions.onAccept(rewrite),
        onReject: () => actions.onReject(rewrite),
        onMore: actions.onMore ? () => actions.onMore!(rewrite) : undefined,
      },
      onGoTo: () => actions.onGoTo(rewrite),
    }))
}

export function noteMarks(
  notes: readonly ReviewNote[],
  actions: { onDone: (note: ReviewNote) => void; onGoTo: (section: SectionRef, entryIndex?: number) => void },
): PaperMark[] {
  return notes.map((note) => {
    const targets = [
      ...(note.section && note.entryIndex !== undefined ? [entryMark(note.section, note.entryIndex)] : []),
      ...(note.section ? [sectionMark(note.section)] : []),
      // A note about the whole resume, or a section the page doesn't print, sits on the name.
      sectionMark("profile"),
    ]
    return {
      targets,
      note: {
        id: note.id,
        severity: note.tier,
        eyebrow: note.entryIndex === undefined ? undefined : note.entryName,
        text: note.text,
        why: note.why,
        onDone: () => actions.onDone(note),
      },
      onGoTo: note.section ? () => actions.onGoTo(note.section!, note.entryIndex) : undefined,
    }
  })
}
