/**
 * Whether a resume entry has anything to print. A card just added in the form
 * is all blanks, and printing it would put a section heading over nothing.
 * Shared by the page (resume-paper.tsx) and the LaTeX export (latex.ts), so
 * the two leave out the same entries.
 */
export function hasContent(entry: object): boolean {
  return Object.values(entry).some((value) =>
    Array.isArray(value)
      ? value.some((item) => String(item ?? "").trim())
      : typeof value === "string"
        ? value.trim() !== ""
        : typeof value === "number",
  )
}
