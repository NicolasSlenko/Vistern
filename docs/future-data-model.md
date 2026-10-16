# Vistern data models: current contract and future planning

[Editable future data model diagram](https://www.tldraw.com/f/md9lW4Xxx1JH4bmV7oX_9)

## Status and boundary

This document separates the **current application schema** from a **future domain model for discussion**. The current schema is specified in [data-hierarchy.md](data-hierarchy.md) and implemented by the four files in `supabase/migrations/`. It supports the present app's storage cutover: Clerk authenticates, Supabase holds structured user data, and S3 holds resume file bytes. Legacy S3 JSON remains available for first-read imports, with no new JSON writes.

The future model below is a planning aid based on the [teammate's student prototype](https://vistern-student.vercel.app/#today), its [team walkthrough](https://vistern-student.vercel.app/walkthrough.html), its [product vision](https://vistern-student.vercel.app/vision.html), and Vistern's [local v2 wireframes](wireframes/v2/README.md). It is **not a proposed migration to apply now**. The prototype uses browser-local state, sample people and posts, sample jobs, and simulated recommendations; it is not proof that those entities or exact fields belong in production.

The durable rule across both models is: one student-controlled master profile holds confirmed background; resume documents are versions made from selected background and can use target-specific wording. An uploaded resume proposes profile additions; it does not replace the profile. The prototype sometimes calls the editable canonical material a “master resume.” In the production model, that maps to the **master profile plus a current resume document**, not a second competing source of truth.

## Track A — make the current app work reliably

Keep the existing 14 user-data tables and the usage RPC as the migration contract. Do not add Career or Community tables just to mirror prototype pages.

| Current workflow | Existing persistence | Implementation status to verify |
| --- | --- | --- |
| Clerk sign-in and ownership | `clerk_user_id` on user rows; RLS policies | Native Clerk integration and the development-domain Supabase connection enabled 2026-10-16. Signed-in read endpoints return 200. Cross-user denial remains to verify with a second account. Production Clerk instance needs its own connection before deployment. |
| Resume upload and history | S3 file; `resume_documents` structured content, metadata, current/starred flags | On 2026-10-16, a signed-in upload created a Supabase row and S3 object. A real PDF then completed upload, parse, resume save, and feedback successfully; S3 HEAD confirmed the PDF object. The disposable test row/object were removed. History restore and second-account isolation still need checks. |
| Master profile | `student_profiles`, `profile_items`, `profile_item_sources` | Confirm accepted changes appear in the profile and old resume versions stay unchanged. |
| Resume import review | `profile_import_proposals` | Accept/skip is wired; editing an extracted proposal before acceptance remains a product/code task. |
| Resume feedback | `resume_feedback` | Confirm feedback remains attached to the correct document version. |
| Preferences, settings, coursework, usage | `user_preferences`, `user_settings`, `course_progress`, `daily_usage` | Confirm current screens persist and legacy first reads import correctly. |
| Saved roles and application stage | `saved_jobs`, `application_events` | Current stage changes update `saved_jobs`; the job route does not yet record each change in `application_events`. |
| Resume-to-profile traceability | `resume_document_items` | Table exists, but the current app does not populate it. |

The last two rows are examples of **existing-schema follow-through**, not reasons to add future tables now. A release check should also require a normal production build and a signed-in round trip against the selected Supabase project. API health and anonymous access checks alone cannot prove Clerk JWT/RLS behavior.

## Track B — future domain model to validate with wireframes

The teammate's prototype organizes Home, Career, Community, Resume, and Jobs as five sections. The local v2 concept uses Home, Explore, Roadmap, Opportunities, Student Profile, Documents, Activity, and Resources. These are different navigation arrangements over overlapping durable concepts. **Do not make one table per page or freeze a sidebar choice in the database.**

| Future domain | Candidate durable records and relations | Prototype behavior that motivates it | Open decision before schema design |
| --- | --- | --- | --- |
| Starting context and career direction | A student onboarding state, independent interests, followed career directions, optional career notes; references to curated role families | Resume can be skipped; a student may be undecided, compare careers, follow or unfollow several, and retain independent interests | Which answers are long-lived preferences, which are temporary setup progress, and how is a direction changed? |
| Suggestions and evidence | A recommendation with source profile items, job requirements, rule/model version, freshness, and student response | “What this is based on,” “I already did this,” start, save, postpone, dismiss | Which recommendations must be persisted, and what evidence can be shown safely? |
| Improvement work | An improvement plan with ordered steps, notes, links, completion state, optional schedule, and evidence submitted for review | Work persists across visits; suggestions are undated by default; unfinished steps carry into the next week | Can students edit steps, reuse a plan, or run multiple plans for one profile item? |
| Goals and weekly planning | Student goals or chosen priorities; planned actions with optional due date and origin; fixed-date events kept distinct | Home prioritizes real deadlines, then chosen work, then suggestions; scheduling is optional | Is a goal a separate record, a plan grouping, or just a preference until students use it? |
| Applications | An application record linked to a saved opportunity, optional exact `resume_document` version, stage history, notes, next step, due date, applied date, and external-resume indicator | Jobs → Applications shows a board, exact resume used, job snapshot, notes, next date, and timeline | Extend `saved_jobs` or split saved opportunity from application? Can one role have multiple application attempts? |
| Opportunity evidence | Curated/live source references, listing snapshot, checked-at time, eligibility unknown/known state, match evidence and gaps | Prototype warns when openings, deadlines, or eligibility are unverified | Which source data is durable versus disposable cache, and how often is it rechecked? |
| Resources and practice | Versioned school/global resource catalog, student saves, practice records, and review notes | Career guides, LeetCode/NeetCode progress, campus directories, external learning links | Which activity is entered manually versus imported with consent? What is the source of truth for course and event availability? |
| Community | Opt-in public member profile; posts, replies, saves, clubs/teams/events, sessions, messages, and moderation state | Feed, People, Around UF, Sessions, Messages, project teams, mentors | Scope, privacy, moderation, campus eligibility, messaging policy, and retention must be designed first. Sample prototype members are not production accounts. |
| Activity and reflection | User-visible event stream referring to the entity that changed, plus optional student reflection | Profile additions, plan progress, resume versions, application stages, lessons over time | Which events are worth retaining, and what is the deletion/retention rule? Current `application_events` is too narrow for all activity. |

### Relationship sketch, not SQL

```text
Clerk identity
  └─ Student profile ── confirmed profile items ── evidence / sources
       ├─ Resume documents ── selected profile items
       ├─ Career interests / followed directions
       ├─ Improvement plans ── steps ── optional weekly schedule
       ├─ Recommendation decisions ── cited profile/job evidence
       ├─ Saved opportunities ── applications ── exact resume version used
       ├─ Resource and community saves / participation
       └─ Activity events and reflections

University and public catalogs ── courses, roles, resources, clubs, events
S3 ── private resume file bytes referenced by resume documents
```

### Invariants to keep when the future model becomes real

- Clerk remains the identity provider. User-owned rows carry the Clerk subject and enforce ownership in RLS; public/community data needs an explicit visibility and moderation model rather than inheriting private profile access.
- A plan step marked complete is **not** proof of a skill, course completion, club participation, or project outcome. Add a confirmed profile fact only after student review and appropriate evidence.
- An AI suggestion or resume extraction stays a proposal until the student accepts or edits it. Keep its supporting excerpt/source and the decision history where useful.
- Store an application-time resume version so later profile or resume edits do not rewrite what was submitted. Allow an external resume when the student used one outside Vistern.
- Unfollowing a career does not erase separately chosen interests, plans, applications, or confirmed profile facts.
- Keep catalogs university-aware without making UF the only possible school. Give externally sourced jobs/resources a source URL and freshness/check status; do not present unknown eligibility as verified.
- S3 keeps private resume binaries; Supabase keeps structured records. Avoid a second durable JSON record in S3.

## Design gates before future migrations

1. Agree on the student journeys and navigation. Compare the newer five-section prototype with the local v2 concept and choose behavior before table names.
2. For each action in the walkthrough, specify what must survive sign-out, what is student-confirmed, what can be recomputed, and what is public or private.
3. Decide the application model, recommendation/evidence model, and plan/weekly schedule semantics. These have the most cross-feature links.
4. Define Community scope and moderation separately; do not infer production messaging or public profiles from sample prototype content.
5. Then draw the future ER diagram, define field-level contracts, review RLS and retention, and add versioned migrations in small slices.
