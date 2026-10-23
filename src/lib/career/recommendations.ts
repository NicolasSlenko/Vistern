import type { StudentProfile } from "@/lib/student-profile"
import { careerProjects } from "./projects"
import type { TrackId } from "./roadmap"
import type { CareerWorkspace } from "./workspace"

export type CareerExperience = {
  year: StudentProfile["year"]
  backgroundAreas: StudentProfile["backgroundAreas"]
  resumeProjectCount: number
}

export function recommendedProjects(pathId: TrackId, workspace: CareerWorkspace, experience: CareerExperience) {
  const selectedTitles = new Set(workspace.activities.map((activity) => activity.title.toLowerCase()))
  const choices = careerProjects.filter((project) => project.path === pathId && !selectedTitles.has(project.title.toLowerCase()))
  const hasProjectExperience = experience.resumeProjectCount > 0 ||
    experience.backgroundAreas.some((area) => ["projects", "work", "research"].includes(area)) ||
    workspace.activities.some((activity) => activity.kind === "project")
  const ordered = hasProjectExperience
    ? [...choices.filter((project) => project.level === "Stretch"), ...choices.filter((project) => project.level === "Starter")]
    : [...choices.filter((project) => project.level === "Starter"), ...choices.filter((project) => project.level === "Stretch")]
  return ordered.slice(0, 2)
}
