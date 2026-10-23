"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import {
  type CareerWorkspace as Workspace,
  type CareerActivity,
  type ActivityFields,
  type WorkspaceUpdate,
  updateWorkspace,
} from "@/lib/career/workspace"
import type { CareerExperience } from "@/lib/career/recommendations"
import type { TrackId } from "@/lib/career/roadmap"
import { careerNavigationEvent, navigateCareer } from "@/lib/career/navigation"
import {
  activityDraft,
  projectChoices,
  projectDraft,
  sourceDraft,
} from "@/lib/career/templates"
import { ActivityEditor } from "./activity-editor"
import { ResourceBrowser } from "./resource-browser"
import { ProjectBrowser } from "./project-browser"
import { PlanRoadmap } from "./plan-roadmap"
import { CompletedWork } from "./completed-work"
import { saveWorkspace } from "./save-workspace"

type EditingActivity = ActivityFields &
  Partial<Pick<CareerActivity, "id" | "status">>
type QuickAction = {
  build: (current: Workspace) => WorkspaceUpdate
  message: string
  resolve: (saved: boolean) => void
}

export function CareerWorkspace({
  initial,
  view = "plan",
  activityId,
  resource,
  create,
  organization,
  experience,
}: {
  initial: Workspace
  view?: string
  activityId?: string
  resource?: string
  create?: string
  organization?: string
  experience: CareerExperience
}) {
  const [workspace, setWorkspace] = useState(initial)
  const [location, setLocation] = useState({ view, resource })
  const [editing, setEditing] = useState<EditingActivity | null>(
    () =>
      initial.activities.find((activity) => activity.id === activityId) ||
      (organization
        ? sourceDraft({ type: "organization", id: organization })
        : create
          ? activityDraft(create === "preparation" ? "preparation" : "project")
          : null),
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [quickSaving, setQuickSaving] = useState(false)
  const [quickError, setQuickError] = useState("")
  const confirmedRef = useRef(initial)
  const visibleRef = useRef(initial)
  const quickQueueRef = useRef<QuickAction[]>([])
  const drainingRef = useRef(false)
  const idleRef = useRef<Promise<void>>(Promise.resolve())

  useEffect(() => {
    const updateLocation = () => {
      const query = new URLSearchParams(window.location.search)
      setLocation({ view: query.get("view") || "plan", resource: query.get("resource") || undefined })
      setEditing(null)
    }
    window.addEventListener(careerNavigationEvent, updateLocation)
    window.addEventListener("popstate", updateLocation)
    return () => {
      window.removeEventListener(careerNavigationEvent, updateLocation)
      window.removeEventListener("popstate", updateLocation)
    }
  }, [])

  function choose(draft: EditingActivity) {
    setEditing(draft.id ? visibleRef.current.activities.find((activity) => activity.id === draft.id) || draft : draft)
    setError("")
  }
  async function drainQuickQueue() {
    drainingRef.current = true
    setQuickSaving(true)
    while (quickQueueRef.current.length) {
      const action = quickQueueRef.current[0]
      try {
        const saved = await saveWorkspace(action.build(confirmedRef.current))
        confirmedRef.current = saved
        quickQueueRef.current.shift()
        action.resolve(true)
        if (action.message) toast.success(action.message)
        let visible = saved
        for (const queued of quickQueueRef.current) {
          visible = updateWorkspace(visible, queued.build(visible), crypto.randomUUID(), new Date().toISOString())
        }
        visibleRef.current = visible
        setWorkspace(visible)
      } catch (reason) {
        const message = reason instanceof Error ? reason.message : "Your plan couldn’t be saved. Please try again."
        for (const queued of quickQueueRef.current) queued.resolve(false)
        quickQueueRef.current = []
        visibleRef.current = confirmedRef.current
        setWorkspace(confirmedRef.current)
        setQuickError(message)
        toast.error(message)
      }
    }
    drainingRef.current = false
    setQuickSaving(false)
  }
  function saveQuick(build: QuickAction["build"], message = ""): Promise<boolean> {
    try {
      const visible = visibleRef.current
      const predicted = updateWorkspace(visible, build(visible), crypto.randomUUID(), new Date().toISOString())
      visibleRef.current = predicted
      setWorkspace(predicted)
      setQuickError("")
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "This change couldn’t be made."
      setQuickError(message)
      return Promise.resolve(false)
    }
    return new Promise((resolve) => {
      quickQueueRef.current.push({ build, message, resolve })
      if (!drainingRef.current) idleRef.current = drainQuickQueue()
    })
  }
  function activityFields(activity: CareerActivity): ActivityFields {
    const { title, kind, notes, reflection, scheduledOn, source, steps } = activity
    return { title, kind, notes, reflection, scheduledOn, source, steps }
  }
  async function selectPath(pathId: TrackId, navigate = false) {
    const saved = await saveQuick((current) => ({ intent: "selectPath", revision: current.revision, pathId }), "Track updated.")
    if (saved && navigate) navigateCareer("/career")
  }
  async function toggleRoadmapTask(pathId: TrackId, taskId: string, done: boolean) {
    await saveQuick((current) => ({ intent: "toggleRoadmapTask", revision: current.revision, pathId, taskId, done }))
  }
  async function toggleActivityStep(activity: CareerActivity, stepIndex: number, done: boolean) {
    await saveQuick((current) => {
      const latest = current.activities.find((item) => item.id === activity.id)
      if (!latest) throw new Error("This activity is no longer available. Reload your plan.")
      const steps = latest.steps.map((step, index) => index === stepIndex ? { ...step, done } : step)
      return { intent: "edit", revision: current.revision, id: activity.id, activity: { ...activityFields(latest), steps }, status: latest.status }
    })
  }
  async function changeActivityStatus(activity: CareerActivity, status: CareerActivity["status"]) {
    await saveQuick((current) => {
      const latest = current.activities.find((item) => item.id === activity.id)
      if (!latest) throw new Error("This activity is no longer available. Reload your plan.")
      return { intent: "edit", revision: current.revision, id: activity.id, activity: activityFields(latest), status }
    }, status === "completed" ? "Activity completed." : "Activity moved to in progress.")
  }
  async function save(
    fields: ActivityFields,
    status: CareerActivity["status"],
  ) {
    if (saving) return
    setSaving(true)
    setError("")
    const { title, kind, notes, reflection, scheduledOn, source, steps } =
      fields
    const activity = {
      title,
      kind,
      notes,
      reflection,
      scheduledOn,
      source,
      steps,
    }
    try {
      await idleRef.current
      const saved = await saveWorkspace(
        editing?.id
          ? {
              intent: "edit",
              revision: confirmedRef.current.revision,
              id: editing.id,
              activity,
              status,
            }
          : { intent: "create", revision: confirmedRef.current.revision, activity },
      )
      confirmedRef.current = saved
      visibleRef.current = saved
      setWorkspace(saved)
      setEditing(null)
      toast.success(
        editing?.id ? "Changes saved." : "Activity added to your plan.",
      )
      navigateCareer("/career", true)
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Your plan couldn’t be saved. Please try again.",
      )
    } finally {
      setSaving(false)
    }
  }
  return (
    <div className="career-page">
      <header className="career-page-heading">
        <div>
          <h1>Career</h1>
          <p>Keep your work, learning, and preparation together.</p>
        </div>
        {!editing && (
          <button
            className="student-button student-secondary"
            onClick={() => choose(activityDraft())}
          >
            Add an activity
          </button>
        )}
      </header>
      {quickError && location.view !== "plan" && <p className="student-error" role="alert">{quickError}</p>}
      {editing ? (
        <ActivityEditor
          key={editing.id || "new"}
          activity={editing}
          onSave={save}
          onCancel={() => {
            setEditing(null)
            setError("")
            navigateCareer("/career", true)
          }}
          saving={saving}
          error={error}
        />
      ) : location.view === "build" ? (
        <section className="career-build">
          <h2>Build experience</h2>
          <p>
            Choose a starting point for the work you want to do. You can edit
            the steps and add notes as you go.
          </p>
          <div className="career-build-options">
            {projectChoices.map((choice) => (
              <button
                key={choice.id}
                onClick={() => choose(projectDraft(choice.id))}
              >
                <h3>{choice.title}</h3>
                <p>{choice.description}</p>
                <span className="student-text-link">Choose a project</span>
              </button>
            ))}
            <Link href="/community">
              <h3>Find people to learn with</h3>
              <p>
                Look into computing groups, research, and campus activities.
              </p>
              <span className="student-text-link">Explore community</span>
            </Link>
          </div>
        </section>
      ) : location.view === "projects" ? (
        <ProjectBrowser resource={location.resource} onChoose={choose} />
      ) : ["explore", "guides", "practice"].includes(location.view) ? (
        <ResourceBrowser view={location.view} resource={location.resource} onChoose={choose} onSelectPath={(pathId) => { void selectPath(pathId, true) }} />
      ) : location.view === "history" ? (
        <CompletedWork workspace={workspace} onChoose={choose} />
      ) : (
        <PlanRoadmap
          workspace={workspace}
          experience={experience}
          pending={quickSaving}
          error={quickError}
          onSelectPath={(pathId) => { void selectPath(pathId) }}
          onToggleRoadmapTask={(pathId, taskId, done) => { void toggleRoadmapTask(pathId, taskId, done) }}
          onToggleActivityStep={(activity, index, done) => { void toggleActivityStep(activity, index, done) }}
          onChangeActivityStatus={(activity, status) => { void changeActivityStatus(activity, status) }}
          onChoose={choose}
        />
      )}
    </div>
  )
}
