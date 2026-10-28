import Anthropic from "@anthropic-ai/sdk"
import { OpenAI } from "openai"
import { zodResponseFormat } from "openai/helpers/zod"
import type { z } from "zod"

// Server-only AI layer. Routes pick a provider per request (see resolve.ts) and call
// generateObject / generateText / embed; nothing else in the app talks to an AI API.

export type AiProvider = "hipergator" | "openai" | "claude"

export const AI_PROVIDERS: AiProvider[] = ["hipergator", "openai", "claude"]

export function isAiProvider(value: unknown): value is AiProvider {
  return AI_PROVIDERS.includes(value as AiProvider)
}


// The cheapest current model for each provider; each can be overridden in .env.
const MODELS: Record<AiProvider, string> = {
  hipergator: process.env.HIPERGATOR_MODEL || "gemma-4-31b-it",
  openai: process.env.OPENAI_MODEL || "gpt-6-luna",
  claude: process.env.CLAUDE_MODEL || "claude-haiku-5-5",
}

const LABELS: Record<AiProvider, string> = {
  hipergator: "UF HiPerGator",
  openai: "OpenAI",
  claude: "Claude",
}

const API_KEYS: Record<AiProvider, string | undefined> = {
  hipergator: process.env.HIPERGATOR_API_KEY,
  openai: process.env.OPENAI_API_KEY,
  claude: process.env.ANTHROPIC_API_KEY,
}

/** HiPerGator is free through UF; the other providers bill our API keys. */
export function isPaidProvider(provider: AiProvider) {
  return provider !== "hipergator"
}

export function modelFor(provider: AiProvider) {
  return MODELS[provider]
}

export interface AiProviderInfo {
  id: AiProvider
  label: string
  model: string
  paid: boolean
  available: boolean
}

// Empty keys and the "your-…" placeholders copied from .env.example don't count as configured.
export function hasApiKey(provider: AiProvider) {
  const key = API_KEYS[provider]
  return Boolean(key) && !key!.startsWith("your-")
}

/**
 * Provider for users who haven't chosen one: AI_PROVIDER, else HiPerGator — but only if
 * its key is set. A deployment missing that key (a preview without HIPERGATOR_API_KEY)
 * falls through to the first provider that is configured, rather than sending requests
 * to a provider that can only refuse them.
 */
export const DEFAULT_AI_PROVIDER: AiProvider = (() => {
  const wanted: AiProvider = isAiProvider(process.env.AI_PROVIDER) ? process.env.AI_PROVIDER : "hipergator"
  if (hasApiKey(wanted)) return wanted
  return AI_PROVIDERS.find(hasApiKey) ?? wanted
})()

/** A provider asked for whose API key isn't set. Routes can show its message as is. */
export class AiNotConfiguredError extends Error {
  constructor(provider: AiProvider) {
    super(`${LABELS[provider]} isn't set up on this server, so AI features can't run. Ask an admin to add its API key.`)
    this.name = "AiNotConfiguredError"
  }
}

/** Every provider with its model, and whether its API key is configured. Safe to send to the browser. */
export function listAiProviders(): AiProviderInfo[] {
  return AI_PROVIDERS.map(id => ({
    id,
    label: LABELS[id],
    model: MODELS[id],
    paid: isPaidProvider(id),
    available: hasApiKey(id),
  }))
}

// Embeddings ignore the user's choice: the resume and the jobs must be embedded by the
// same model, and Claude has no embeddings API. HiPerGator is used only when it offers an
// embedding model (HIPERGATOR_EMBEDDING_MODEL); otherwise OpenAI's small model does it.
const EMBEDDING_PROVIDER: "hipergator" | "openai" =
  DEFAULT_AI_PROVIDER === "hipergator" && process.env.HIPERGATOR_EMBEDDING_MODEL ? "hipergator" : "openai"
const EMBEDDING_MODEL = EMBEDDING_PROVIDER === "hipergator"
  ? process.env.HIPERGATOR_EMBEDDING_MODEL!
  : process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small"

// Large enough for full resume extraction and LaTeX output without streaming.
const CLAUDE_MAX_TOKENS = 16000

export interface AiUsage {
  inputTokens: number
  outputTokens: number
}

// USD per 1M tokens. HiPerGator rates come from .env because UF sets them; models
// without a price (e.g. one set via OPENAI_MODEL) log token counts only.
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  "gpt-6-luna": { input: 0.1, output: 0.5 },
  "claude-haiku-5-5": { input: 0.1, output: 0.5 },
}
if (process.env.HIPERGATOR_PRICE_INPUT && process.env.HIPERGATOR_PRICE_OUTPUT) {
  MODEL_PRICING[MODELS.hipergator] = {
    input: Number(process.env.HIPERGATOR_PRICE_INPUT),
    output: Number(process.env.HIPERGATOR_PRICE_OUTPUT),
  }
}

/** Returns the USD cost of a call, or null when the model has no price on file. */
export function estimateCost(model: string, usage: AiUsage): number | null {
  const pricing = MODEL_PRICING[model]
  if (!pricing) return null
  return (usage.inputTokens / 1_000_000) * pricing.input + (usage.outputTokens / 1_000_000) * pricing.output
}

function logUsage(label: string, model: string, usage: AiUsage | null) {
  if (!usage) return
  const cost = estimateCost(model, usage)
  const price = cost === null ? "no price on file" : `$${cost.toFixed(6)}`
  console.log(`[ai] ${label} ${model}: ${usage.inputTokens} in / ${usage.outputTokens} out, ${price}`)
}

// Open models in JSON mode can occasionally loop on whitespace instead of closing the
// object. A full resume needs ~2k output tokens, so cap HiPerGator well above that and
// fail fast rather than letting one request hang for the SDK's 10-minute default.
// Healthy calls finish in 1–40s, so a minute means the request stalled and is worth one retry.
const HIPERGATOR_MAX_OUTPUT_TOKENS = 8000
const HIPERGATOR_TIMEOUT_MS = 60_000

function outputCap(provider: AiProvider) {
  return provider === "hipergator" ? { max_tokens: HIPERGATOR_MAX_OUTPUT_TOKENS } : {}
}

function openAiCompatibleClient(provider: "hipergator" | "openai") {
  // Checked here because the OpenAI SDK, given no key, quietly reads OPENAI_API_KEY —
  // which sent our OpenAI key to UF's proxy and came back as a 401 on every request.
  if (!hasApiKey(provider)) throw new AiNotConfiguredError(provider)
  if (provider === "hipergator") {
    return new OpenAI({
      apiKey: API_KEYS.hipergator,
      baseURL: process.env.HIPERGATOR_BASE_URL || process.env.LITELLM_BASE_URL || "https://api.ai.it.ufl.edu/v1",
      timeout: HIPERGATOR_TIMEOUT_MS,
      maxRetries: 1,
    })
  }
  return new OpenAI({ apiKey: API_KEYS.openai })
}

function claudeClient() {
  if (!hasApiKey("claude")) throw new AiNotConfiguredError("claude")
  return new Anthropic({ apiKey: API_KEYS.claude })
}

// Reasoning models (OpenAI's GPT-5+ and o-series) and the current Claude API reject
// custom sampling parameters, so temperature only goes to models that accept it.
function acceptsTemperature(provider: AiProvider) {
  if (provider === "claude") return false
  if (provider === "openai") return !/^(gpt-[5-9]|o\d)/.test(MODELS.openai)
  return true
}

interface GenerateOptions {
  provider: AiProvider
  system: string
  prompt: string
  /** Ignored by models that don't accept sampling parameters. */
  temperature?: number
}

interface GenerateObjectOptions<T extends z.ZodTypeAny> extends GenerateOptions {
  schema: T
  /** Schema name sent to the provider, e.g. "feedback". */
  name: string
}

async function claudeMessage(options: GenerateOptions, format?: { [key: string]: unknown }) {
  const response = await claudeClient().messages.create({
    model: MODELS.claude,
    max_tokens: CLAUDE_MAX_TOKENS,
    system: options.system,
    messages: [{ role: "user", content: options.prompt }],
    ...(format ? { output_config: { format: { type: "json_schema" as const, schema: format } } } : {}),
  })

  if (response.stop_reason === "refusal") {
    throw new Error("Claude declined the request")
  }
  if (response.stop_reason === "max_tokens") {
    throw new Error("Claude response was cut off at max_tokens")
  }

  const text = response.content
    .map(block => (block.type === "text" ? block.text : ""))
    .join("")

  return {
    text,
    usage: { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens },
  }
}

function chatMessages(options: GenerateOptions) {
  return [
    { role: "system" as const, content: options.system },
    { role: "user" as const, content: options.prompt },
  ]
}

/** Generates JSON matching `schema`. `data` is null if the model's output didn't validate. */
export async function generateObject<T extends z.ZodTypeAny>(
  options: GenerateObjectOptions<T>
): Promise<{ data: z.infer<T> | null; usage: AiUsage | null }> {
  const { provider } = options
  const model = MODELS[provider]
  // The OpenAI helper turns the Zod schema into the strict JSON schema both APIs accept.
  const responseFormat = zodResponseFormat(options.schema, options.name)

  if (provider === "claude") {
    const { text, usage } = await claudeMessage(options, responseFormat.json_schema.schema)
    logUsage(options.name, model, usage)
    const parsed = options.schema.safeParse(JSON.parse(text))
    return { data: parsed.success ? parsed.data : null, usage }
  }

  const completion = await openAiCompatibleClient(provider).chat.completions.parse({
    model,
    messages: chatMessages(options),
    response_format: responseFormat,
    ...(acceptsTemperature(provider) ? { temperature: options.temperature } : {}),
    ...outputCap(provider),
  })

  const usage = completion.usage
    ? { inputTokens: completion.usage.prompt_tokens, outputTokens: completion.usage.completion_tokens }
    : null
  logUsage(options.name, model, usage)

  return { data: completion.choices[0]?.message.parsed ?? null, usage }
}

/** Generates free-form text (e.g. LaTeX). */
export async function generateText(options: GenerateOptions): Promise<string> {
  const { provider } = options
  const model = MODELS[provider]

  if (provider === "claude") {
    const { text, usage } = await claudeMessage(options)
    logUsage("text", model, usage)
    return text
  }

  const completion = await openAiCompatibleClient(provider).chat.completions.create({
    model,
    messages: chatMessages(options),
    ...(acceptsTemperature(provider) ? { temperature: options.temperature } : {}),
    ...outputCap(provider),
  })
  if (completion.usage) {
    logUsage("text", model, {
      inputTokens: completion.usage.prompt_tokens,
      outputTokens: completion.usage.completion_tokens,
    })
  }
  return completion.choices[0]?.message.content ?? ""
}

/** Embeds each input string; results are in the same order as `inputs`. */
export async function embed(inputs: string[]): Promise<number[][]> {
  if (EMBEDDING_PROVIDER === "openai" && !process.env.OPENAI_API_KEY) {
    throw new Error("Embeddings need OPENAI_API_KEY (or HIPERGATOR_EMBEDDING_MODEL)")
  }
  const response = await openAiCompatibleClient(EMBEDDING_PROVIDER).embeddings.create({
    model: EMBEDDING_MODEL,
    input: inputs,
  })
  logUsage("embed", EMBEDDING_MODEL, { inputTokens: response.usage.prompt_tokens, outputTokens: 0 })
  return response.data.map(item => item.embedding)
}

/** What to tell the student when an AI call fails: the setup or limit message if that's why, else `fallback`. */
export function aiErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && (error.name === "AiNotConfiguredError" || error.name === "AiLimitReachedError")) return error.message
  return fallback
}
