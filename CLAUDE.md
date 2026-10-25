# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Response Style — Caveman Mode (ALWAYS ACTIVE)

Terse. Technical substance stays. Fluff dies.

**Active every response. No revert. Off only if user says "stop caveman" or "normal mode".**

### Rules

Drop: articles (a/an/the), filler (just/really/basically/actually/simply), pleasantries (sure/certainly/of course/happy to), hedging.
Fragments OK. Short synonyms (big not extensive, fix not "implement a solution for"). Abbreviate common terms (DB/auth/config/req/res/fn/impl). Use arrows for causality (X -> Y). One word when one word enough.

Technical terms stay exact. Code blocks unchanged. Errors quoted exact.

Pattern: `[thing] [action] [reason]. [next step].`

Not: "Sure! I'd be happy to help you with that. The issue you're experiencing is likely caused by..."
Yes: "Bug in auth middleware. Token expiry check use < not <=. Fix:"

### Auto-Clarity Exception

Drop caveman temporarily for: security warnings, irreversible action confirmations, multi-step sequences where fragment order risks misread, user asks to clarify or repeats question. Resume caveman after.

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

### API Route Conventions

- Auth: every route calls Clerk's `auth()` and returns 401 if unauthenticated
- Response shape: `{ success: boolean, data?: T, error?: string }`
- S3 helpers in `src/lib/aws/s3.ts`: `getJsonFromS3<T>`, `putJsonToS3`, `objectExistsInS3`, `getSignedUrlForObject`

### Resume Schema

Defined with Zod in `src/app/api/parse/resumeSchema.ts`. The `Resume` type is inferred from this schema and is the shared type used across frontend and API routes. Any structural change to the resume must start here.

### Scoring System (`src/lib/resumeScoring.ts`)

Blends quality (60%) and quantity (40%) scores per category. Category weights differ for UF vs non-UF students (coursework is UF-only at 15%). Quality scores come from `src/lib/qualityAnalysis.ts` which uses heuristic analysis per section. The scoring runs entirely client-side.

### XYZ Feedback Model

Uses `gpt-4.1-mini`. Output is Zod-validated — if the schema changes, update both the Zod schema in the route and the `XyzFeedback` type used in context. Feedback is cached in S3; to force regeneration, delete `xyz-feedback.json` for that user.

### Course Matching (`src/lib/courseMatching.ts`)

Fuzzy matching via Levenshtein distance against the UF course catalog. Courses are grouped by CS discipline. Only relevant for UF students (gated by preferences questionnaire).

## Design System — the "paper" theme

Adapted from [resumezip](https://github.com/ian-hoang/resumezip) (MIT) — see `NOTICE.md`. It is **additive**: it introduces its own tokens next to the existing shadcn ones rather than renaming them, so a page opts in.

Stylesheets, imported at the top of `src/app/globals.css`:

| File | Holds |
| --- | --- |
| `src/app/styles/zip-tokens.css` | Colour, radius, shadow and easing tokens, light and dark; `label-mono`, `bg-hatch`, `no-scrollbar` |
| `src/app/styles/zip-glass.css` | `.glass` and its tints, and `.desk` — the painted sky |
| `src/app/styles/zip-sheet.css` | `.paper-frame`, `.paper`, the segmented control, `brand-button` / `white-button` / `ink-button` / `lift-button` |
| `src/app/styles/zip-studio.css` | Studio-only: the score odometer, dotted leaders, the `ai-ask` pill. All scoped under `.zip-scope` |

Vocabulary: `bg-paper bg-sheet bg-fill` · `text-ink text-ink-2 text-ink-3` · `border-hairline border-rule border-rule-strong` · `text-brand` (Vistern green, standing where resumezip used blue) · `text-alert text-caution` · `shadow-card-rest|open|lifted` · `font-serif` (Newsreader, page titles only) · `label-mono`.

**Dark mode** works by re-declaring the `--color-*` tokens under `.dark`, outside `@layer theme`. Use `@theme` (not `@theme inline`) for anything that must follow the theme.

**Breakpoints in the studio are container queries** (`@6xl/studio:`), not viewport ones: the studio sits inside the student shell's 224px sidebar, so a viewport breakpoint misjudges the room it actually has.

`src/components/student/student-theme.css` re-points the `--student-*` and shadcn variables that the older pages read at these tokens, so pages that have not been rebuilt still take the palette. It also gives `.career-page` and `.student-tool-page` the sheet-over-sky treatment with `:has()`.

### Resume studio

`src/components/resume-studio/` — `studio-shell.tsx` is the frame (desk → `paper-frame` → `paper` → top bar over two or three columns); `profile-studio.tsx` and `resume-doc-studio.tsx` are the two things that use it.

**The master profile and resume documents are deliberately separate.**

- `/profile` → `student_profiles` + `profile_items`. One record of what the student has actually done. Two columns, no page preview — there is no single document for it to be.
- `/resumes` → `resume_documents`. Many: one per kind of role. `/resumes/[id]` is three columns — the uploaded file on the right, its wording in the middle, the AI's rewrites on the left. Editing a resume never writes back to the profile.

### Line-level AI suggestions

`POST /api/analyze/bullets` returns a replacement for each weak bullet, tagged with `section · entryIndex · field · bulletIndex` and the bullet's original words. Cached in `resume_feedback` under `feedback_type = 'bullets'`.

`src/lib/resume-suggestions.ts` matches a rewrite back to the line it is about and drops any whose text has changed since — better no suggestion than one applied to the wrong words. `useBulletReview` (`src/components/resume-studio/use-bullet-review.ts`) holds the answers; `bullet-list.tsx` draws each bullet with its suggestion, a tick and a cross.

This is separate from `/api/analyze/xyz-batch`, which scores whole entries and plans a career.

## Preview harnesses

Neither needs Clerk, Supabase, S3 or OpenAI — esbuild swaps those modules for adapters.

```bash
npm run preview:student   # the onboarding/home prototype, :4190
npm run preview:studio    # the resume studio, shelf and master profile, :4192
```

`preview:studio` has switches for the three views, for dark mode, and for "wide", which lays the studio out at 1512px and scales it down — the container queries make that an honest picture of the three-column layout.

## Environment Variables

See `.env.example`. Required at runtime:
- `OPENAI_API_KEY` — GPT calls
- `AWS_BUCKET_NAME`, `AWS_BUCKET_REGION`, `IAM_AWS_ACCESS_KEY`, `IAM_AWS_SECRET_ACCESS_KEY` — S3
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` — Clerk auth

## Path Aliases

`@/*` maps to `./src/*` (configured in `tsconfig.json`).
