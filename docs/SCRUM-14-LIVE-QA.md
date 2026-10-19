# SCRUM-14 live QA

## Final walkthrough, October 18, 2026

Tested the authenticated application on `localhost:4191` with the supplied development environment. The final checkout is `NicolasSlenko/Vistern`, based on `main` at `7c336ee`, branch `student-onboarding-and-home`. This section supersedes earlier test coverage and fixture counts below.

### Manual results

| Flow | Result |
| --- | --- |
| Onboarding without a new resume | Saved the year, exercised exclusive “just getting started” selection, saved a changed project note, reloaded and reopened the exact note. Restored the original note afterward. |
| Existing-resume onboarding | Recognized and reused the saved resume, returning to Home. |
| Project/classwork | Saved steps and notes, reloaded Home, reopened the same record, completed steps and a reflection, and verified tree progress. Paused afterward. All three project starting-point templates opened correctly. |
| Career exploration | Saved an AI/ML exploration activity, including the suggested experiment, source, and checked step; reopened it from Home after reload. All nine career overviews rendered. |
| Learning | Saved the open-source guide activity with its source, notes, and checked step; reopened from Home after reload. All eight guides rendered. |
| Coding practice | Added, edited, and removed a step; saved notes and progress, then reopened from Home after reload. |
| Community | Saved UF ACM to the plan. Its directory action changed to Open in my plan and opened the same record. A future date persisted. Attempting to mark future participation completed produced a visible error and retained the form. |
| Application/interview preparation | Saved notes, steps, and October 19. Home prioritized it and kept the project accessible. The final preparation template supplies three editable steps. |
| Empty checklist | Removed the project’s steps, resumed it, and verified Home invites the student to open their notes instead of claiming the checklist is finished. Paused afterward. |
| Resume isolation | After activity completion, the existing master profile still contained only the previous fictional QA project. |
| Fresh resume through onboarding | Uploaded `vistern-qa-resume.docx`, reviewed correct fictional name, education, skills, and project, confirmed it, and returned to Home. A fresh Profile visit showed the DOCX in History with a saved score. |
| Jobs | Saved test search preferences for undergraduate backend internships in the United States. Live matching returned ten results. Saved one role, reloaded Home, and verified it appeared under Your opportunities. No external application was submitted. |
| Mobile navigation | At 390px, Resume actions appear immediately under Resume. Escape closes the menu and restores focus. The resume header’s overlapping controls were corrected to wrap on small screens; the feedback switch supports keyboard operation. |

Career persistence checks use the real authenticated API and S3 store. Conditional-write conflicts, malformed responses, rejected payloads, lost connections, and invalid file extraction were tested with regression tests rather than by interrupting live storage.

### Engineering validation

- 38 regression tests passed: 15 student-profile, 15 Career, and eight resume-processing tests.
- Targeted ESLint passed for all 61 changed code files, with repeat checks for final UI fixes.
- Type checking and production build passed, including 49 routes.
- Actual PDF, DOCX, and TXT parsing is covered by fixtures. Legacy DOC files now request conversion to DOCX or PDF; scanned-PDF OCR is not implemented.
- New activity writes validate data and response shape, prevent concurrent overwrites, preserve failed edits, disable controls while saving, and show a confirmation after navigation.
- Environment files remain ignored. Changed files were checked for the supplied secret values before publishing.

Screenshots are stored outside the repository in `../vistern-design-review/`: `home-flow-verified.png` shows the dated preparation and other work together; `resume-mobile-verified.png` shows the corrected 390px header.

### Test data left in the development account

- Seven paused activities: the six `QA WALKTHROUGH:` records created in this run and the earlier `QA TEST: extend a class project`. No test activity is active or completed. The project fixture has no steps after the empty-checklist test.
- The original Senior/project background and October 18 QA note were restored.
- Four fictional resume uploads: one DOCX, two PDFs, and one TXT. The latest confirmed resume is the DOCX fixture; the master profile still holds the fictional QA Study Planner. No history was deleted.
- Test job preferences remain set to undergraduate backend internships in the United States. The existing preferences form supplies additional default fields. One Springer Capital backend internship remains saved as Interested for QA; it is not an application.

### Boundaries

This is coverage of the implemented student workspace and connected tools, not a claim that the whole prototype is complete. Social posts, messages, live community events, automatic personalized insights, and the full application-preparation state machine are not implemented. Another account, sign-out/sign-in, every external resource destination, resume tailoring/export, job-stage transitions, and the entire pre-existing resume editor were not exercised in this final walkthrough. Job freshness and recommendations depend on the existing providers; the result saved for QA was eight months old.

The daily upload allowance was not bypassed. Concurrent-save behavior is covered by automated tests, not a second live browser session. No merge, deployment, Jira transition, or team message was performed.

## October 18, 2026: connected Home and Career implementation

Tested the signed-in Next.js application at `http://localhost:4191` using the supplied ignored environment file. This section supersedes the earlier Home layout checks below.

- Home now opens saved work, career exploration, community resources, and opportunities. Desktop screenshots confirm the green botanical tree and the revised hierarchy.
- Created `QA TEST: extend a class project` through Home → Work on a project → Build on your classwork. Saved notes and the first completed step, reloaded, and verified both remained. A date chosen through the native calendar also persisted.
- Home displayed the saved activity and its next unfinished step. Continue activity reopened that exact record. After completing the remaining steps and recording a reflection, Home showed one completed project and updated growth. The existing resume retained its previous fixture content; the activity did not add a resume claim.
- Changed the test activity to Saved for later after testing. Home returned to its honest empty state with no completed activities or active dates. The single paused fixture remains in Career, ID `2500e0b1-4fec-4ad3-9c49-831b367ef2e2`.
- Career exploration opened the Backend career overview and produced a draft with its suggested experiment and source link. UF ACM produced a community draft with its organization link. Neither draft was saved, so no extra records were added.
- Jobs opens curated opportunity resources without a resume prerequisite and retains links to the existing matching and job-board tools. No external application was submitted.
- The existing Resume screen loads with readable light surfaces and its actions grouped under Resume in navigation.
- At 390px and 768px, Home's document width matched its viewport. The 390px activity editor also had no horizontal overflow. Mobile navigation opened, closed with Escape, and returned focus to Menu. The fresh responsive-check tab logged no application errors.
- Automated checks: 10 Career tests, 15 student-profile tests, and six resume-processing tests passed. Targeted ESLint and the final production build passed; the build includes 49 routes.

Screenshots are saved alongside this checkout in `../vistern-design-review/home-implemented.png` and `../vistern-design-review/career-mobile-implemented.png`.

Limits: this pass did not repeat resume upload or onboarding persistence; their earlier results are below. Concurrent-save and failure handling were checked by automated tests, not by disrupting live storage. Another account, live job matching, social posts/messages, event attendance, and automatic insight generation were not tested or newly implemented. Community currently supplies real resource links and optional saved activities. No remote push or deployment was made.

## October 18, 2026: earlier onboarding and resume QA

Tested the signed-in Next.js app with the supplied ignored development environment. Home and onboarding were restored to the layout preceding the rejected checklist redesign.

- Onboarding: saved Senior, project background, and the note `QA TEST: onboarding save check, October 18, 2026. Temporary test entry.`; all survived a full reload. Existing-resume detection and reuse passed.
- PDF: uploaded `test-fixtures/vistern-qa-resume.pdf`, verified VISTERN TEST STUDENT, Example University, and QA Study Planner, confirmed, and checked saved resume/master/history records in S3.
- Parse safety: before confirmation, a read-back assertion showed the master profile unchanged. The initial failed PDF attempt had fabricated data because empty text reached the AI; that attempt was cancelled and the resulting test-only master-profile additions were restored from the previously confirmed fixture. The extraction failure is now fixed and guarded by regression tests.
- Validation: unsupported JSON and a TXT over 10 MB showed persistent errors.
- Mobile: 390px overflow and menu Escape/focus checks passed on the preceding layout; the later checklist also passed these checks but was rejected and reverted.
- Automated: 15 student-profile tests and six resume tests pass; TypeScript, targeted ESLint, production build, and preview build pass.
- A second PDF was uploaded and extracted correctly during the final UI test, but was not confirmed when the user requested the visual rollback. History retains both PDF uploads and the earlier TXT fixture. No history was deleted. The confirmed resume and master profile still contain the fictional QA project.

Limits: browser screenshots repeatedly timed out, so no screenshot-based visual approval is claimed. DOC/DOCX, scanned PDFs/OCR, drag-and-drop, daily upload-limit behavior, sign-out/re-sign-in, live job results, and another account were not tested in this pass. The separate sample preview tested no-resume entry and save-error recovery; those are not live-service evidence. No deployment or remote push was made.

## October 16, 2026 (historical)

Tested the full Next.js application at `http://localhost:4191` with a signed-in development Clerk account and the existing S3/OpenAI integrations. These results do not come from the sample-data preview.

## Results

| Check | Result |
| --- | --- |
| Clerk signed-in session | Passed. Account controls appeared and protected routes loaded. |
| No-resume onboarding | Passed. Selected Senior, continued without a resume, selected personal/class projects, entered a clearly labeled QA note, and reached Home. |
| Onboarding persistence | Passed. Year, category, and exact note remained after a full reload. Reopening onboarding retained Senior. |
| Home focus persistence | Passed. Build experience stayed selected after reload and showed the corresponding next action. |
| Resume upload | Passed with `test-fixtures/vistern-qa-resume.txt` (680 bytes). The uploader reported success. History was empty before the test. |
| Resume parsing and verification | Passed. The review form showed the fictional name, Example University, Computer Science degree, Python/JavaScript/SQLite skills, and QA Study Planner project. |
| Resume confirmation and analysis | Passed. Confirmation saved the resume and navigated to Dashboard, which displayed the score and project-specific analysis. |
| Resume persistence | Passed. Dashboard retained its results after a full reload. Profile contained the fictional contact and project data; History listed the uploaded file and score. |
| Home resume summary | Passed. Home showed Connected with 1 project, 0 experiences, and 1 education entry. The onboarding background and focus remained intact. |
| Existing-resume onboarding | Passed. Edit background → Continue recognized the saved resume. Use saved resume returned to Home; a subsequent full reload retained both resume and onboarding data. |

The browser console contained the expected Clerk development-key warning and no application errors during the final checks.

## Fix made during testing

The app was initially started with `--hostname 127.0.0.1`, while the signed-in browser used `localhost`. Clerk's request normalization and Next's external rewrite handling produced a self-proxy loop and HTTP 500. Restarting with `--hostname localhost` resolved it. `npm run start:local` now captures the working host and port. Build first with `npm run build` when application code changes.

## Test data left in the development account

- Year: Senior; category: Personal or class projects; focus: Build experience.
- Note: “QA TEST — onboarding save check, October 16, 2026. Temporary test entry.”
- One fictional resume: `vistern-qa-resume.txt`. Its name is VISTERN TEST STUDENT, so Home currently greets “VISTERN.” This is fixture content, not the account identity.
- The existing parser also merged the fixture into the master profile and generated analysis. Uploading a personal resume may retain that test project in the master profile because merging is existing application behavior.

No pre-existing resume submissions were present, and no history was cleared.

## Limits

This run tested a TXT file through the existing `/upload` flow and a saved resume through onboarding. It did not test a fresh upload inside the onboarding screen, PDF/DOC/DOCX extraction, drag-and-drop, file validation failures, upload limits, sign-out/re-sign-in, preferences, job matching, or another user's account. Existing preview/unit checks cover additional onboarding behavior but are not live-service evidence.

The pre-existing Profile page renders a duplicate navigation header. That visual issue does not block saving or upload and was not changed in this QA pass. No deployment or remote push was made.
