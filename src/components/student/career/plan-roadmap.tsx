"use client"

import Link from "next/link"
import { useState } from "react"
import { ArrowRight, ArrowUpRight, Check, ChevronDown, Compass, Plus } from "lucide-react"
import { GrowthTree } from "../growth-tree"
import { pill } from "@/components/resume-studio/pills"
import { undergradPaths } from "@/lib/career/undergrad-paths"
import { careerProjectDraft } from "@/lib/career/projects"
import { recommendedProjects, type CareerExperience } from "@/lib/career/recommendations"
import { careerGrowthProgress, completedTrackIds, roadmapProgress, roadmapStages, roadmapTaskKey, type TrackId } from "@/lib/career/roadmap"
import type { ActivityFields, CareerActivity, CareerWorkspace } from "@/lib/career/workspace"

export function PlanRoadmap({
  workspace,
  experience,
  pending,
  error,
  onSelectPath,
  onToggleRoadmapTask,
  onToggleActivityStep,
  onChangeActivityStatus,
  onChoose,
}: {
  workspace: CareerWorkspace
  experience: CareerExperience
  pending: boolean
  error: string
  onSelectPath: (pathId: TrackId) => void
  onToggleRoadmapTask: (pathId: TrackId, taskId: string, done: boolean) => void
  onToggleActivityStep: (activity: CareerActivity, stepIndex: number, done: boolean) => void
  onChangeActivityStatus: (activity: CareerActivity, status: CareerActivity["status"]) => void
  onChoose: (draft: ActivityFields & Partial<Pick<CareerActivity, "id" | "status">>) => void
}) {
  const [switching, setSwitching] = useState(false)
  const selected = undergradPaths.find((path) => path.id === workspace.selectedPathId)
  const pathId = selected?.id
  const progress = pathId ? roadmapProgress(workspace, pathId) : null
  const completedActivities = workspace.activities.filter((activity) => activity.status === "completed").length
  const completedTracks = completedTrackIds(workspace).length
  const activeActivities = workspace.activities.filter((activity) => activity.status === "active")
  const pausedActivities = workspace.activities.filter((activity) => activity.status === "paused")
  const recommendations = pathId ? recommendedProjects(pathId, workspace, experience) : []
  const checkedActivitySteps = workspace.activities.reduce((count, activity) => count + activity.steps.filter((step) => step.done).length, 0)
  const treeProgress = careerGrowthProgress(workspace)
  const hasProjectExperience = experience.resumeProjectCount > 0 || experience.backgroundAreas.some((area) => ["projects", "work", "research"].includes(area)) || workspace.activities.some((activity) => activity.kind === "project")

  const trackPicker = (
    <div className="career-plan-track-grid" role="group" aria-label="Choose a career track">
      {undergradPaths.map((path) => (
        <button
          type="button"
          key={path.id}
          disabled={pending}
          aria-pressed={path.id === pathId}
          onClick={() => { onSelectPath(path.id); setSwitching(false) }}
        >
          <span className="career-eyebrow">TRACK {path.number}</span>
          <strong>{path.title}</strong>
          <small>{path.short}</small>
          <span className="career-plan-track-arrow"><ArrowRight size={17} aria-hidden="true" /></span>
        </button>
      ))}
    </div>
  )

  return (
    <div className="career-plan-roadmap">
      {selected && pathId && progress ? (
        <>
          <header className="career-plan-roadmap-hero">
            <div>
              <span className="career-eyebrow">Your track / {selected.title}</span>
              <h2>Make your next move visible.</h2>
              <p>{selected.short} Follow the stages, check off what you have done, and use your own activities as proof of progress.</p>
              <button type="button" className="career-plan-change-track" aria-expanded={switching} onClick={() => setSwitching(!switching)}>
                {switching ? "Close track choices" : "Change track"} <ChevronDown size={15} aria-hidden="true" />
              </button>
            </div>
            <span className="career-plan-hero-number">{selected.number} / 04</span>
          </header>
          {switching && trackPicker}
          <div className="career-plan-progress">
            <div><span className="career-eyebrow">Track your progress</span><strong>{progress.completed} / {progress.total} steps done</strong></div>
            <div role="progressbar" aria-label={`${selected.title} roadmap progress`} aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.completed}>
              <span style={{ width: `${progress.percent}%` }} />
            </div>
          </div>
          {error && <p className="student-error" role="alert">{error}</p>}
          <div className="career-plan-roadmap-layout">
            <div className="career-plan-timeline">
              {roadmapStages[pathId].map((stage, stageIndex) => {
                const stageDone = stage.tasks.filter((task) => workspace.roadmapDone.includes(roadmapTaskKey(pathId, task.id))).length
                return (
                  <section className="career-plan-stage" key={stage.id} aria-labelledby={`stage-${stage.id}`}>
                    <div className="career-plan-stage-heading">
                      <span className="career-plan-stage-number">{String(stageIndex + 1).padStart(2, "0")}</span>
                      <div><span className="career-eyebrow">Stage {String(stageIndex + 1).padStart(2, "0")} · {stageDone} of {stage.tasks.length} done</span><h3 id={`stage-${stage.id}`}>{stage.title}</h3><p>{stage.description}</p></div>
                    </div>
                    <div className="career-plan-stage-tasks">
                      {stage.tasks.map((task) => {
                        const key = roadmapTaskKey(pathId, task.id)
                        const done = workspace.roadmapDone.includes(key)
                        return (
                          <div className="career-plan-roadmap-task" key={task.id} data-done={done}>
                            <label className="career-plan-roadmap-task-content">
                              <input type="checkbox" checked={done} onChange={(event) => onToggleRoadmapTask(pathId, task.id, event.target.checked)} />
                              <span><strong>{task.title}</strong><small>{task.detail}</small></span>
                            </label>
                          </div>
                        )
                      })}
                    </div>
                  </section>
                )
              })}
            </div>
            <aside className="career-plan-roadmap-side">
              <section className="career-plan-growth" aria-labelledby="career-growth-title">
                <GrowthTree progress={treeProgress} decorative />
                <span className="career-eyebrow">Your growth</span>
                <h3 id="career-growth-title">Progress grows with the work.</h3>
                <p>{progress.completed} roadmap steps · {checkedActivitySteps} activity steps · {completedActivities} finished activities</p>
              </section>
              <section className="career-plan-suggestions" aria-labelledby="career-suggestions-title">
                <span className="career-eyebrow">Recommended next builds</span>
                <h3 id="career-suggestions-title">Put this path into practice.</h3>
                <p>{hasProjectExperience ? "Your saved experience or plan includes a project. Try a stretch build when you are ready." : "Start with a small build you can finish and show."} These suggestions use your chosen track and saved work.</p>
                {recommendations.map((project) => <div className="career-plan-suggestion" key={project.id}><span>{project.level} · {project.time}</span><strong>{project.title}</strong><button type="button" onClick={() => onChoose(careerProjectDraft(project))}>Add to my plan <ArrowRight size={15} aria-hidden="true" /></button></div>)}
                <Link href={`/career?view=projects&resource=${pathId}`}>Browse all {selected.title} projects <ArrowUpRight size={15} aria-hidden="true" /></Link>
              </section>
            </aside>
          </div>
        </>
      ) : (
        <section className="career-plan-pick">
          <span className="career-eyebrow">Choose your direction</span>
          <h2>A roadmap built around your path.</h2>
          <p>Pick the kind of work you want to try. We will give you a focused set of stages and project ideas, then track the steps you complete.</p>
          {error && <p className="student-error" role="alert">{error}</p>}
          {trackPicker}
          <p className="career-plan-pick-note"><Compass size={18} aria-hidden="true" /> You can change tracks later. Your checked steps stay saved for each path.</p>
        </section>
      )}

      <section className="career-plan-work" aria-labelledby="career-work-title">
        <div className="career-plan-work-heading"><div><span className="career-eyebrow">Your own work</span><h2 id="career-work-title">Activities in your plan</h2></div><Link href="/career?view=projects"><Plus size={16} aria-hidden="true" /> Find a project</Link></div>
        {activeActivities.length ? activeActivities.map((activity) => <ActivityCard key={activity.id} activity={activity} onChoose={onChoose} onToggleStep={onToggleActivityStep} onChangeStatus={onChangeActivityStatus} />) : <div className="career-plan-work-empty"><h3>No activities in progress yet.</h3><p>Choose a recommended build or add an activity from class, a club, or your own idea.</p><Link href="/career?view=projects">Explore projects <ArrowRight size={16} aria-hidden="true" /></Link></div>}
        {pausedActivities.length > 0 && <div className="career-plan-other-work"><h3>Saved for later</h3>{pausedActivities.map((activity) => <ActivityCard key={activity.id} activity={activity} onChoose={onChoose} onToggleStep={onToggleActivityStep} onChangeStatus={onChangeActivityStatus} />)}</div>}
        {completedActivities + completedTracks > 0 && <Link className="career-plan-history-link" href="/career?view=history"><Check size={16} aria-hidden="true" /> View completed work <span>{completedActivities + completedTracks}</span><ArrowRight size={15} aria-hidden="true" /></Link>}
      </section>
    </div>
  )
}

function ActivityCard({ activity, onChoose, onToggleStep, onChangeStatus }: {
  activity: CareerActivity
  onChoose: (draft: CareerActivity) => void
  onToggleStep: (activity: CareerActivity, index: number, done: boolean) => void
  onChangeStatus: (activity: CareerActivity, status: CareerActivity["status"]) => void
}) {
  const done = activity.steps.filter((step) => step.done).length
  const allDone = done === activity.steps.length
  return <article className="career-plan-activity">
    <div className="career-plan-activity-heading"><div><span className="career-eyebrow">{activity.kind} · {activity.status === "paused" ? "saved for later" : `${done} / ${activity.steps.length} steps`}</span><h3>{activity.title}</h3></div><button type="button" onClick={() => onChoose(activity)}>Edit details <ArrowUpRight size={15} aria-hidden="true" /></button></div>
    {activity.steps.length > 0 ? <div className="career-plan-activity-steps">{activity.steps.map((step, index) => <label key={`${activity.id}-${index}`}><input type="checkbox" checked={step.done} onChange={(event) => onToggleStep(activity, index, event.target.checked)} /><span>{step.title}</span></label>)}</div> : <p className="career-plan-activity-note">Open this activity to add steps or record what you worked on.</p>}
    <div className="career-plan-activity-actions">{activity.status === "paused" ? <button type="button" className={pill("white")} onClick={() => onChangeStatus(activity, "active")}>Move to in progress</button> : <button type="button" className={pill("brand")} disabled={!allDone} title={!allDone ? "Finish the steps first" : undefined} onClick={() => onChangeStatus(activity, "completed")}>Mark activity complete <Check aria-hidden="true" /></button>}{!allDone && activity.status !== "paused" && <span>Finish the remaining steps to complete this activity.</span>}</div>
  </article>
}
