import { activityDraft } from "./templates"
import type { ActivityFields } from "./workspace"

export const projectPaths = [
  { id: "all", label: "All paths" },
  { id: "fullstack", label: "Software engineering" },
  { id: "data", label: "Data & AI" },
  { id: "cyber", label: "Cybersecurity" },
  { id: "product", label: "Product & UX" },
] as const

export const projectLevels = ["All levels", "Starter", "Stretch"] as const

type ProjectPath = Exclude<(typeof projectPaths)[number]["id"], "all">
type ProjectLevel = Exclude<(typeof projectLevels)[number], "All levels">

export type CareerProject = {
  id: string
  title: string
  path: ProjectPath
  level: ProjectLevel
  time: string
  tools: string[]
  summary: string
  outcome: string
  steps: string[]
  inspiration?: string
}

// Project ideas are adapted for an undergraduate portfolio. Copy is original;
// links credit the public project pages that inspired individual builds.
export const careerProjects: CareerProject[] = [
  {
    id: "campus-portfolio", title: "Your developer portfolio", path: "fullstack", level: "Starter", time: "1–2 weekends", tools: ["HTML/CSS", "React", "Accessibility"],
    summary: "Publish a fast, accessible site that explains three things you have made and what you contributed.",
    outcome: "A live site, source repo, and one clear case study.",
    steps: ["Choose two or three pieces of work and write your contribution for each", "Build responsive pages with keyboard navigation and readable contrast", "Deploy the site and ask a classmate to find a project without help"],
    inspiration: "https://resumax.ai/projects/developer-portfolio",
  },
  {
    id: "student-task-board", title: "Student task board", path: "fullstack", level: "Starter", time: "2–3 weekends", tools: ["TypeScript", "Database", "Auth"],
    summary: "Make a small planner where each student can create, update, and finish their own tasks.",
    outcome: "A deployed app with a tested sign-in and task flow.",
    steps: ["Sketch the task list and create/edit flow", "Add accounts and store tasks per user", "Test empty, error, and completed states, then deploy"],
    inspiration: "https://resumax.ai/projects/fullstack-task-app-auth",
  },
  {
    id: "weather-dashboard", title: "Weather data dashboard", path: "fullstack", level: "Starter", time: "1–2 weekends", tools: ["APIs", "Charts", "Responsive UI"],
    summary: "Turn a public forecast API into a useful view of the next few days for a selected city.",
    outcome: "A live dashboard with loading, error, and mobile states.",
    steps: ["Choose a public weather API and inspect its response", "Show current conditions and a simple forecast chart", "Handle failed requests and test the layout on a phone"],
    inspiration: "https://resumax.ai/projects/weather-dashboard-live-api",
  },
  {
    id: "short-link-api", title: "Short link service", path: "fullstack", level: "Stretch", time: "2–3 weekends", tools: ["REST API", "Database", "Testing"],
    summary: "Create an API that stores short codes, redirects safely, and records basic usage counts.",
    outcome: "A documented API with automated tests and a small demo.",
    steps: ["Define create and redirect endpoints", "Persist links and reject invalid input", "Add tests for collisions, expired links, and redirect behavior"],
    inspiration: "https://resumax.ai/projects/url-shortener-rest-api",
  },
  {
    id: "notes-cli", title: "Notes from the terminal", path: "fullstack", level: "Starter", time: "1 weekend", tools: ["CLI", "File storage", "Testing"],
    summary: "Build a command line tool to add, list, search, and tag notes stored on your computer.",
    outcome: "An installable tool with examples in its README.",
    steps: ["Design a few simple commands and help messages", "Save notes locally and add search", "Test the commands and package the tool"],
    inspiration: "https://resumax.ai/projects/notes-cli-local-store",
  },
  {
    id: "realtime-study-chat", title: "Study group chat", path: "fullstack", level: "Stretch", time: "3–4 weekends", tools: ["WebSockets", "TypeScript", "Realtime UI"],
    summary: "Create topic rooms where classmates can exchange messages live and see who is present.",
    outcome: "A live demo with rooms, reconnect handling, and a short architecture note.",
    steps: ["Build one room with live message broadcast", "Add room membership and connection status", "Test disconnects and document how messages flow"],
    inspiration: "https://resumax.ai/projects/realtime-chat-websockets",
  },
  {
    id: "public-data-story", title: "A story in public data", path: "data", level: "Starter", time: "1–2 weekends", tools: ["Python", "Pandas", "Charts"],
    summary: "Clean a public dataset and answer one specific question with charts and a short explanation.",
    outcome: "A reproducible notebook and a one-page findings write-up.",
    steps: ["Choose a question and cite the dataset", "Check missing values, clean the data, and make two charts", "Explain the finding and one limitation"],
    inspiration: "https://resumax.ai/projects/dataset-cleanup-visualization",
  },
  {
    id: "study-flashcards", title: "Study note flashcards", path: "data", level: "Starter", time: "1–2 weekends", tools: ["TypeScript", "AI API", "Evaluation"],
    summary: "Turn a short set of class notes into editable practice cards, with a manual review step.",
    outcome: "A working prototype plus examples of good and poor generated cards.",
    steps: ["Design the input and card review flow", "Generate draft questions and let users edit or discard them", "Evaluate a small sample for factual accuracy and usefulness"],
    inspiration: "https://resumax.ai/projects/ai-flashcard-generator",
  },
  {
    id: "photo-classifier", title: "Small image classifier", path: "data", level: "Stretch", time: "3–4 weekends", tools: ["Python", "ML", "Evaluation"],
    summary: "Train a model to distinguish a few classes of photos you have permission to use.",
    outcome: "A demo and honest report showing errors, accuracy, and dataset limits.",
    steps: ["Collect and label a small balanced dataset", "Train a baseline and hold out test images", "Show predictions and explain common mistakes"],
    inspiration: "https://resumax.ai/projects/fine-tune-image-classifier-deploy",
  },
  {
    id: "notes-search", title: "Search your course notes", path: "data", level: "Stretch", time: "3–4 weekends", tools: ["Python", "Search", "Citations"],
    summary: "Build a search assistant for notes you own that points back to the passage behind each answer.",
    outcome: "A local demo with citations and a small question set for checking accuracy.",
    steps: ["Import a small set of notes and split them into passages", "Retrieve relevant passages for each question", "Show citations and test what happens when an answer is absent"],
    inspiration: "https://resumax.ai/projects/rag-over-your-notes",
  },
  {
    id: "password-safety", title: "Password safety explainer", path: "cyber", level: "Starter", time: "1–2 weekends", tools: ["Python", "Privacy", "Testing"],
    summary: "Make a local tool that explains password strength and demonstrates privacy safe breach checks.",
    outcome: "A working tool with a privacy note and test cases.",
    steps: ["Create clear strength guidance without storing passwords", "Add a privacy preserving check or a documented mock", "Test edge cases and explain exactly what data leaves the device"],
    inspiration: "https://resumax.ai/projects/password-breach-checker",
  },
  {
    id: "lab-network-inventory", title: "Lab network inventory", path: "cyber", level: "Starter", time: "1 weekend", tools: ["Networking", "Python", "Reports"],
    summary: "Inspect only your own machine or an authorized lab and summarize which test services are reachable.",
    outcome: "A small inventory report explaining ports, timeouts, and scope.",
    steps: ["Define an explicit list of authorized hosts and ports", "Check connections with a timeout and record results", "Write a short report and verify results against the lab setup"],
    inspiration: "https://resumax.ai/projects/build-your-own-port-scanner",
  },
  {
    id: "private-chat-design", title: "Private chat prototype", path: "cyber", level: "Stretch", time: "3–4 weekends", tools: ["Encryption", "Threat modeling", "TypeScript"],
    summary: "Prototype a two-person messenger and explain how device keys keep the server from reading messages.",
    outcome: "A demo and threat model; clearly mark it as educational, not production secure.",
    steps: ["Draw the data flow and list what each party can see", "Use a reviewed cryptography library for a small prototype", "Test reconnect and key-loss cases, then document limitations"],
    inspiration: "https://resumax.ai/projects/e2e-encrypted-chat",
  },
  {
    id: "campus-service-finder", title: "Campus service finder", path: "product", level: "Starter", time: "1–2 weekends", tools: ["Interviews", "Prototyping", "Usability"],
    summary: "Help students find a campus resource in fewer steps, from advising to food support.",
    outcome: "A clickable prototype and a brief case study with feedback.",
    steps: ["Interview three students about a real search task", "Map the current flow and prototype a simpler one", "Observe two usability sessions and revise the design"],
  },
  {
    id: "accessible-course-page", title: "Accessible course page", path: "product", level: "Starter", time: "1 weekend", tools: ["Accessibility", "UI", "Testing"],
    summary: "Redesign a course information page so deadlines and materials are easier to find for everyone.",
    outcome: "A before-and-after prototype with keyboard and contrast checks.",
    steps: ["Audit a page you have permission to redesign", "Rework hierarchy, labels, and mobile layout", "Test keyboard navigation and explain your decisions"],
  },
  {
    id: "club-event-discovery", title: "Club event discovery", path: "product", level: "Stretch", time: "2–3 weekends", tools: ["Research", "Design system", "Metrics"],
    summary: "Design and test a focused way for students to discover relevant campus events.",
    outcome: "A prototype, a small component set, and a measurement plan.",
    steps: ["Talk to students and organizers about discovery problems", "Prototype browse, filter, and event detail flows", "Test the flow and define one measure of success"],
  },
]

export function careerProjectDraft(project: CareerProject): ActivityFields {
  return {
    ...activityDraft("project"),
    title: project.title,
    notes: `${project.summary}\n\nPortfolio outcome: ${project.outcome}`,
    steps: project.steps.map((title) => ({ title, done: false })),
  }
}
