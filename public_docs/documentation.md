# Vistern documentation

This is the public project reference for the current `ui/zip-paper-theme` code. It describes implemented behavior and calls out planned or legacy pieces separately. AI features (provider layer, model choice, live matching, bullet writing, tailoring) are documented in [`ai-layer.md`](ai-layer.md). The local `docs/` workspace is excluded from Git; public diagrams are in [`diagrams/`](diagrams/).

## Purpose and users

Vistern is a career workspace for college students seeking technical internships. It helps a student capture experience from coursework, projects, and work; review a resume; improve its wording; explore roles; and track useful actions through a recruiting cycle. The interface should give a clear next step and explain the evidence behind feedback, without treating a match score as a hiring prediction.

## Main workflows

1. **Sign in and start.** Clerk authenticates the student. Onboarding collects year, background, and career direction. A student can begin without a resume. Home presents current work, dates, opportunities, and progress.
2. **Build a student record.** Career supports project or classwork plans, exploration, learning guides, coding practice, notes, optional dates, pause/resume, and explicit completion. Community links to university organizations and can save a related activity. Completing an activity does not automatically add a claim to a resume.
3. **Upload and verify a resume.** The upload API checks file type and size, stores the source in private S3, and creates a resume document record. Parsing extracts text and uses the student's AI provider (UF HiPerGator by default) with the Zod resume schema. The student reviews the result before confirmation.
4. **Reconcile an upload with the profile.** A new resume proposes additions and revisions to the master profile in the upload flow. The student accepts or skips each change before the profile is written. Additions start selected; revisions start unselected so existing wording is not silently replaced.
5. **Improve a resume.** The resume shelf and studio show documents, a marked-up paper preview, line-level suggestions, review notes, and editable wording. "Improve" offers three AI-written versions of a bullet to choose from and edit, and "Write it with AI" drafts a new entry. Profile facts and resume documents remain separate: editing a document does not change the master profile.
6. **Find and track opportunities.** Jobs provides discovery resources and access to live matching. Students can compare a resume with a role, generate a one-page resume tailored to it, save a job, and update its application stage. Listings and match evidence depend on the source and may become stale.

## Recent UI and scoring changes

The paper-style interface uses a shared light/dark design system, a student navigation shell, a resume studio, an annotated paper preview, and a growth view on Home. The design adaptation from resumezip is credited in [`NOTICE.md`](../NOTICE.md).

The current resume substance score uses one calculation path for Home, the resume shelf, and the studio. Its weights are **projects 35%, experience 30%, impact 15%, skills 12%, links 8%, GPA 0%, coursework 0%**. Impact is a deterministic check of resume bullets for a strong opening verb, a meaningful quantity, and an outcome. GPA and coursework can still appear in the resume, but they do not change this score. Where valid saved XYZ feedback exists, project and experience quality can blend heuristic and AI scores. The formula is in `src/lib/resumeScoring.ts`; impact rules are in `src/lib/resume/impact.ts`.

Craft is displayed separately as a checklist, such as “5 of 8 clear,” rather than folded into the substance score. Its eight checks cover contact details, links, bullets, dates, readability, length, skills, and education. The rules are in `src/lib/resume/craft.ts`.

Students can tick review notes in the panel or inside entry cards. A tick removes the note from both views, their section count, and the card indicator. Dismissal is keyed by the note's section and normalized text, stored in browser `localStorage`, and reversible through “show them again.” It is a reading preference, not a resume edit or server record.

The former `/api/profile/import-proposals` route and its queue writes were removed. Upload reconciliation now happens inline. The historical `profile_import_proposals` database table may still exist on deployed databases because migrations are retained; it is not part of the current application flow. Do not drop it without reviewing deployed data and a new migration.

## Architecture and data ownership

The application is built with Next.js App Router, React, and TypeScript. Clerk is the identity provider. Supabase Postgres stores structured profiles, resume documents and feedback, preferences, settings, saved jobs, and application data. S3 stores private resume file bytes and still supports compatibility reads for legacy JSON records. Career activity and some onboarding records still use S3 JSON; do not assume every persistent record has moved to Supabase.

The canonical resume shape is `src/app/api/parse/resumeSchema.ts`. `src/contexts/resume-context.tsx` supplies shared client resume state. The versioned Supabase schema lives in `supabase/migrations/`. User-owned Supabase rows use the Clerk subject and row-level security. A production Clerk issuer and Supabase connection must be configured together and verified with a signed-in account before rollout.

Resume documents preserve individual versions. The upload endpoint accepts PDF, DOCX, and TXT files up to 10 MB, limits ordinary users to three uploads per day, and retains the ten most recent unstarred source uploads plus starred uploads. Old DOC files require conversion; scanned-PDF OCR is not implemented.

The Settings screen lets students edit their display name, choose their AI model, toggle AI feedback, choose whether to share anonymized resume data for academic research (off by default), and request account deletion. Secret credentials belong in `.env.local` or deployment secret settings, never in Git or `NEXT_PUBLIC_` variables.

## Important application routes and APIs

The main student destinations are `/home`, `/career`, `/community`, `/resumes`, `/profile`, `/jobs`, `/match`, `/upload`, and `/settings`. Key server routes include:

| Route | Purpose |
| --- | --- |
| `POST /api/upload`, `POST /api/parse`, `GET/POST /api/resume` | Upload, structure, verify, and save a resume |
| `/api/resume-documents`, `/api/resume-submissions` | Documents, versions, stars, and restore |
| `/api/profile`, `/api/student-profile`, `/api/career` | Profile and student workspace state |
| `/api/analyze/bullets`, `/api/analyze/xyz-batch` | Line-level and XYZ feedback |
| `/api/analyze/bullet-options` | Three bullet options, or a drafted new entry |
| `/api/match`, `/api/match-live`, `/api/job-board` | Role comparison, live listings, saved jobs |
| `/api/tailor-resume`, `/api/export/latex` | Tailored one-page resume and LaTeX/Overleaf export |
| `/api/ai-provider` | The student's AI model choice |
| `/api/settings`, `/api/delete-account` | Preferences and account controls |

API handlers authenticate the user before accessing private data. The exact route contract is defined in `src/app/api/`; older route descriptions in Git history may refer to the previous storage model.

## Local setup and dependencies

Use Node.js 24.x and npm. Run `npm install`, copy `.env.example` to `.env.local`, fill in development credentials, then run `npm run dev`. Run `npm run build` for a production build. The main declared packages are Next.js `^15.5.9`, React `^19.1.4`, TypeScript `^5`, Tailwind CSS `^4`, Clerk `^6.35.0`, and Supabase JS `2.117.3`; the lockfile resolves exact installations.

All AI calls go through `src/lib/ai`: UF HiPerGator (`HIPERGATOR_API_KEY`) is the free default, `OPENAI_API_KEY` enables GPT and is needed for live-match embeddings, and `ANTHROPIC_API_KEY` optionally enables Claude; see [`ai-layer.md`](ai-layer.md#setup). Adzuna and The Muse supply live job listings. AWS S3, Supabase, and Clerk credentials are needed for authenticated end-to-end flows. `SUPABASE_KEY` appears as a reserved placeholder in `.env.example` but is not read by current application code.

## Verification and known limits

The October 18 authenticated walkthrough in Git history covered onboarding, resume upload and verification, saved Career work, job search and saving, and mobile navigation. It reported 38 regression tests, targeted ESLint, TypeScript checking, and a production build passing at that point. On October 27, the six current test scripts passed **74 tests** in total; `npx tsc --noEmit`, targeted ESLint on the edited review panel, and `npm run build` also passed. The scoring script accounts for 13 of those tests. On October 28, after the AI provider layer, bullet writing, job-level filtering and tailoring changes, all **99** tests passed (`npx tsx --test tests/*.test.ts`), along with `npx tsc --noEmit`, `npm run lint` and `npm run build`. Use these commands to verify a later checkout:

```text
npm run test:student
npm run test:career
npm run test:resume
npm run test:parse
npm run test:merge
npm run test:score
npm run test:bullets
npm run test:ai
npm run test:jobs
npx tsc --noEmit
npm run build
```

Cross-account isolation with a second real account, production Clerk/Supabase authentication, full production deployment, every external resource, all job-stage changes, Claude as a provider with a real key, and the complete existing resume editor have not been documented as end-to-end verified. Community posts and messages, a live event feed, and the prototype's full application-preparation state machine are not implemented. Live job freshness depends on Adzuna.

## Diagrams and maintenance

- [`diagrams/vistern-data-er.svg`](diagrams/vistern-data-er.svg) shows the schema, including the historical import-proposals table that current code no longer writes.
- [`diagrams/vistern-architecture-map.html`](diagrams/vistern-architecture-map.html) is an interactive architecture concept; some future components shown there may not be implemented.

Keep this file aligned with code when shipping workflows. Update the canonical resume schema and dependent types together, add database changes as reviewed versioned migrations, and test authenticated persistence as well as the build. The repository has no license for Vistern's own code; [`NOTICE.md`](../NOTICE.md) records the third-party MIT design attribution.
