# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start dev server with Turbopack
npm run build      # Production build (Turbopack)
npm run start      # Start production server
npm run lint       # Run ESLint
```

Regression tests run with `npm run test:student`, `npm run test:resume`, and `npm run test:career`. Build before `npm run start:local` to run the authenticated app at `http://localhost:4191`.

## Architecture Overview

**Next.js 15 App Router** student career workspace with resume analysis. All persistent data lives in **AWS S3** — there is no active database (Drizzle ORM is scaffolded but unused). Authentication is via **Clerk**.

### Data Flow

1. User uploads PDF/DOCX/TXT → `POST /api/upload` (stores raw file in S3, enforces 3 uploads/day limit)
2. `POST /api/parse` — extracts text → OpenAI GPT extracts structured data → Zod validates → returns a draft for review; `POST /api/resume` saves confirmed data and merges it into the master profile
3. `GET /api/resume` — fetches resume data; `ResumeContext` calls this on mount
4. `POST /api/analyze/xyz-batch` — GPT generates XYZ-framework feedback + actionable insights → cached in `xyz-feedback.json` on S3
5. Dashboard computes scores client-side via `src/lib/resumeScoring.ts`

### S3 Key Structure

All keys are prefixed by `uploads/{userId}/`:
- `resume-data.json` — current parsed resume (source of truth)
- `xyz-feedback.json` — cached GPT feedback (XYZ analysis + actionable insights)
- `submissions-metadata.json` — up to five unstarred uploads, plus starred uploads
- `master-profile.json` — aggregated data across uploads
- `matched-courses.json` — UF course matching cache
- `resume-data-{submissionId}.json` — versioned snapshots
- `student-profile.json` — onboarding answers and completion
- `career-workspace.json` — versioned activity plan, notes, dates, and completion
- `job-board.json` — jobs saved through the existing matching tool

### State Management

`ResumeContext` (`src/contexts/resume-context.tsx`) is the source of client resume state:
- Loads resume + XYZ feedback on mount from S3 via API routes
- Triggers lazy generation of XYZ feedback if missing
- Persists UI state (e.g., `showAiFeedback`) in localStorage
- Consumed via the `useResume()` hook — all dashboard/profile components use this

Home, Career, Community, and Jobs use server loaders for authenticated data. Career mutations validate Zod payloads and use revision checks with conditional S3 writes; they never modify the resume.

### Resume workspace (front end only, mock data)

`/resume` (generated resume with section review), `/resume/experience` (master profile editor) and `/resume/tailor` (per-role resumes) replace the old `/profile` page in the sidebar. They are not wired to Supabase yet: state comes from `src/lib/resume/mock-data.ts`, is reduced in `src/lib/resume/workspace.ts`, and persists to `localStorage` via `ResumeWorkspaceProvider`. Suggestions are mock rules, not AI. Model rules: the profile is the only source of truth; rejecting a suggestion leaves it unchanged; tailored wording never writes back; every level stores `visibility` (default `private`) but the Public option is hidden. Tests: `npx tsx --test tests/resume-workspace.test.ts`.

### API Route Conventions

- Auth: every route calls Clerk's `auth()` and returns 401 if unauthenticated
- Response shape: `{ success: boolean, data?: T, error?: string }`
- S3 helpers in `src/lib/aws/s3.ts`: `getJsonFromS3<T>`, `putJsonToS3`, `objectExistsInS3`, `getSignedUrlForObject`

### Resume Schema

Defined with Zod in `src/app/api/parse/resumeSchema.ts`. The `Resume` type is inferred from this schema and is the shared type used across frontend and API routes. Any structural change to the resume must start here.

### Scoring System (`src/lib/resumeScoring.ts`)

Blends quality (60%) and quantity (40%) scores per category. Category weights differ for UF vs non-UF students (coursework is UF-only at 15%). Quality scores come from `src/lib/qualityAnalysis.ts` which uses heuristic analysis per section. The scoring runs entirely client-side.

### AI Provider Layer (`src/lib/ai/index.ts`)

All AI calls go through `generateObject` (Zod-validated JSON), `generateText`, and `embed`. Never construct an OpenAI/Anthropic client in a route. Providers: `hipergator` (UF LiteLLM proxy, `gemma-4-31b-it`, free), `openai` (`gpt-6-luna`) and `claude` (`claude-haiku-5-5`, via `@anthropic-ai/sdk`); the paid two use their cheapest current model.

Each user picks a provider (Settings, or the `AiProviderPicker` quick switch), stored in `user_settings.ai_provider`; `AI_PROVIDER` is the default for everyone else. Routes call `resolveAiProvider(userId)` from `src/lib/ai/resolve.ts` **once per request, after any cache hit**, and pass the result as `provider`. A paid provider uses one `paidAi` daily request (`PAID_AI_DAILY_LIMIT`); over the limit the request falls back to HiPerGator.

`embed` ignores the user's choice and uses the default provider's embedding model (Claude has none). Claude and OpenAI reasoning models (GPT-5+) don't get `temperature`. Every call logs tokens and estimated cost; prices live in `MODEL_PRICING`.

### XYZ Feedback Model

Uses the configured AI provider. Output is Zod-validated — if the schema changes, update both the Zod schema in the route and the `XyzFeedback` type used in context. Feedback is cached in S3; to force regeneration, delete `xyz-feedback.json` for that user.

### Course Matching (`src/lib/courseMatching.ts`)

Fuzzy matching via Levenshtein distance against the UF course catalog. Courses are grouped by CS discipline. Only relevant for UF students (gated by preferences questionnaire).

## Environment Variables

See `.env.example`. Required at runtime:
- `HIPERGATOR_API_KEY` (+ `HIPERGATOR_EMBEDDING_MODEL`) for the default provider; `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` are optional and enable those choices in the model picker
- `AWS_BUCKET_NAME`, `AWS_BUCKET_REGION`, `IAM_AWS_ACCESS_KEY`, `IAM_AWS_SECRET_ACCESS_KEY` — S3
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` — Clerk auth

## Path Aliases

`@/*` maps to `./src/*` (configured in `tsconfig.json`).
