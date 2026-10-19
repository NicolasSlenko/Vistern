# SCRUM-14 — onboarding and Home integration

Scope selected with Pablo on October 16, 2026: onboarding and Home first.

Base: `NicolasSlenko/Vistern`, `main` at `7c336ee570804abb88d7a500b0440ad7024b2c4a`.
Branch: `feat/scrum-14-student-workspace`.

The October 16 repository invitation identifies this as the team repository. The integration is based on its current main branch and preserves the team’s configuration and architecture-page changes.

## Result

Signed-in root visits now enter `/home`. Students without a saved resume or completed introduction go to `/onboarding`. Existing resume owners can use Home immediately and complete their introduction later.

Onboarding carries over the prototype's year selection, optional resume, background categories, optional description, and tree progression. Resume import reuses the existing upload, parsing, verification, analysis, and save component. Outside onboarding, that component retains its `/dashboard` destination.

Home now restores the broader student workspace. It shows the next unfinished step in chosen work, recorded dates, campus resources, saved job records, and growth from completed activities. A recorded preparation date within seven days takes precedence without removing other activities. Resume access is secondary.

The five main areas are Home, Career, Community, Resume, and Jobs. Career supports project/classwork plans, exploration of the nine prototype career areas, eight guides, coding practice, notes, optional dates, pause/resume, and explicit completion. Community carries the prototype's real organization directory into the app and can create an activity retaining its source. Jobs offers resume-independent discovery resources and access to the existing matching and job board tools. The shared navigation also wraps the existing resume, matching, upload, and settings screens.

Community posts, messaging, live event feeds, automatic personalized insights, and the prototype's full application-preparation state machine are not implemented in this pass. No fictional prototype people, posts, jobs, or event dates were copied into real accounts. Completing a career activity never writes a resume claim.

## Visual direction

The implemented Home uses neutral surfaces, restrained green controls, an unframed botanical tree, one main work area, and supporting sections for community, opportunities, dates, and progress. The resume preview and focus selector were removed. Existing tools use compatible surface colors inside the shared navigation.

## Storage and authentication

- Clerk protects `/home`, `/career`, `/community`, `/jobs`, `/onboarding`, `/upload`, and the new POST APIs. The existing `/sign-in` screen is now explicitly public in middleware, alongside `/sign-up`.
- Student setup uses `uploads/{authenticatedUserId}/student-profile.json`. Career activities use a separate `uploads/{authenticatedUserId}/career-workspace.json` record.
- Career writes validate payloads and resource references, compare the client revision, and use conditional S3 writes to prevent concurrent overwrites. Conflicts return 409 while preserving the form. New dates are never assigned automatically.
- The profile schema covers year, background, setup progress, and optional Home focus. It does not modify `preferences.json`, resume documents, submission history, or existing scoring schemas.
- The server derives the user ID. Payloads cannot specify another account or storage key. Invalid payloads return 400, anonymous writes return 401, and storage failures return 500 with a retry message.
- A failed save retains the form and does not advance. Existing completion stays true when background is edited. Explicit step URLs support browser history.
- Prototype localStorage is not migrated into real accounts.

## Validation, October 16 (historical)

- TypeScript: passed.
- New components, routes, profile logic, preview, and tests: ESLint passed.
- `npm run test:student`: 10 tests passed, covering validation, account isolation, resume-free entry, returning users, retained background, focus changes, and storage failures.
- Full production build passed after the supplied development configuration was saved in the ignored, owner-readable `.env.local` file. All 45 static pages generated successfully. The earlier missing-Clerk-key build blocker is resolved.
- Browser preview: year validation, no-resume setup with project description, save-error recovery, saved Home focus after reload, existing sample-resume reuse, mobile menu Escape/focus restoration, and a 390px viewport with no horizontal overflow verified. No browser console errors were observed in these checks.
- Redesigned screens rechecked at desktop and 390px widths, including the no-resume/project-note path, persisted Home choice, save-error retry, and reuse of the existing sample resume.
- Live Clerk sign-in and onboarding without a resume passed. Senior year, the projects category, and a clearly labeled QA note persisted after a full page reload. The Home starting-point selection also persisted after reload using the actual application storage path.
- A fictional TXT resume uploaded successfully and the existing parser extracted its education, skills, and project for verification. See `docs/SCRUM-14-LIVE-QA.md` for the complete live test results and remaining checks.
- The full Next.js application runs at `http://localhost:4191/home`. Use `npm run start:local` after building. Binding Next to `127.0.0.1` while Clerk returns to `localhost` caused an authenticated rewrite loop and HTTP 500; using `localhost` for both resolved it.
- Original static prototype tests also passed (16 test files); the prototype was not modified.
- No deployment, remote push, pull request, Jira transition, or team message was made.

## Meeting preview

`npm run preview:student` serves `http://127.0.0.1:4190/onboarding` on this laptop only. It bundles the same React screen components with separate preview-only Clerk/router/state adapters. Sample data lives under dedicated `vistern-meeting-*` browser keys. Production routes have no preview authentication bypass or mock storage switch.

The preview intentionally explains unavailable existing-tool routes rather than presenting them as live. `docs/SCRUM-14-DEMO.md` provides the meeting walkthrough.

## Before merge

The supplied development configuration is installed only in the ignored `.env.local`. The production build, TypeScript checks, targeted ESLint, and 38 regression tests pass. The feature branch targets `NicolasSlenko/Vistern`; team review is still required before merging. Consult the latest live QA report for tested behavior and remaining limits.

## October 18 engineering checks

- 15 student-profile tests and six resume regression tests pass, along with TypeScript, targeted ESLint, and the production build.
- Live onboarding answers save and survive reloads with the supplied development environment.
- A fictional PDF uploaded, extracted correct education/skills/project details, was confirmed, and persisted in the existing S3 records.
- PDF extraction now uses the Uint8Array path required by the existing wrapper for this file. Failed or empty extraction stops before the AI call.
- Parsing no longer modifies the master profile; reviewed data merges only after confirmation. A read-back check verified that parsing alone left the saved profile unchanged.
- The Clerk account widget renders client-side to avoid hydration mismatch; Profile no longer duplicates its header.
- Client save failures retain answers and provide retry messages. File validation errors remain visible, and upload status uses actual operation names instead of a simulated percentage.
- See the updated live QA report for fixture state and remaining limits. No remote push or deployment has been made.

## Final flow and code review, October 18

All six activity types were saved through the authenticated interface, reloaded, reopened from Home, and paused after the test. Nine career pages and eight guides were checked. Preparation starts with editable steps; Home distinguishes an empty checklist from finished steps. Career saves validate returned state, retain errors in the editor, disable editing during a save, and show a confirmation after navigation.

The activity API follows the repository response format and protects writes with both revision checks and conditional S3 requests. Date comparisons use the UF campus calendar. Completing work only updates the activity record and tree progress. Resume data changes only through the existing reviewed-resume workflow.

Upload support is PDF, DOCX, and TXT. Legacy DOC files now explain how to convert instead of advertising an unsupported parser. Regression tests read actual PDF and DOCX fixtures and reject empty extraction before any AI call.

Validation commands:

```sh
npm ci
npm run test:student
npm run test:resume
npm run test:career
npm run build
npm run start:local
```

The local preview remains separate from the authenticated app. It is useful for visual review without service credentials, but its storage is not evidence of live persistence.
