import { generateObject, type AiProvider } from "@/lib/ai";
import ResumeSchema from "./resumeSchema";
import { z } from "zod";

const ResultSchema = z.object({
  details: ResumeSchema.omit({ gamification: true }),
  missing: z.array(z.string())
})


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

Return:
{
  "details": {},   // must match provided schema
  "missing": []    // required basics/education fields that are absent
}
`

export const extractWithChatGPT = async (content: string, provider: AiProvider) => {
  if (!content.trim()) throw new Error("Resume text is empty")
  try {
    const result = await generateObject({
      provider,
      system: SYSTEM_PROMPT,
      prompt: `Extract the following resume: ${content}`,
      schema: ResultSchema,
      name: "results",
      temperature: 0,
    })

    // Token usage and cost are logged by the AI layer.
    return result.data
  } catch (e) {
    console.log(e)
    return { details: null, missing: [] }
  }
}