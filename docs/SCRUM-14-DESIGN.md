# Onboarding and Home design

## Product correction, October 18

Implemented in the app after the source review. The resume-centered screen described below is the rejected prior version. Home now uses the composition and navigation in this brief; implementation coverage and remaining service gaps are recorded in `SCRUM-14-INTEGRATION.md`.

The previous React Home was not a faithful integration of the student prototype. Its focus selector, resume preview, and background summary organize the product around preparing a resume. Visual improvements do not resolve this product mismatch.

Vistern helps CS students explore work they might enjoy, learn, build experience, find people to work with, and pursue opportunities. A resume records confirmed experience and supports applications; it is one part of the experience.

The connected journey is **understand → choose useful work → plan → act and get help → reflect and confirm the contribution → reuse it and choose what comes next.** Students can enter anywhere in that journey. Academic year is context, not a measure of readiness.

## Sources reviewed

Source checkout: `grasshopper_labs_websites/planning/student-experience/`, separate from this integration branch.

- `VISION.md`: product promise, five areas, Home priority order, and connected improvement cycle.
- `PRODUCT_BLUEPRINT.md`: implemented local simulation, shared records, weekly work, community, growth rules, and integration boundaries.
- `EXPERIENCE_PLAN.md` and `ADAPTIVE_PLAN.md`: original journey and the explicit decision that resume preparation is not the organizing activity.
- `index.html` and its final overrides: `student-dashboard.js`, `home-paths.js`, `journey.js`, `insights.js`, and `navigation.js`.

The September 30 vision and blueprint supersede older required-goal and ordered-milestone designs. The early `todayScreen()` in `index.html` is not the final Home; later scripts replace it. The running prototype was inspected through onboarding, Home, Build experience, and Career during this review.

## Navigation and responsibilities

| Area | Purpose |
| --- | --- |
| Home | Overview of what needs attention, chosen work, useful discoveries, and progress. |
| Career | Active work and weekly plan, exploration, guides, coding practice, and history. |
| Community | People, feedback, clubs, project teams, resources, opportunities, and sessions. |
| Resume | Confirmed experience, editable master, feedback, and named versions. |
| Jobs | Role discovery, preparation, applications, interviews, and follow-through. |

Settings and profile editing are account utilities. Upload and resume feedback are contextual actions within Resume, not separate primary destinations.

The public welcome page introduces Vistern and offers Get started and Sign in. The signed-in Home is the student's overview; these are distinct screens.

## Home composition

Keep the recent quieter green styling, but replace the resume-centered layout. The student's work provides the content and hierarchy.

```text
Home         | Home
Career       |
Community    | Continue working                 Your dates
Resume       | chosen activity + next step      actual commitments only
Jobs         | open the saved work
             |
             | Other work in your plan          Your growth
             | a short list; open Career        small botanical tree
             |                                  recorded contributions
             | From your community
             | relevant discussion, team,
             | resource, or activity
             |
             | Opportunities
             | relevant discovery / saved roles
```

This is a hierarchy, not a fixed grid of equally weighted cards. When a recorded deadline or interview needs attention, it becomes the primary action and chosen work remains accessible. When no work is active, the main area offers a relevant starting activity or exploration choice. Do not default everyone to resume preparation or require an exclusive focus selection.

Home summarizes; Career holds the detailed plan. Avoid displaying the same primary action twice as both a hero and a checklist entry. A new student's empty Home needs useful ways to explore, not empty counters, invented tasks, or a demand to upload a resume.

## Interaction contracts

| Student intent | Required destination and continuity | Previous mismatch |
| --- | --- | --- |
| Explore careers | Compare day-to-day work, try an activity, save optional interests; no resume prerequisite. | Job matches or a background form. |
| Build experience | Continue a project, extend classwork, try an idea, or find collaborators; preserve steps and notes. | Describe a project for the background form. |
| Get help | Open a relevant resource, discussion, person, club, or team in context. | Community is absent. |
| Find opportunities | Explore roles and programs, save choices, prepare when useful. | Resume-based matching only. |
| Prepare | Open the particular application, assessment, interview, or practice activity. | General resume feedback. |
| Return | Resume chosen work; prioritize real commitments without erasing it. | Remembers only a focus value. |
| Finish work | Record the outcome; confirm any experience claim before updating Resume. | No work-to-evidence cycle is integrated. |

The tree now reflects completed activities recorded in the plan, with a link to completion history. Selecting a task does not count as progress. These are student-recorded outcomes, not independently verified participation or a measure of hiring readiness.

## Visual system

| Role | Color |
| --- | --- |
| Page canvas | Chalk `#f7f8f6` |
| Working surfaces | White `#ffffff` |
| Text | Charcoal `#27332d` |
| Actions and selection | Forest `#246347` |
| Subtle selection | Sage `#eaf1ec` |
| Secondary text | Stone `#5c685f` |

Retain Geist Sans and left alignment. Use spacing, readable line lengths, and type size to distinguish the main work from supporting sections. The botanical tree supplies personality without a colored backdrop. Green belongs in the tree, logo, navigation selection, links, and controls rather than large tinted panels.

Avoid decorative top rules, repeated outlined cards, promotional slogans, status tags without useful meaning, and icons added merely to fill space. Use natural sentences where explanation is needed and direct labels for actions.

Review against the brief: styling cannot repair an incorrect workflow. A cleaner resume dashboard still misses the purpose. Preserve the prototype's connected activities and varied entry points while simplifying its presentation, rather than removing the activities themselves.

## Integration boundary and acceptance

The current branch has real authentication, student-profile storage, resume processing, and existing job tools. It now implements persistent career activities, steps, notes, reflection, dates, and completion history. Automatic insight generation and social community records remain separate integration work. The existing job board has saved roles and stages but lacks the prototype's richer preparation and dated application records.

These are explicit integration gaps, not reasons to redefine Home as a resume page. Do not copy fictional community posts, people, opportunities, or event dates into real accounts. Do not add navigation that silently redirects an unimplemented flow to an unrelated resume tool.

Before treating Home integration as complete, verify:

- An undecided student can explore without a resume or fixed career direction.
- A student with a class project can choose work, save steps or notes, and return to the same activity from Home.
- Community and opportunity actions preserve context when added to a plan.
- Real commitments can take priority without deleting chosen work; suggestions have no invented deadlines.
- Confirming completed work is separate from adding a skill or resume claim.
- Navigation exposes the five product areas coherently, with resume actions grouped within Resume.

Home has now been corrected in the production React screens. See `SCRUM-14-LIVE-QA.md` for authenticated flow checks; the full prototype service scope remains broader than this integration.

## Supporting visual research

- [How to de-slopify your designs](https://uxdesign.cc/how-to-de-slopify-your-designs-4c40c57c1dc9)
- [How to Stop Complaining About Your Software](https://lg.substack.com/p/i-never-want-to-use-third-party-software)
- [Things](https://culturedcode.com/things/features/)
- [Contra](https://contra.com/)

These inform visual craft. The Vistern prototype and product documents determine the product structure. Mobbin's screen library required sign-in and was not used as evidence of a reviewed flow.
