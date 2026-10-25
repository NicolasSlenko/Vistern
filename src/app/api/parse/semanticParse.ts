import { OpenAI } from "openai";
import ResumeSchema, { type Resume } from "./resumeSchema";
import { normalizeParsedResume } from "@/lib/parse/normalize";
import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod.mjs";

const ResultSchema = z.object({
  details: ResumeSchema.omit({ gamification: true }),
  missing: z.array(z.string())
})

const modelPricing = {
  "gpt-4.1-mini": { input: .4, output: 1.6 },
  "gpt-5-nano": { input: .05, output: .4 },
  "gpt-5-mini": { input: .25, output: 2.0 }
}
const MODEL = "gpt-4.1-mini"


const SYSTEM_PROMPT = `
You are a resume parser that extracts structured JSON from raw resume text.

CRITICAL RULES:
1. Extract text VERBATIM from the resume. Do NOT summarize, paraphrase, or rewrite any content.
   IMPORTANT EXCEPTION: If the resume text is missing spaces between words due to PDF extraction errors (e.g. "Launcheda", "Partneringwith", "by15%through"), you MUST correct these missing spaces so the text is properly readable.
2. For projects:
   - "description" should be a brief one-line summary ONLY if the resume provides one (otherwise leave empty string).
   - "highlights" MUST contain every individual bullet point / line item listed under the project, copied EXACTLY as written in the resume (with corrected spacing). Do NOT combine or summarize bullets.
3. For education:
   - "gpa" MUST only be populated if a GPA is explicitly stated on the resume. Recognise ALL common formats: plain number ("3.76"), fraction ("3.76/4.0" → extract 3.76), label prefix ("GPA: 3.76", "GPA 3.76", "Cumulative GPA: 3.76"), or inline text ("graduated with a 3.76 GPA"). Always store it as a numeric value (not a string fraction). If no GPA is present anywhere in the resume text, leave it null. Do NOT assume or default it to 0.
3. For experience:
   - "responsibilities" MUST contain every individual bullet point listed, copied EXACTLY as written (with corrected spacing).
   - "achievements" should contain any explicitly stated achievements or metrics.
4. If a field is not present in the resume, use an empty string "" or empty array [].
5. Do NOT invent or hallucinate information that is not in the resume.
6. NAMES: write the person's name in normal mixed case even when the resume prints the header in
   capitals. "NIKITA SAFRONOV" becomes "Nikita Safronov". Keep genuine internal capitals and
   particles exactly as a person would write them: McDonald, O'Brien, van der Berg, Jean-Luc,
   D'Angelo, and suffixes such as III or Jr. Never upper-case a name that the resume wrote normally.
7. MISSING FIELDS: a field with no value in the resume MUST be the empty string "". Never write
   "N/A", "n/a", "None", "Unknown", "null", "-", "not provided", "not listed" or any other
   placeholder in any field.
8. DATES: "start_date" and "end_date" are two separate fields. Never put a range in one of them.
   - Strip range separators ("-", "–", "—", "to") and qualifier words ("Expected", "Anticipated",
     "Estimated", "Graduating").
   - An ongoing role or course has an EMPTY "end_date". "Present", "Current" and "Ongoing" are not
     dates; the empty end date is the only way you record that something is ongoing.
   - Use "Mon YYYY" (e.g. "Aug 2023") when the month is known, otherwise just "YYYY".

DATE AND NAME EXAMPLES:
   Resume text: "NIKITA SAFRONOV"
     -> basics.name: "Nikita Safronov"
   Resume text: "University of Toronto, B.Sc. Computer Science, Aug 2023 - Expected December 2026"
     -> start_date: "Aug 2023", end_date: "Dec 2026"   (NOT end_date: "- Expected December 2026")
   Resume text: "Software Intern, May 2024 – Present"
     -> start_date: "May 2024", end_date: ""
   Resume text: "Volunteer, 2021-2022"
     -> start_date: "2021", end_date: "2022"
   Resume text: "LinkedIn: (none on resume)"
     -> linkedin: ""   (NOT "N/A")

Return:
{
  "details": {},   // must match provided schema
  "missing": []    // required basics/education fields that are absent
}
`

export const extractWithChatGPT = async (content: string) => {
  if (!content.trim()) throw new Error("Resume text is empty")
  try {
    const client = new OpenAI()
    const result = await client.responses.parse({
      model: MODEL,
      input: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Extract the following resume: ${content}` },
      ],
      text: {
        format: zodTextFormat(ResultSchema, "results")
      },
      temperature: 0,
    })

    if (result.usage) {
      const { input_tokens, output_tokens, total_tokens } = result.usage

      console.log(`Total tokens generated: ${total_tokens}`)

      const inputCost = (input_tokens / 1_000_000) * modelPricing[MODEL]["input"]
      const outputCost = (output_tokens / 1_000_000) * modelPricing[MODEL]["output"]
      const price = inputCost + outputCost

      console.log(`Input tokens: ${input_tokens}, Output tokens: ${output_tokens}`)
      console.log(`Total price of API call: $${price.toFixed(6)}`)
    }

    const parsed = result.output_parsed
    if (!parsed?.details) return parsed

    return { ...parsed, details: normalizeParsedResume(parsed.details as Resume) }
  } catch (e) {
    console.log(e)
    return { details: null, missing: [] }
  }
}