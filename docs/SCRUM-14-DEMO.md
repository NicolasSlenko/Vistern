# Vistern walkthrough

Use the authenticated application at `http://localhost:4191/home`. Build with `npm run build`, then run `npm run start:local`. Development credentials belong in the ignored `.env.local`; they are not included in the branch.

## Ticket and implementation

SCRUM-14 asks for the agreed prototype screens in the existing Vistern application, on a feature branch, while preserving Clerk sign-in, storage, and core workflows. The integration uses the existing Next.js, React, TypeScript, Clerk, and S3 setup.

The branch is `feat/scrum-14-student-workspace` in `NicolasSlenko/Vistern`, based on the team’s current `main`. Work started with onboarding and Home and now connects Home to the Career plan, resource pages, Community directory, Resume, and Jobs.

## Walkthrough

1. Open **Your background**, confirm the year, and continue. Show the choice to use a saved resume, upload a file, or continue without one. Background answers remain available when returning.
2. From Home, choose **Work on a project** and **Build on your classwork**. Name an activity, edit its steps, and add notes. Save it.
3. Return to Home. **Continue activity** opens the same saved record. Reload and show that the notes and checked steps remain.
4. Explore Career’s career overviews, guides, and coding practice. Each can become a saved activity with its resource attached.
5. Open Community, find UF ACM, and add an activity to the plan. The organization link remains attached; dates are entered by the student.
6. In Jobs, show opportunity resources and the existing matching tool. A saved job appears under **Your opportunities** on Home. **Plan an application or interview** creates an editable preparation checklist.
7. Set a preparation date. Home brings it forward when it is within a week and still shows other active work.
8. Finish a test activity, record the outcome, and mark it completed. Home updates the tree and progress. A completed activity does not automatically add claims to the resume.

Use clearly labeled test activities. Set them to **Saved for later** when finished so the demonstration does not leave false active commitments or completed work.

## What to say

“Onboarding and the student workspace are implemented in the team’s application. Students can choose work, save steps and notes, and return to it from Home. I tested all six activity types, onboarding persistence, a resume upload, and live job matching with the development configuration. The branch is ready for review.”

Community posts, messaging, live event feeds, automatic insights, and the full application workflow remain separate work. The current Community screen provides real resources and saved activities. See `SCRUM-14-LIVE-QA.md` for exact coverage and account fixtures.

## Optional offline preview

`npm run preview:student` serves a separate sample-data preview at `http://127.0.0.1:4190/onboarding?step=year`. It reuses the screen components with isolated browser storage and preview-only authentication/router adapters. It does not call the real upload, parsing, or persistence services. Use the authenticated app for the walkthrough above.
