# AI features

How Vistern's AI features are wired: the shared provider layer, per-student model choice, live job matching, 3-option bullet writing and resume tailoring. The layer was introduced in [PR #1](https://github.com/NicolasSlenko/Vistern/pull/1) (`demo` → `dev`, by Patrick Leimer). Sections marked **later** describe changes made after that PR.

## How a request flows

```text
1. Student clicks something AI-powered
   (upload resume, load live matches, tailor, Improve a bullet, ...)
        │
        ▼
2. The page calls an API route, e.g. POST /api/analyze/bullet-options
        │
        ▼
3. resolveAiProvider(userId)                       src/lib/ai/resolve.ts
     ├─ the student's choice                       Supabase: user_settings.ai_provider
     ├─ nothing chosen → server default            AI_PROVIDER, if its key is set
     └─ paid choice (GPT/Claude) → uses 1 of today's paid requests
                                   none left → HiPerGator, if configured
        │
        ▼
4. The layer                                       src/lib/ai/index.ts
     generateObject(...)   JSON in a fixed shape, checked by a Zod schema
     generateText(...)     plain text (LaTeX export)
     embed(...)            vectors, for similarity search
        │
        ▼
5. The provider answers; the layer logs tokens and cost, validates the
   reply, and the route returns it. For bullets, the student picks one of
   three options (and can edit it) before anything is saved.
```

| File | Job |
| --- | --- |
| `src/lib/ai/index.ts` | The only code that talks to an AI provider: models, prices, timeouts, cost logs, `generateObject` / `generateText` / `embed` |
| `src/lib/ai/resolve.ts` | Picks the provider for one request: the student's choice, the default, the paid limit, fallback |
| `src/app/api/ai-provider/route.ts` | Reads and saves the student's choice for the picker |
| `src/components/ai-provider-picker.tsx` | The model dropdown (Settings, Match) |
| `src/lib/usageLimits.ts` | Daily counters, including `paidAi` |
| `src/lib/bullet-writing.ts` | Rules and prompts for 3-option bullets |
| `src/app/api/analyze/bullet-options/route.ts` | Writes the three options (fix one bullet, or draft a new entry) |
| `src/components/resume-studio/bullet-options.tsx` | The "Improve this bullet" window |
| `src/components/resume-studio/new-entry-wizard.tsx` | The "Write it with AI" walkthrough |
| `src/lib/resumePageBudget.ts` | One-page line budget for tailored resumes (later) |
| `supabase/migrations/20261026120000_ai_provider_choice.sql` | Stores the choice; allows the `paidAi` counter |

**New AI code calls the layer, never an SDK directly.** No `new OpenAI()`, `responses.parse` or `zodTextFormat` exists outside `src/lib/ai`.

## 1. Provider layer

Before the layer, nine routes each created their own OpenAI client with a hardcoded `gpt-4.1-mini`, so changing provider meant editing nine files.

| Provider | Model (override in `.env`) | Price per 1M tokens (in / out) | Connection |
| --- | --- | --- | --- |
| **HiPerGator** (default) | `gemma-4-31b-it` (`HIPERGATOR_MODEL`) | free through UF | OpenAI SDK pointed at UF's LiteLLM proxy, `https://api.ai.it.ufl.edu/v1` |
| OpenAI | `gpt-6-luna` (`OPENAI_MODEL`) | $0.10 / $0.50 | OpenAI SDK, Chat Completions |
| Claude | `claude-haiku-5-5` (`CLAUDE_MODEL`) | $0.10 / $0.50 | Anthropic SDK, native structured outputs |

- **One schema for every provider.** Routes describe output with Zod. OpenAI and HiPerGator receive it as a strict JSON schema; Claude receives the same schema in `output_config.format`. The reply is validated against the Zod schema, and one that doesn't fit returns `data: null` rather than crashing the page.
- **Chat Completions, not the Responses API**, because HiPerGator's proxy supports it reliably.
- **`temperature`** goes only to models that accept it (HiPerGator). OpenAI's GPT-5+ reasoning models and the current Claude API reject custom values.
- **Cost logging:** every call prints `[ai] <feature> <model>: <in> in / <out> out, $<cost>`. Prices are in `MODEL_PRICING`; HiPerGator's can be set with `HIPERGATOR_PRICE_INPUT` / `HIPERGATOR_PRICE_OUTPUT`.
- **HiPerGator safety limits:** open models in JSON mode occasionally never finish, so calls are capped at 8,000 output tokens (a full resume needs about 2,000) and time out after 60 s with one retry.
- **Placeholder keys don't count:** an empty key, or one still starting `your-` from `.env.example`, makes that provider "not configured".
- **Each client uses only its own key (later).** The OpenAI SDK reads `OPENAI_API_KEY` when given no key. On a deployment with an OpenAI key but no HiPerGator key, that sent the OpenAI key to UF's proxy, which rejected every call with 401. Every client now takes its key explicitly and throws `AiNotConfiguredError` before any request when it is missing, and routes show that message instead of a generic failure.
- **Default provider (later).** `AI_PROVIDER` (else HiPerGator) is the default only when its key is set; otherwise the first configured provider is used.

## 2. Per-student model choice and paid limit

- `resolveAiProvider(userId)` runs **once per request, after any cache hit**, so cached results never use up the limit. One button press counts once even when it makes many AI calls (live matching makes about ten).
- Over the daily paid limit (`PAID_AI_DAILY_LIMIT`, default 20), requests **fall back to HiPerGator** when it is configured; with no free provider the limit holds and the student sees "You've used today's AI requests." `OWNER_CLERK_USER_ID` is unlimited.
- If the choice can't be read (for example, the migration isn't applied), the route logs a warning and uses the default.
- **Picker:** in Settings → Preferences and the Match header. It lists each model, free or paid, and "N paid requests left today". It uses its own `GET/PUT /api/ai-provider`, because `PUT /api/settings` resets `dataSharing` when that field is missing from the request.
- AI route responses may include `aiProvider`, naming the provider that answered.
- **Migration** `20261026120000_ai_provider_choice.sql` adds `user_settings.ai_provider` and allows `paidAi` in `daily_usage` and `consume_daily_usage`. `database.types.ts` matches it.

## 3. Live job matching (embeddings and retrieval)

```text
Adzuna + The Muse ──▶ job listings
        │
        ▼
level filter (src/lib/jobs/listing-filter.ts) ──▶ only the levels the student asked for   (later)
        │
        ▼
embed()  resume summary + every job ──▶ one vector each, in one request
        │
        ▼
cosine similarity (src/lib/vectorSearch.ts) ──▶ the 10 jobs closest to the resume
        │
        ▼
generateObject() × 10 on the student's provider ──▶ score, strengths, gaps, recommendations
```

- An **embedding** is a list of numbers capturing what a text is about: "React frontend intern" lands near "Frontend engineering internship" and far from "Barista". Embedding is far cheaper than a model call, so it narrows hundreds of listings and the written analysis runs only on ten.
- **One embedding model for everything**, because the resume and jobs must share a model to be comparable and Claude has no embeddings API. `embed()` ignores the student's choice and uses OpenAI `text-embedding-3-small`, unless the default is HiPerGator and `HIPERGATOR_EMBEDDING_MODEL` is set.
- **Level filter (later).** Job boards match search words anywhere in a posting, so "intern software" also found staff roles that mention mentoring interns. Each listing is classified (intern, entry, mid, senior) from its title and required years, and kept only if the student asked for that level. Tested by `npm run test:jobs`.
- **Cache (later).** Results are stored in Supabase `resume_feedback` as `live_jobs`, valid for a day per resume content and preferences (`src/lib/jobs/live-cache.ts`). The page reads the cache first and searches only on a miss or when refresh is pressed. This replaced the in-memory cache from PR #1, which was lost on restart.
- Vectors are still computed per request and discarded; storing them with `pgvector` is a possible next step.

## 4. 3-option bullet writing

**"Improve this bullet" window**

- Shows the current bullet and **three options**, each labelled with what it emphasises ("Impact first", "Technical depth", "Concise") and why it is strong.
- Click an option to select and **edit** it; **Use this** applies it. **Regenerate** gives three new ones without repeats. **Add context** takes facts ("it served 200 students") and rewrites with them.
- **No invented numbers.** The model may only use numbers the student gave. Where a number would help and none was given, it writes a highlighted `[placeholder]`, and **Use this stays disabled until it is replaced**.
- Every option is one line, starts with an action verb (present tense for ongoing roles), follows the XYZ formula where the facts allow, and contains no dates.

**Where it opens** — Experience, Projects and Activities only (education, awards and certifications are lists, not achievement bullets):

- **Improve** on any bullet in the Master profile and My resumes editor
- **More options** beside Use this / Keep mine on the AI's existing suggestions, in the editor and on the resume paper

**"Write it with AI" walkthrough**, next to "Fill one in myself" when adding an entry:

1. Basics: name or role, organisation, dates, tools
2. Story: what you did, the problem and for whom, any results
3. Bullets: as many as the student's other entries in that section usually have (2–5, default 3), each with three options to pick, edit, regenerate or skip
4. Review, then add to the profile

**Backend:** `POST /api/analyze/bullet-options` with `mode: "fix"` (one bullet) or `mode: "draft"` (a new entry). Rules and prompts are in `src/lib/bullet-writing.ts`, tested by `npm run test:bullets`. The AI is called only on a click: one request per click, counted once toward the paid limit.

## 5. Resume tailoring (later)

Used by "Tailor" on the Match page: `POST /api/tailor-resume` selects content, then `POST /api/export/latex` writes a Jake Gutierrez-template LaTeX file for download or Overleaf.

- **Source:** experiences and projects come from the master profile (`profile_items` with `verification_status = 'verified'`), falling back per section to the current resume when the profile has none. Header and education come from the current resume; other sections from the profile.
- **Selection:** the model sees the job title, company and first 4,000 characters of the description, plus every experience and project with numbered bullets. It picks entries **and the bullets within each** (2–4 per experience, 1–3 per project), most relevant first, judging overlap with the job's skills and technologies, measurable impact and recency. At least two projects are kept when the student has them.
- **One page:** `src/lib/resumePageBudget.ts` estimates lines per entry and bullet. The prompt states how many lines are left after the header, education, skills and other sections; afterwards `fitToOnePage` trims, in order, activities and publications, extra achievements and certifications, extra bullets, then the lowest-ranked entries, always keeping one experience and one project. The 60-line budget was calibrated by compiling the template with pdflatex (pages overflow at about 66).
- **LaTeX step:** the prompt lists the exact experience and project entries required and shows the section markup. Bullets are copied verbatim unless improvements are supplied.

## 6. Every AI route uses the layer

`api/parse` (and `semanticParse.ts`), `api/analyze/{xyz, xyz-batch, insights, bullets, bullet-options}`, `api/match`, `api/match-live`, `api/tailor-resume`, `api/export/latex`, and `src/lib/embeddings.ts`.

## 7. Other changes in PR #1

- **Mock resume workspace removed.** The `/resume` pages showing sample data ("Alex Rivera") were removed with their components and `src/lib/resume/{mock-data,types,workspace}.ts`. Links go to the real Master profile (`/profile`) and My resumes (`/resumes`). `craft.ts` and `impact.ts` stay.
- **Overleaf opens reliably:** the tab opens during the click and the LaTeX is posted into it when ready, since browsers block a tab opened seconds later.
- **Live-match failures are logged** instead of silently falling back to the similarity score.
- **UI:** suggestion buttons no longer squash their labels; the resume paper's zoom bar has its `glass` class.

## Setup

1. `npm install` (includes `@anthropic-ai/sdk`).
2. In `.env.local` (see `.env.example`), then restart `npm run dev`:
   - `AI_PROVIDER="hipergator"`, `PAID_AI_DAILY_LIMIT="20"`
   - `HIPERGATOR_API_KEY`, `HIPERGATOR_BASE_URL="https://api.ai.it.ufl.edu/v1"`, `HIPERGATOR_MODEL="gemma-4-31b-it"`
   - `OPENAI_API_KEY`: needed for live-match embeddings; also enables GPT in the picker
   - `ANTHROPIC_API_KEY`: optional, enables Claude in the picker
3. Apply `supabase/migrations/20261026120000_ai_provider_choice.sql` (Supabase → SQL Editor). Until then everything runs on the default provider and saving a choice shows an error.

## Verification

- PR #1, on `demo`: `npx tsc --noEmit`, `npm run lint`, `npm run build` passed; 88 tests passed. Live checks covered HiPerGator (parse, a 5-project resume in about 10 s, text generation, 10 parallel job matches, both bullet modes), OpenAI structured output, text and embeddings, and upload, tailoring and LaTeX/Overleaf in the app.
- October 28, on `claude/demo-consolidate`: `npx tsc --noEmit`, `npm run lint` and `npm run build` passed; all **99** tests passed (`npx tsx --test tests/*.test.ts`).
- Not verified: Claude with a real key.

## Known risks

- **Gemma and structured output:** an unusual input can still produce JSON that fails the schema; the route then gets `data: null`. The output cap and timeout stop it hanging.
- **The cheapest models are less capable** than the old `gpt-4.1-mini`. Swap with `OPENAI_MODEL` / `CLAUDE_MODEL`, no code change.
- **Tailoring selection is model judgement** with no keyword or embedding score behind it, so picks can vary between runs. The page budget is an estimate with a margin of a few lines.
- **Legacy settings import:** a student whose settings live only in the old S3 file, who picks a model before ever opening Settings, skips the one-time import of their data-sharing choice.

## Next steps

- Cache prompts or keep context between related calls.
- Measure and tune how often AI is called and what it costs.
- Store job and profile vectors with `pgvector`.
