# Student UI and database integration

This branch combines `student-onboarding-and-home` with `dev/database`. Clerk authenticates students. Supabase stores structured resume data, the verified profile, onboarding answers, saved jobs, and career activities. S3 stores uploaded resume files. The Home and Career screens keep the teammate's navigation and activity behavior.

## Data mapping

| UI flow | Primary records | Legacy read |
| --- | --- | --- |
| Onboarding and Home focus | `student_profiles.onboarding` | `student-profile.json` in S3, once per user |
| Career activities and progress | `career_workspaces` | `career-workspace.json` in S3, once per user |
| Home saved jobs | `saved_jobs` | `job-board.json` through the existing import |
| Resume upload | S3 file plus `resume_documents` metadata | Existing resume JSON import |
| Resume verification | `resume_documents` and `profile_import_proposals` | No automatic master-profile merge |

Apply the migration `20261019160937_student_workspace_supabase.sql` to the same Supabase project used by `dev/database` before running the combined app. The existing four database migrations are prerequisites. The app uses `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` with Clerk's Supabase connection; the service-role key is not needed by this code path.

Before a production rollout, confirm that the production Clerk issuer is trusted by this Supabase project and that the Vercel environment variables point to the same project. The development Clerk connection alone does not establish production access.

The original `SCRUM-14-INTEGRATION.md` describes the teammate branch before the storage merge. Its earlier live QA results are historical and do not verify this combined branch.
