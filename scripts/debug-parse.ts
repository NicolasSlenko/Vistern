/**
 * Reproduces /api/parse for one file, outside the app, and shows the model's raw reply
 * so a failed parse can be diagnosed. Prints only timing, finish reason, sizes, the
 * start and end of the reply, and schema errors (paths, not values).
 *
 *   npx tsx scripts/debug-parse.ts path/to/resume.pdf [hipergator|openai|claude]
 *
 * Reads keys from .env.local / .env like the app does.
 */
import { config } from "dotenv"
config({ path: ".env.local" })
config()

import { readFileSync } from "node:fs"
import { basename } from "node:path"
import OpenAI from "openai"
import Anthropic from "@anthropic-ai/sdk"
import { zodResponseFormat } from "openai/helpers/zod"
import { parseFileContent } from "../src/app/api/parse/parseContent"
import { ResultSchema, SYSTEM_PROMPT } from "../src/app/api/parse/semanticParse"

const [file, providerArg] = process.argv.slice(2)
if (!file) {
  console.error("usage: npx tsx scripts/debug-parse.ts <resume file> [hipergator|openai|claude]")
  process.exit(1)
}
const provider = (providerArg || process.env.AI_PROVIDER || "hipergator") as "hipergator" | "openai" | "claude"

function report(raw: string) {
  console.log(`reply: ${raw.length} chars`)
  console.log(`starts: ${JSON.stringify(raw.slice(0, 120))}`)
  console.log(`ends:   ${JSON.stringify(raw.slice(-120))}`)
  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch (error) {
    console.log(`JSON.parse FAILED: ${(error as Error).message}`)
    return
  }
  const result = ResultSchema.safeParse(json)
  if (result.success) {
    console.log("schema: OK")
    return
  }
  console.log("schema: FAILED")
  for (const issue of result.error.issues.slice(0, 15)) {
    console.log(`  ${issue.path.join(".")}: ${issue.code} (${issue.message})`)
  }
}

async function main() {
  const content = await parseFileContent(readFileSync(file), basename(file))
  console.log(`file text: ${content.length} chars; provider: ${provider}`)
  const prompt = `Extract the following resume: ${content}`
  const format = zodResponseFormat(ResultSchema, "results")
  const started = Date.now()

  if (provider === "claude") {
    const response = await new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }).messages.create({
      model: process.env.CLAUDE_MODEL || "claude-haiku-5-5",
      max_tokens: 16000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
      output_config: { format: { type: "json_schema", schema: format.json_schema.schema as Record<string, unknown> } },
    } as Anthropic.MessageCreateParamsNonStreaming)
    console.log(`took ${Date.now() - started} ms; stop_reason: ${response.stop_reason}; tokens out: ${response.usage.output_tokens}`)
    report(response.content.map(block => (block.type === "text" ? block.text : "")).join(""))
    return
  }

  const client =
    provider === "hipergator"
      ? new OpenAI({
          apiKey: process.env.HIPERGATOR_API_KEY,
          baseURL: process.env.HIPERGATOR_BASE_URL || process.env.LITELLM_BASE_URL || "https://api.ai.it.ufl.edu/v1",
          timeout: 120_000,
          maxRetries: 0,
        })
      : new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  const completion = await client.chat.completions.create({
    model: provider === "hipergator" ? process.env.HIPERGATOR_MODEL || "gemma-4-31b-it" : process.env.OPENAI_MODEL || "gpt-6-luna",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    response_format: format,
    ...(provider === "hipergator" ? { temperature: 0, max_tokens: 8000 } : {}),
  })
  const choice = completion.choices[0]
  console.log(
    `took ${Date.now() - started} ms; finish_reason: ${choice?.finish_reason}; tokens out: ${completion.usage?.completion_tokens}`,
  )
  report(choice?.message.content ?? "")
}

main().catch(error => {
  console.error(`call FAILED: ${error?.constructor?.name}: ${error?.message}`)
  process.exit(1)
})
