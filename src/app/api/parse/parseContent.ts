import PdfParse from "pdf-parse"
import mammoth from "mammoth"

export class ResumeFileError extends Error {}

// pdf-parse v1 accepts Uint8Array, but its typings only declare Buffer.
// Its legacy PDF.js backend misreads some Node Buffers; use the Uint8Array path.
const parsePdf = PdfParse as (data: Uint8Array) => Promise<PdfParse.Result>

export async function parseFileContent(fileBuffer: Buffer, filename: string): Promise<string> {
  const extension = filename.split(".").pop()?.toLowerCase()
  let content: string

  try {
    switch (extension) {
      case "pdf":
        content = (await parsePdf(new Uint8Array(fileBuffer))).text
        break
      case "doc":
        throw new ResumeFileError("Save this Word document as DOCX or PDF, then upload it again.")
      case "docx":
        content = (await mammoth.extractRawText({ buffer: fileBuffer })).value
        break
      case "txt":
        content = fileBuffer.toString("utf-8")
        break
      default:
        throw new ResumeFileError("Choose a PDF, DOCX, or TXT file.")
    }
  } catch (error) {
    if (error instanceof ResumeFileError) throw error
    throw new ResumeFileError(
      "We couldn’t read this file. Try exporting it as a new PDF or TXT file.",
    )
  }

  if (!content.trim()) {
    throw new ResumeFileError(
      "This file has no readable text. Use a text-based PDF, DOCX, or TXT file.",
    )
  }
  return content
}
