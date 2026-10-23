import type { MasterProfile, Suggestion, TailoredResume, WorkspaceState } from "./types"

// Front-end mock data until the profile API stores this model. Nothing here reaches Supabase.

export function emptyProfile(): MasterProfile {
  return {
    contact: { name: "", email: "", phone: "", location: "", linkedin: "", github: "", portfolio: "", visibility: "private" },
    sections: {
      education: { visibility: "private", items: [] },
      experience: { visibility: "private", items: [] },
      projects: { visibility: "private", items: [] },
      skills: { visibility: "private", items: [] },
      coursework: { visibility: "private", items: [] },
    },
  }
}

export function emptyWorkspace(): WorkspaceState {
  return { profile: emptyProfile(), suggestions: [], dismissed: [], tailored: [], history: [] }
}

function sampleProfile(): MasterProfile {
  const base = emptyProfile()
  return {
    contact: {
      name: "Alex Rivera",
      email: "alex.rivera@ufl.edu",
      phone: "(352) 555-0142",
      location: "Gainesville, FL",
      linkedin: "linkedin.com/in/alexrivera",
      github: "github.com/alexrivera",
      portfolio: "",
      visibility: "private",
    },
    sections: {
      education: {
        visibility: "private",
        items: [
          {
            id: "edu-uf",
            school: "University of Florida",
            degree: "B.S.",
            field: "Computer Science",
            location: "Gainesville, FL",
            startDate: "Aug 2024",
            endDate: "May 2028",
            gpa: "3.7",
            visibility: "private",
            origin: "typed",
            bullets: [{ id: "b-edu-dean", text: "Dean's List, four semesters", visibility: "private" }],
          },
        ],
      },
      experience: {
        visibility: "private",
        items: [
          {
            id: "exp-cise",
            role: "Student Assistant",
            organization: "UF CISE Department",
            location: "Gainesville, FL",
            startDate: "Jan 2026",
            endDate: "Present",
            visibility: "private",
            origin: "typed",
            bullets: [
              { id: "b-cise-hours", text: "Ran weekly office hours for COP3502 and answered questions on the course forum.", visibility: "private" },
              { id: "b-cise-grader", text: "Helped build an autograder for programming assignments.", visibility: "private" },
            ],
          },
        ],
      },
      projects: {
        visibility: "private",
        items: [
          {
            id: "proj-cache",
            name: "Distributed cache in Go",
            technologies: ["Go", "Redis", "Docker"],
            link: "github.com/alexrivera/gocache",
            startDate: "Sep 2026",
            endDate: "",
            visibility: "private",
            origin: "typed",
            bullets: [
              { id: "b-cache-ttl", text: "Worked on an in-memory cache with TTL eviction.", visibility: "private" },
              { id: "b-cache-latency", text: "Reduced p95 latency by 40% under load.", visibility: "private" },
            ],
          },
          {
            id: "proj-discord",
            name: "Discord study-group bot",
            technologies: ["Python", "SQLite"],
            link: "",
            startDate: "Mar 2026",
            endDate: "May 2026",
            visibility: "private",
            origin: "typed",
            bullets: [
              { id: "b-discord-sched", text: "Built a bot that schedules study sessions and sends reminders.", visibility: "private" },
            ],
          },
        ],
      },
      skills: {
        visibility: "private",
        items: [
          { id: "skill-lang", category: "Languages", skills: ["Python", "Java", "Go", "SQL"], visibility: "private", origin: "typed" },
          { id: "skill-tools", category: "Tools", skills: ["Git", "Linux"], visibility: "private", origin: "typed" },
        ],
      },
      coursework: {
        visibility: base.sections.coursework.visibility,
        items: [
          { id: "course-cis4930", code: "CIS4930", title: "Systems Programming", term: "Fall 2026", visibility: "private", origin: "typed" },
          { id: "course-cop3530", code: "COP3530", title: "Data Structures and Algorithms", term: "Spring 2026", visibility: "private", origin: "typed" },
        ],
      },
    },
  }
}

function sampleSuggestions(): Suggestion[] {
  return [
    {
      id: "seed-contribution-cache",
      section: "projects",
      kind: "contribution",
      title: "Make your contribution clear",
      reason: "\"Worked on\" does not say what you personally built.",
      change: {
        type: "replace-bullet",
        entryId: "proj-cache",
        bulletId: "b-cache-ttl",
        text: "Designed and built an in-memory cache in Go with TTL eviction and LRU fallback.",
      },
    },
    {
      id: "seed-skill-docker",
      section: "skills",
      kind: "skill",
      title: "Confirm Docker",
      reason: "Docker appears in your Distributed cache project but not in your skills.",
      change: { type: "add-skill", entryId: "skill-tools", skill: "Docker" },
    },
    {
      id: "seed-metric-grader",
      section: "experience",
      kind: "metric",
      title: "Add scale to the autograder line",
      reason: "Say how many students or assignments it served.",
      change: {
        type: "replace-bullet",
        entryId: "exp-cise",
        bulletId: "b-cise-grader",
        text: "Helped build an autograder that checks 9 programming assignments for 400+ students each term.",
      },
    },
    {
      id: "seed-wording-hours",
      section: "experience",
      kind: "wording",
      title: "Lead with impact",
      reason: "Open with what students got out of office hours.",
      change: {
        type: "replace-bullet",
        entryId: "exp-cise",
        bulletId: "b-cise-hours",
        text: "Supported 250+ COP3502 students through weekly office hours and forum answers.",
      },
    },
    {
      id: "seed-add-discord",
      section: "projects",
      kind: "contribution",
      title: "Add a second line to Discord study-group bot",
      reason: "One bullet hides how the bot works. Say what you designed.",
      change: {
        type: "add-bullet",
        entryId: "proj-discord",
        text: "Stored schedules and RSVPs in SQLite and added slash commands for creating sessions.",
      },
    },
    {
      id: "seed-education-coursework",
      section: "education",
      kind: "wording",
      title: "Name your honors precisely",
      reason: "Recruiters skim for exact terms.",
      change: {
        type: "replace-bullet",
        entryId: "edu-uf",
        bulletId: "b-edu-dean",
        text: "Dean's List (Fall 2024 – Spring 2026)",
      },
    },
  ]
}

function sampleTailored(): TailoredResume {
  return {
    id: "tailor-backend",
    role: "Backend engineering intern",
    company: "",
    jobDescription: "Build services in Go and Python. Experience with Redis, Docker and REST APIs is a plus.",
    createdAt: "2026-10-20T14:00:00.000Z",
    entryIds: ["edu-uf", "exp-cise", "proj-cache", "skill-lang", "skill-tools"],
    bulletIds: ["b-edu-dean", "b-cise-grader", "b-cache-ttl", "b-cache-latency"],
    overrides: {},
    addedBullets: {},
    suggestions: [
      {
        id: "seed-role-rest",
        section: "projects",
        kind: "role-fit",
        title: "Mention the REST API",
        reason: "The posting asks for REST APIs; your cache exposes one.",
        change: {
          type: "replace-bullet",
          entryId: "proj-cache",
          bulletId: "b-cache-ttl",
          text: "Built an in-memory cache in Go with TTL eviction, served over a REST API.",
        },
      },
    ],
    dismissed: [],
  }
}

export function sampleWorkspace(): WorkspaceState {
  return {
    profile: sampleProfile(),
    suggestions: sampleSuggestions(),
    dismissed: [],
    tailored: [sampleTailored()],
    history: [
      { id: "h-seed-2", at: "2026-10-20T14:00:00.000Z", summary: "Started a resume for Backend engineering intern", section: "tailor" },
      { id: "h-seed-1", at: "2026-10-19T18:30:00.000Z", summary: "Added Distributed cache in Go", section: "projects" },
    ],
  }
}
