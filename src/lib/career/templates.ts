import type { ActivityFields } from "./workspace"
import { careers, guides, organizations } from "./catalog"

export const projectChoices = [
  {
    id: "existing",
    title: "Continue a project",
    description:
      "Choose an improvement to something you’re already working on.",
  },
  {
    id: "classwork",
    title: "Build on your classwork",
    description:
      "Use a concept or assignment as the starting point for more work.",
  },
  {
    id: "new",
    title: "Try a new idea",
    description: "Give a small idea a first version you can test.",
  },
] as const

export function activityDraft(
  kind: ActivityFields["kind"] = "project",
): ActivityFields {
  return {
    title: "",
    kind,
    notes: "",
    reflection: "",
    scheduledOn: null,
    source: null,
    steps:
      kind === "preparation"
        ? [
            "Review the role and the application or interview requirements",
            "Prepare the materials or examples you need",
            "Record the outcome and any follow-up",
          ].map((title) => ({ title, done: false }))
        : [],
  }
}

export function projectDraft(mode: string): ActivityFields {
  const steps =
    mode === "classwork"
      ? [
          "Choose a concept or assignment to extend",
          "Build and test a small example",
          "Describe what you learned and what you contributed",
        ]
      : mode === "existing"
        ? [
            "Choose an improvement and define what should change",
            "Make the change and test the result",
            "Document your contribution and what you learned",
          ]
        : [
            "Choose a problem and keep the first version small",
            "Build one part and ask someone to try it",
            "Record what worked and what you would change",
          ]
  return {
    ...activityDraft(),
    steps: steps.map((title) => ({ title, done: false })),
  }
}

export function sourceDraft(
  source: NonNullable<ActivityFields["source"]>,
): ActivityFields {
  const draft = activityDraft(
    source.type === "career"
      ? "exploration"
      : source.type === "guide"
        ? "learning"
        : "community",
  )
  const item = (
    source.type === "career"
      ? careers
      : source.type === "guide"
        ? guides
        : organizations
  ).find((item) => item.id === source.id)
  if (!item) return draft
  const title = "name" in item ? item.name : item.title
  const steps =
    source.type === "career"
      ? [
          "Read about the daily work and useful foundations",
          "Try the suggested activity or talk to someone in this field",
          "Write down what interested you and what you want to explore next",
        ]
      : source.type === "guide"
        ? [
            "Read the guide and its resources",
            "Record one thing you learned and a possible next step",
          ]
        : [
            "Check the organization’s current activities",
            "Choose how to get involved and record your next step",
          ]
  return {
    ...draft,
    title: source.type === "career" ? `Explore ${title}` : title,
    source,
    steps: steps.map((title) => ({ title, done: false })),
  }
}

export function sourceLink(source: ActivityFields["source"]) {
  if (!source) return null
  if (source.type === "project") return null
  if (source.type === "organization") {
    const item = organizations.find((item) => item.id === source.id)
    return item ? { title: item.name, href: item.url, external: true } : null
  }
  return {
    title: source.type === "career" ? "Open career overview" : "Read guide",
    href: `/career?view=${source.type === "career" ? "explore" : "guides"}&resource=${encodeURIComponent(source.id)}`,
    external: false,
  }
}
