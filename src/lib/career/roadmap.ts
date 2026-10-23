import type { CareerWorkspace } from "./workspace"

export const trackIds = ["fullstack", "data", "cyber", "product"] as const
export type TrackId = (typeof trackIds)[number]

export type RoadmapTask = {
  id: string
  title: string
  detail: string
  why: string
}

export type RoadmapStage = {
  id: string
  title: string
  description: string
  tasks: RoadmapTask[]
}

// This is the local recommendation baseline. A future model can return this
// same stage/task shape after considering experience and goals.
export const roadmapStages: Record<TrackId, RoadmapStage[]> = {
  fullstack: [
    { id: "foundations", title: "Get comfortable with the tools", description: "Build fluency in one language and a repeatable development workflow.", tasks: [
      { id: "programming", title: "Write and debug small programs", detail: "Choose one language and solve a few problems involving functions, collections, and input handling.", why: "A reliable foundation makes every later project easier to reason about." },
      { id: "git", title: "Use Git for every change", detail: "Create a repo, make focused commits, and explain how to recover from a mistake.", why: "Team projects depend on understandable version history." },
      { id: "debugging", title: "Practice finding and fixing a bug", detail: "Reproduce a failure, inspect it with a debugger or logs, and write down the fix.", why: "Debugging is a daily part of software engineering." },
    ] },
    { id: "build", title: "Ship a useful first version", description: "Make one complete feature that another person can try.", tasks: [
      { id: "problem", title: "Choose a small real problem", detail: "Ask a classmate or club what they need and define one task the app will help with.", why: "A tight scope is easier to finish and evaluate." },
      { id: "feature", title: "Build the main user flow", detail: "Connect a clear interface to real state or data, including empty and error states.", why: "A working end-to-end flow shows more than isolated screens." },
      { id: "test", title: "Test and share the result", detail: "Test the main flow, publish a demo or walkthrough, and record what broke.", why: "Evidence that people can use your work makes it portfolio ready." },
    ] },
    { id: "collaborate", title: "Work with other people", description: "Learn to explain changes and improve them with feedback.", tasks: [
      { id: "review", title: "Ask for code review", detail: "Share a small change with a peer and respond to one concrete suggestion.", why: "Review develops judgment and communication." },
      { id: "team", title: "Make a team contribution", detail: "Join a class, club, or open source project and own a clearly scoped part.", why: "A specific contribution is easier to discuss than a vague team claim." },
      { id: "document", title: "Document your decisions", detail: "Write a README with setup steps, tradeoffs, and what you would improve next.", why: "Good documentation lets others understand and run your work." },
    ] },
    { id: "present", title: "Turn the work into evidence", description: "Prepare to explain what you built and what you learned.", tasks: [
      { id: "case-study", title: "Write a short project story", detail: "Describe the problem, your contribution, a challenge, and the result.", why: "A clear story is useful in resumes and interviews." },
      { id: "resume", title: "Review one truthful resume bullet", detail: "Use concrete actions and outcomes that your project can actually support.", why: "Specific, accurate evidence is stronger than a list of tools." },
      { id: "explain", title: "Practice explaining your design", detail: "Walk someone through your choices and one alternative you considered.", why: "Interviewers often ask how you made tradeoffs." },
    ] },
  ],
  data: [
    { id: "question", title: "Ask a question you can test", description: "Start with a real decision and a dataset that can help answer it.", tasks: [
      { id: "python-sql", title: "Practice Python and SQL basics", detail: "Read, filter, group, and join a small dataset.", why: "These are the everyday tools for exploring structured information." },
      { id: "statistics", title: "Check basic statistical ideas", detail: "Explain distributions, missing data, and why correlation alone is limited.", why: "Good analysis depends on knowing what the data cannot prove." },
      { id: "dataset", title: "Choose a public dataset and question", detail: "Record its source, license, and the one question you want to answer.", why: "A focused question guides cleaning and analysis." },
    ] },
    { id: "analysis", title: "Clean and explore the data", description: "Make your work reproducible and your assumptions visible.", tasks: [
      { id: "quality", title: "Audit data quality", detail: "Check duplicates, missing values, unusual ranges, and inconsistent labels.", why: "Bad inputs can make polished charts misleading." },
      { id: "notebook", title: "Build a repeatable analysis", detail: "Use a notebook or script that another student can run from raw data.", why: "Reproducibility makes your result credible." },
      { id: "chart", title: "Create two readable charts", detail: "Label axes, cite the data, and choose a chart that fits each comparison.", why: "Clear presentation helps people interpret your findings." },
    ] },
    { id: "evaluate", title: "Test a baseline", description: "Go beyond a result to ask whether the method actually works.", tasks: [
      { id: "baseline", title: "Create a simple baseline", detail: "If using a model, compare it against a simple rule or average.", why: "A baseline shows whether complexity adds value." },
      { id: "errors", title: "Inspect errors and edge cases", detail: "Look at examples where the approach fails and record likely causes.", why: "An honest error analysis is more useful than one headline score." },
      { id: "limits", title: "Document limitations", detail: "Note sampling gaps, uncertainty, and what would change your conclusion.", why: "Responsible data work makes its limits explicit." },
    ] },
    { id: "share", title: "Explain what you found", description: "Turn analysis into a clear artifact and get feedback.", tasks: [
      { id: "writeup", title: "Write a one-page finding", detail: "Lead with the question, evidence, and caveats in plain language.", why: "Data work matters when others can use it." },
      { id: "feedback", title: "Ask someone to challenge the result", detail: "Share your analysis with a classmate, club, or professor and revise one part.", why: "Feedback catches confusing claims and hidden assumptions." },
      { id: "portfolio", title: "Publish the method and result", detail: "Show code, data source, charts, and a concise explanation together.", why: "A complete artifact demonstrates both technical and communication skills." },
    ] },
  ],
  cyber: [
    { id: "systems", title: "Understand the system", description: "Build the networking and operating system knowledge behind security work.", tasks: [
      { id: "network", title: "Trace a web request", detail: "Explain DNS, HTTP, TLS, and how a request reaches a server.", why: "You need to understand normal behavior before investigating abnormal behavior." },
      { id: "linux", title: "Practice Linux and scripting", detail: "Navigate files, inspect processes, and automate a small repeatable check.", why: "Security investigations often start in logs and terminals." },
      { id: "scope", title: "Write down authorized scope", detail: "Use your own system, a class exercise, or a designated lab for every test.", why: "Clear scope is a core professional habit." },
    ] },
    { id: "lab", title: "Practice in a safe lab", description: "Try defensive techniques where you have permission to experiment.", tasks: [
      { id: "setup", title: "Set up a practice environment", detail: "Use an intentionally vulnerable exercise or controlled local setup.", why: "A repeatable lab lets you learn without affecting others." },
      { id: "logs", title: "Inspect an example log", detail: "Identify an unusual event, then verify what the record does and does not show.", why: "Good security work separates evidence from assumptions." },
      { id: "fix", title: "Try one defensive improvement", detail: "Change a setting or code path and verify the original issue is addressed.", why: "Finding a problem is only part of protecting a system." },
    ] },
    { id: "report", title: "Communicate the risk", description: "Describe observations and practical fixes without overstating certainty.", tasks: [
      { id: "evidence", title: "Collect reproducible evidence", detail: "Record the exact steps and results from your authorized lab.", why: "Someone else should be able to verify the finding." },
      { id: "write", title: "Write a concise report", detail: "Summarize the impact, evidence, uncertainty, and recommended fix.", why: "Clear reporting helps a team act on a finding." },
      { id: "retest", title: "Retest the fix", detail: "Repeat the same check after making the improvement.", why: "Verification closes the loop." },
    ] },
    { id: "community", title: "Build a learning record", description: "Use the work to find collaborators and show responsible practice.", tasks: [
      { id: "writeup", title: "Publish a lab write-up", detail: "Explain the setup and learning without exposing real systems or private data.", why: "A responsible write-up demonstrates judgment." },
      { id: "group", title: "Join a security learning group", detail: "Try a campus club, class team, or authorized competition.", why: "Security skills grow through discussion and review." },
      { id: "story", title: "Practice an investigation story", detail: "Explain what you noticed, tested, fixed, and would check next.", why: "A concrete example helps others understand your process." },
    ] },
  ],
  product: [
    { id: "discover", title: "Find a real student problem", description: "Start with user needs before deciding what to build.", tasks: [
      { id: "interviews", title: "Talk with three students", detail: "Ask about their current process and pain points without pitching your solution.", why: "Direct observation prevents guesses from becoming requirements." },
      { id: "problem", title: "Write a focused problem statement", detail: "Name the audience, task, and obstacle in a few sentences.", why: "A clear problem makes it easier to judge solutions." },
      { id: "journey", title: "Map the current journey", detail: "Sketch the steps a student takes today and where they get stuck.", why: "A simple map reveals where a small change could help." },
    ] },
    { id: "prototype", title: "Make a small prototype", description: "Show a possible improvement with one clear flow.", tasks: [
      { id: "flow", title: "Sketch the core task", detail: "Draw the starting point, key decision, and successful outcome.", why: "A small flow keeps the scope testable." },
      { id: "interface", title: "Build a clickable or working version", detail: "Use familiar patterns, plain labels, and accessible contrast.", why: "People give better feedback when they can try the flow." },
      { id: "states", title: "Cover empty and error states", detail: "Show what happens when content is missing or an action fails.", why: "The unusual states often reveal the biggest usability gaps." },
    ] },
    { id: "test", title: "Watch people use it", description: "Learn from behavior, then make a focused revision.", tasks: [
      { id: "session", title: "Run two usability sessions", detail: "Give each person a task and watch where they pause or misunderstand.", why: "Observation is more reliable than asking whether they like the design." },
      { id: "accessibility", title: "Check keyboard and mobile use", detail: "Try the flow without a mouse and at a small screen size.", why: "A usable design should work in different contexts." },
      { id: "revise", title: "Change one thing from the feedback", detail: "Document the issue, revision, and what you expect to improve.", why: "Iteration shows how research changes decisions." },
    ] },
    { id: "case-study", title: "Tell the product story", description: "Explain the tradeoffs and what you would measure next.", tasks: [
      { id: "decisions", title: "Write a one-page case study", detail: "Cover the problem, research, choices, test results, and your contribution.", why: "A case study makes your thinking visible." },
      { id: "metric", title: "Choose a success measure", detail: "Pick one outcome, such as task completion or time to find a resource.", why: "A measurable outcome helps you evaluate a future release." },
      { id: "review", title: "Ask for critique", detail: "Share your case study and revise an unclear or unsupported claim.", why: "Feedback improves both the design and its explanation." },
    ] },
  ],
}

export function roadmapTaskKey(pathId: TrackId, taskId: string) {
  return `${pathId}:${taskId}`
}

export function roadmapProgress(workspace: CareerWorkspace, pathId: TrackId) {
  const tasks = roadmapStages[pathId].flatMap((stage) => stage.tasks)
  const completed = tasks.filter((task) => workspace.roadmapDone.includes(roadmapTaskKey(pathId, task.id))).length
  return { completed, total: tasks.length, percent: Math.round((completed / tasks.length) * 100) }
}

export function completedTrackIds(workspace: CareerWorkspace): TrackId[] {
  return trackIds.filter((pathId) => {
    const { completed, total } = roadmapProgress(workspace, pathId)
    return total > 0 && completed === total
  })
}

export function careerGrowthProgress(workspace: CareerWorkspace) {
  const roadmap = workspace.selectedPathId ? roadmapProgress(workspace, workspace.selectedPathId).percent : 0
  const completedActivities = workspace.activities.filter((activity) => activity.status === "completed").length
  const activeActivities = workspace.activities.filter((activity) => activity.status === "active").length
  const checkedSteps = workspace.activities.reduce((count, activity) => count + activity.steps.filter((step) => step.done).length, 0)
  return Math.min(100, Math.round(roadmap * .6 + Math.min(22, completedActivities * 8) + Math.min(12, checkedSteps * 2) + Math.min(6, activeActivities * 2)))
}
