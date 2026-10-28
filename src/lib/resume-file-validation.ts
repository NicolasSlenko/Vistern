const CONTENT_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  txt: "text/plain",
}

export function resumeContentType(fileName: string): string | null {
  const extension = fileName.split(".").pop()?.toLowerCase()
  return extension ? CONTENT_TYPES[extension] ?? null : null
}

export function matchesResumeFileFormat(contentType: string, bytes: Buffer): boolean {
  if (contentType === CONTENT_TYPES.pdf) {
    return bytes.subarray(0, 5).toString() === "%PDF-"
  }
  if (contentType === CONTENT_TYPES.docx) {
    return bytes.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]))
  }
  return contentType === CONTENT_TYPES.txt && bytes.length > 0 && !bytes.includes(0)
}
