// Content carried over from planning/student-experience/campus-guide.js.
// People, posts, events, and other fictional prototype records are deliberately excluded.

export const careers = [
  {
    id: "fullstack",
    name: "Full-stack engineering",
    description: "Build a feature from the screen to the database.",
    daily:
      "Work on interfaces, server logic, data storage, and the connections between them.",
    skills: [
      "Programming fundamentals",
      "HTML, CSS, and JavaScript",
      "APIs and SQL",
      "Git and testing",
    ],
    experiment:
      "Build a club event page that saves registrations and handles a full event.",
    roadmap: "https://roadmap.sh/full-stack",
  },
  {
    id: "frontend",
    name: "Frontend engineering",
    description: "Build the parts of software people use.",
    daily:
      "Turn a design into a working interface, fix browser issues, and check accessibility and performance.",
    skills: [
      "HTML and CSS",
      "JavaScript",
      "Accessibility",
      "Browser debugging",
    ],
    experiment:
      "Build a searchable campus event list that works with a keyboard and on a phone.",
    roadmap: "https://roadmap.sh/frontend",
  },
  {
    id: "backend",
    name: "Backend engineering",
    description: "Build the systems behind an application.",
    daily:
      "Design APIs, work with databases, test business rules, and investigate slow or failing services.",
    skills: [
      "One programming language",
      "Data structures",
      "HTTP and SQL",
      "Testing and debugging",
    ],
    experiment:
      "Create an API for reserving study rooms and prevent overlapping reservations.",
    roadmap: "https://roadmap.sh/backend",
  },
  {
    id: "aiml",
    name: "AI & machine learning",
    description: "Build and evaluate systems that learn from data.",
    daily:
      "Prepare data, compare models, inspect errors, and decide whether a model improves the product.",
    skills: [
      "Python",
      "Linear algebra and statistics",
      "Data preparation",
      "Model evaluation",
    ],
    experiment:
      "Compare a simple baseline with a model on a public dataset, then describe where it fails.",
    roadmap: "https://roadmap.sh/ai-data-scientist",
  },
  {
    id: "data",
    name: "Data & analytics",
    description: "Use data to answer practical questions.",
    daily:
      "Write queries, check data quality, create analyses, and explain the limits of a conclusion.",
    skills: [
      "SQL",
      "Python or R",
      "Statistics",
      "Clear charts and explanations",
    ],
    experiment:
      "Use public transit data to answer one question about service frequency.",
    roadmap: "https://roadmap.sh/data-analyst",
  },
  {
    id: "cyber",
    name: "Cybersecurity",
    description: "Find weaknesses and protect systems.",
    daily:
      "Review alerts, investigate failures, test defenses in authorized environments, and write clear reports.",
    skills: [
      "Networking",
      "Linux",
      "Programming or scripting",
      "Security fundamentals",
    ],
    experiment:
      "Inspect a practice login log and write a short investigation with evidence and uncertainty.",
    roadmap: "https://roadmap.sh/cyber-security",
  },
  {
    id: "mobile",
    name: "Mobile engineering",
    description: "Build apps for phones and tablets.",
    daily:
      "Build screens, connect APIs, handle offline behavior, and test on different devices.",
    skills: [
      "Swift, Kotlin, or a cross-platform framework",
      "Interface design",
      "APIs",
      "Device testing",
    ],
    experiment:
      "Build a campus checklist that saves offline and works with a screen reader.",
    roadmap: "https://roadmap.sh/android",
  },
  {
    id: "qa",
    name: "QA & test engineering",
    description: "Find risks before users find bugs.",
    daily:
      "Explore how software can fail, reproduce bugs, write automated tests, and help teams release safely.",
    skills: [
      "Testing fundamentals",
      "Programming",
      "Clear bug reports",
      "Automation tools",
    ],
    experiment:
      "Test a sign-up form, document edge cases, and automate its most important flow.",
    roadmap: "https://roadmap.sh/qa",
  },
  {
    id: "product",
    name: "Technical product management",
    description: "Help a team decide what to build and why.",
    daily:
      "Talk to users, define a problem, prioritize work, and check whether a release solved it.",
    skills: [
      "User research",
      "Clear writing",
      "Technical understanding",
      "Data and prioritization",
    ],
    experiment:
      "Interview three students about a campus problem and write a one-page feature proposal.",
    roadmap: "https://roadmap.sh/product-manager",
  },
]

export const guides = [
  {
    id: "careers",
    title: "What can you do with a CS degree?",
    intro:
      "CS is a foundation for several kinds of work. You do not have to choose a job title before you start learning.",
    sections: [
      [
        "Start with the work",
        "Software engineers build and maintain applications. Data teams investigate questions using data. Security teams protect systems. Product managers help teams decide which problems to solve. Each area contains several different roles.",
      ],
      [
        "Try something small",
        "Pick two areas that interest you. Read about the daily work, try a small task, and ask a student or mentor what surprised them about the role.",
      ],
      [
        "Keep the useful foundations",
        "Programming, debugging, writing, and teamwork matter across many paths. Coursework and a small project are useful while you explore.",
      ],
    ],
    resources: [
      [
        "CS50: introduction to computer science",
        "Video lecture",
        "https://cs50.harvard.edu/x/weeks/0/",
      ],
      [
        "Uber: student and intern experiences",
        "Career videos",
        "https://jobs.uber.com/en/teams/emerging-talent/",
      ],
    ],
  },
  {
    id: "internships",
    title: "What is a tech internship?",
    intro:
      "An internship is a temporary role where you work with a team and learn on the job. You can have more than one during college.",
    sections: [
      [
        "Why students apply",
        "Internships give you a chance to try a role, get feedback, and build experience. They can help with later recruiting, but a class project, campus job, research, or open source contribution can also give you work to discuss.",
      ],
      [
        "What an application usually involves",
        "You choose a role, submit a resume and required information, and may complete an assessment or interviews. The steps depend on the employer. Keep a copy of the posting and the resume you used.",
      ],
      [
        "Your next step",
        "Read a few postings before deciding you are unqualified. Look for student year, graduation dates, coursework, location, and work authorization requirements. Application periods differ, so use the employer’s current posting.",
      ],
    ],
    resources: [
      [
        "UF internship guide",
        "University resource",
        "https://career.ufl.edu/gain-experience/internships/",
      ],
      [
        "Explore Microsoft",
        "First- and second-year program information",
        "https://careers.microsoft.com/v2/global/en/exploremicrosoft",
      ],
      [
        "Uber emerging talent",
        "Program information and intern stories",
        "https://jobs.uber.com/en/teams/emerging-talent/",
      ],
    ],
  },
  {
    id: "coding",
    title: "Why people practice on LeetCode",
    intro:
      "Some software interviews ask you to solve coding problems and explain your reasoning. Practicing this is different from building a complete application.",
    sections: [
      [
        "Learn the basics first",
        "If loops, functions, or arrays are still new, practice those before timed interview problems. As you learn data structures, connect each topic to a small problem you can explain.",
      ],
      [
        "Use a roadmap that already exists",
        "NeetCode and LeetCode organize problems and explanations. Open their resources here, keep your progress, and use Vistern for review reminders. You do not need to complete several roadmaps at once.",
      ],
      [
        "Be honest about what you learned",
        "Record whether you solved it independently, used a hint, or read the solution. Return to a problem later and explain the approach, edge cases, and time and space complexity. A solved count alone does not show interview readiness.",
      ],
    ],
    resources: [
      [
        "NeetCode roadmap",
        "Roadmap and video explanations",
        "https://neetcode.io/roadmap",
      ],
      [
        "LeetCode study plans",
        "Practice plans",
        "https://leetcode.com/studyplan/",
      ],
    ],
  },
  {
    id: "projects",
    title: "Turn coursework into experience",
    intro:
      "Your coursework can show how you solve problems. A resume needs a clear description of what you personally built and learned.",
    sections: [
      [
        "Start with work you have done",
        "A programming assignment can demonstrate input handling, debugging, data structures, or testing. Check your completed work before adding a skill or a project claim. A course title does not prove you completed every assignment.",
      ],
      [
        "Make the project explainable",
        "Describe the problem, your contribution, the tools you used, and one choice or challenge. Add a result only when you can support it. Do not invent users, performance gains, or responsibilities.",
      ],
      [
        "Give it a next step",
        "Improve error handling, add tests, write setup instructions, or ask someone to use it. Respect your course’s rules before publishing assignment code.",
      ],
    ],
    resources: [
      [
        "GitHub: documenting a project",
        "README guidance",
        "https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes",
      ],
      [
        "CS50 final projects",
        "Project gallery",
        "https://cs50.harvard.edu/x/gallery/",
      ],
    ],
  },
  {
    id: "opensource",
    title: "Contribute to an existing project",
    intro:
      "Open source gives you practice reading unfamiliar code and working with other contributors. Useful contributions can include documentation, tests, or fixes.",
    sections: [
      [
        "Choose a project you can run",
        "Start with software you use or a campus project. Read its README, contribution instructions, and recent issues. Check that someone is still maintaining it.",
      ],
      [
        "Agree on a small change",
        "Look for a clear issue, reproduce it, and ask a focused question when the instructions are unclear. Avoid spending days on a large change without discussing the scope.",
      ],
      [
        "Learn from the review",
        "Follow the project’s testing and submission instructions. A maintainer may ask for changes or decline the contribution. Keep notes on what you learned and your own contribution.",
      ],
    ],
    resources: [
      [
        "GitHub: contributing to open source",
        "Step-by-step guide",
        "https://docs.github.com/en/get-started/exploring-projects-on-github/contributing-to-open-source",
      ],
      [
        "Open Source Guides",
        "Contribution guide",
        "https://opensource.guide/how-to-contribute/",
      ],
    ],
  },
  {
    id: "research",
    title: "Find a research starting point at UF",
    intro:
      "Research can help you explore a technical question with a faculty member or a lab. You can begin by learning about a project already in progress.",
    sections: [
      [
        "Browse the work first",
        "Use UF’s research resources to find faculty and projects. Read a project summary and write down what interests you or what you want to understand.",
      ],
      [
        "Talk to a peer advisor",
        "UF’s Center for Undergraduate Research offers guidance on finding a mentor. Bring your interests, classes, and questions. You can explore work beyond your major.",
      ],
      [
        "Write a specific introduction",
        "Mention who you are, the part of the project that interests you, relevant coursework, and a question about getting involved. Ask about expectations, time, pay or credit, and prerequisite skills.",
      ],
    ],
    resources: [
      [
        "UF: find research",
        "Research database and peer advising",
        "https://cur.aa.ufl.edu/find-research/",
      ],
      [
        "UF undergraduate research programs",
        "Program directory",
        "https://cur.aa.ufl.edu/programs/",
      ],
    ],
  },
  {
    id: "hackathons",
    title: "What happens at a hackathon?",
    intro:
      "At a hackathon, students usually form teams and build a small project during the event. It is also a place to attend workshops and meet other students.",
    sections: [
      [
        "Choose a manageable project",
        "A complete small feature is easier to finish and explain than a large idea. Talk with your team about what each person wants to learn and how you will divide work.",
      ],
      [
        "You can arrive as a beginner",
        "Read the event’s requirements and beginner resources. Look for team matching, workshops, and mentors. Ask for help early instead of staying stuck alone.",
      ],
      [
        "Keep the work afterward",
        "Save a project summary, your contribution, and what you would improve. You can continue the project with your team after the event.",
      ],
    ],
    resources: [
      ["SwampHacks", "UF hackathon website", "https://swamphacks.com/"],
      ["Major League Hacking", "Hackathon directory", "https://www.mlh.com/"],
    ],
  },
  {
    id: "newgrad",
    title: "How new grad recruiting works",
    intro:
      "New grad roles are full-time jobs aimed at people finishing or recently completing their degree. Employers define their own graduation windows and start dates.",
    sections: [
      [
        "Work backward from graduation",
        "Set your expected graduation and possible start dates. Read current postings early, because employers recruit on different schedules and some fill roles before graduation.",
      ],
      [
        "Use all of your experience",
        "Choose projects, internships, research, campus work, or contributions that show your skills. For each, explain what you owned, how you worked with others, and what you learned.",
      ],
      [
        "Prepare and apply in parallel",
        "Keep a short list of suitable roles, tailor your resume using supported facts, and practice for the interviews those roles use. Track follow-ups and continue exploring while applications are pending.",
      ],
    ],
    resources: [
      [
        "Microsoft early careers",
        "Student and graduate roles",
        "https://careers.microsoft.com/v2/global/en/students",
      ],
      [
        "UF Career Connections Center",
        "Career advising and recruiting resources",
        "https://career.ufl.edu/",
      ],
    ],
  },
]

export const organizations = [
  {
    id: "swamphacks",
    name: "SwampHacks",
    kind: "Hackathons",
    description:
      "UF’s student hackathon. Find event details, registration, and ways to get involved on the organizer’s site.",
    url: "https://swamphacks.com/",
  },
  {
    id: "shpe",
    name: "SHPE UF",
    kind: "Engineering community",
    description:
      "Explore chapter events, professional development, and the UF engineering community.",
    url: "https://www.shpeuf.com/",
  },
  {
    id: "acm",
    name: "UF ACM",
    kind: "CS community",
    description:
      "Find computing events and special interest groups, including open source and security.",
    url: "https://uf-acm.com/",
  },
  {
    id: "research",
    name: "UF undergraduate research",
    kind: "Research",
    description:
      "Browse research resources and connect with peer advising before approaching a lab.",
    url: "https://cur.aa.ufl.edu/find-research/",
  },
  {
    id: "gatorconnect",
    name: "GatorConnect",
    kind: "Clubs and events",
    description:
      "Browse UF organizations and campus events, including engineering and computing groups.",
    url: "https://gatorconnect.ufl.edu/",
  },
  {
    id: "mlh",
    name: "Major League Hacking",
    kind: "Hackathons",
    description:
      "Find hackathons beyond Gainesville and check each organizer’s dates and participation details.",
    url: "https://www.mlh.com/",
  },
  {
    id: "careercenter",
    name: "UF Career Connections Center",
    kind: "Career support",
    description:
      "Find career advising, internship resources, and recruiting events.",
    url: "https://career.ufl.edu/",
  },
]
