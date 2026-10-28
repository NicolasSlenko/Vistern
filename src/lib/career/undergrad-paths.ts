// A deliberately small set of starting directions for undergraduate CS students.
// The IDs link back to the existing career catalog and saved-plan source model.
export const undergradPaths = [
  {
    id: "fullstack",
    number: "01",
    title: "Software engineering",
    short: "Build the apps and tools people use.",
    focus: "Start broad; you can specialize in frontend, backend, or mobile later.",
    roles: ["Frontend", "Backend", "Full-stack"],
    foundations: ["One programming language", "Git and GitHub", "Data structures", "Web or app basics"],
    project: "Build a campus tool with one useful feature, real data, and a clear README.",
    steps: [
      { title: "Learn the workflow", detail: "Write small programs, debug them, and use Git for every change.", proof: "A public repo with steady, understandable commits" },
      { title: "Ship one useful feature", detail: "Take a class or club problem from idea to a working app. Test the main flow.", proof: "A live demo or short walkthrough" },
      { title: "Work with other people", detail: "Join a club build, contribute to a team project, or ask for code review.", proof: "A contribution you can explain clearly" },
      { title: "Prepare to apply", detail: "Turn your work into concise resume bullets and practice explaining your decisions.", proof: "A reviewed resume and two project stories" },
    ],
  },
  {
    id: "data",
    number: "02",
    title: "Data & AI",
    short: "Turn messy information into useful answers.",
    focus: "Begin with analysis and evaluation before choosing an AI specialty.",
    roles: ["Data analyst", "Data scientist", "ML engineer"],
    foundations: ["Python", "SQL", "Statistics", "Clear charts"],
    project: "Answer a real campus or public-data question, then document the limits of your result.",
    steps: [
      { title: "Ask a good question", detail: "Choose a small dataset and define what you want to learn from it.", proof: "A one-paragraph question and data source" },
      { title: "Clean and explore", detail: "Use Python or SQL to check quality, find patterns, and build a simple baseline.", proof: "A reproducible notebook or query" },
      { title: "Explain what you found", detail: "Create a clear chart and describe uncertainty, bias, or missing data.", proof: "A short write-up someone outside CS can read" },
      { title: "Try the field", detail: "Share the work with a professor, lab, club, or student organization.", proof: "Feedback and one improvement you made" },
    ],
  },
  {
    id: "cyber",
    number: "03",
    title: "Cybersecurity",
    short: "Understand systems and help protect them.",
    focus: "Build systems knowledge and practice only in authorized environments.",
    roles: ["Security analyst", "App security", "Cloud security"],
    foundations: ["Networking", "Linux", "Scripting", "Security basics"],
    project: "Investigate a practice log or intentionally vulnerable lab and write an evidence-based report.",
    steps: [
      { title: "Understand the system", detail: "Learn how networks, operating systems, and web requests work.", proof: "A simple diagram or explanation of a request" },
      { title: "Practice in a lab", detail: "Use a class exercise or legal sandbox to investigate a weakness or alert.", proof: "Notes on what you observed and verified" },
      { title: "Communicate the risk", detail: "Write what happened, why it matters, and a practical fix without overstating certainty.", proof: "A concise security report" },
      { title: "Find a community", detail: "Join a campus security group, competition, or research project.", proof: "A team exercise or mentor conversation" },
    ],
  },
  {
    id: "product",
    number: "04",
    title: "Product & UX",
    short: "Figure out what to build and make it easier to use.",
    focus: "Pair technical understanding with user research and clear decisions.",
    roles: ["Product manager", "UX engineer", "Technical program"],
    foundations: ["User interviews", "Prototyping", "Writing", "Basic analytics"],
    project: "Find a student pain point, sketch a solution, and test a prototype with classmates.",
    steps: [
      { title: "Find a real problem", detail: "Talk with a few students and write down what they actually struggle with.", proof: "A clear problem statement with interview notes" },
      { title: "Make a small prototype", detail: "Sketch a flow or build a simple interface focused on one task.", proof: "A clickable prototype or working first version" },
      { title: "Test and revise", detail: "Watch people use it, note confusion, and change the design.", proof: "Before-and-after decisions with reasons" },
      { title: "Tell the story", detail: "Explain the tradeoffs, your contribution, and what you would measure next.", proof: "A one-page case study" },
    ],
  },
] as const

export type UndergradPath = (typeof undergradPaths)[number]
