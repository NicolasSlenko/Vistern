import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { extractWithChatGPT } from "./semanticParse"
import { resolveAiProvider } from "@/lib/ai/resolve"
import { aiErrorMessage } from "@/lib/ai"
import { parseFileContent, ResumeFileError } from "./parseContent"
import { getBufferFromS3, objectExistsInS3 } from "@/lib/aws/s3"
import type { Resume } from "./resumeSchema"
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { filename } = await request.json()

    if (typeof filename !== "string" || !filename) {
      return NextResponse.json({ error: "No filename provided" }, { status: 400 })
    }

    const prefix = `uploads/${userId}/`
    if (!filename.startsWith(prefix)) {
      return NextResponse.json({ error: "Invalid file key" }, { status: 403 })
    }

    const fileExists = await objectExistsInS3(filename)
    if (!fileExists) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    const fileBuffer = await getBufferFromS3(filename)

    const content = await parseFileContent(fileBuffer, filename)

    console.log(`Parsing resume content, length: ${content.length}`)

    // extractWithChatGPT returns { details: Resume, missing: string[] }
    const { provider } = await resolveAiProvider(userId)
    const parseResult = (await extractWithChatGPT(content, provider)) as {
      details: Resume
      missing: string[]
    } | null

    if (!parseResult?.details) {
      // The file was read; the AI couldn't turn it into a profile. Retrying
      // the same file often works, so say so rather than blaming the file.
      return NextResponse.json(
        {
          error: "We read your file but couldn’t sort it into sections. Try again, or fill in your profile yourself.",
          code: "extraction_failed",
        },
        { status: 502 },
      )
    }

    console.log("Parsing completed successfully")
    return NextResponse.json({ ...parseResult, aiProvider: provider })
  } catch (error) {
    if (error instanceof ResumeFileError) {
      return NextResponse.json({ error: error.message, code: "unreadable_file" }, { status: 422 })
    }
    console.error("Error parsing resume:", error)
    return NextResponse.json(
      {
        error: aiErrorMessage(error, "Something went wrong while reading your resume. Try again in a moment."),
        code: "server_error",
      },
      { status: 500 },
    )
  }
}
