"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  type CareerWorkspace as Workspace,
  type CareerActivity,
  type ActivityFields,
  formatActivityDate,
} from "@/lib/career/workspace"
import {
  activityDraft,
  projectChoices,
  projectDraft,
  sourceDraft,
} from "@/lib/career/templates"
import { ActivityEditor } from "./activity-editor"
import { ResourceBrowser } from "./resource-browser"
import { saveWorkspace } from "./save-workspace"

const tabs = [
  { id: "plan", label: "My plan" },
  { id: "explore", label: "Explore careers" },
  { id: "guides", label: "Guides" },
  { id: "practice", label: "Coding practice" },
]
type EditingActivity = ActivityFields &
  Partial<Pick<CareerActivity, "id" | "status">>

export function CareerWorkspace({
  initial,
  view = "plan",
  activityId,
  resource,
  create,
  organization,
}: {
  initial: Workspace
  view?: string
  activityId?: string
  resource?: string
  create?: string
  organization?: string
}) {
  const router = useRouter()
  const [workspace, setWorkspace] = useState(initial)
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
  const active = workspace.activities.filter(
    (activity) => activity.status === "active",
  )
  const paused = workspace.activities.filter(
    (activity) => activity.status === "paused",
  )
  const complete = workspace.activities.filter(
    (activity) => activity.status === "completed",
  )

  function choose(draft: EditingActivity) {
    setEditing(draft)
    setError("")
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
      const saved = await saveWorkspace(
        editing?.id
          ? {
              intent: "edit",
              revision: workspace.revision,
              id: editing.id,
              activity,
              status,
            }
          : { intent: "create", revision: workspace.revision, activity },
      )
      setWorkspace(saved)
      setEditing(null)
      toast.success(
        editing?.id ? "Changes saved." : "Activity added to your plan.",
      )
      router.replace("/career")
      router.refresh()
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
  const list = (items: CareerActivity[]) => (
    <div className="career-list">
      {items.map((activity) => (
        <button
          key={activity.id}
          className="career-list-row"
          onClick={() => choose(activity)}
        >
          <div>
            <strong>{activity.title}</strong>
            <p>
              {activity.status === "completed"
                ? activity.reflection || "Completed activity"
                : activity.steps.find((step) => !step.done)?.title ||
                  (activity.steps.length
                    ? "Open notes and review the outcome"
                    : "Open your notes")}
            </p>
          </div>
          <span>
            {activity.scheduledOn
              ? formatActivityDate(activity.scheduledOn)
              : activity.steps.length
                ? `${activity.steps.filter((step) => step.done).length} of ${activity.steps.length} steps`
                : "Notes only"}
          </span>
        </button>
      ))}
    </div>
  )

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
      <nav className="career-tabs" aria-label="Career pages">
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            href={tab.id === "plan" ? "/career" : `/career?view=${tab.id}`}
            aria-current={
              view === tab.id ||
              (tab.id === "plan" && ["build", "history"].includes(view))
                ? "page"
                : undefined
            }
          >
            {tab.label}
          </Link>
        ))}
      </nav>
      {editing ? (
        <ActivityEditor
          key={editing.id || "new"}
          activity={editing}
          onSave={save}
          onCancel={() => {
            setEditing(null)
            setError("")
            router.replace("/career")
          }}
          saving={saving}
          error={error}
        />
      ) : view === "build" ? (
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
      ) : ["explore", "guides", "practice"].includes(view) ? (
        <ResourceBrowser view={view} resource={resource} onChoose={choose} />
      ) : (
        <div className="career-plan-layout">
          <div>
            <section>
              <div className="career-section-heading">
                <h2>{view === "history" ? "Completed work" : "In progress"}</h2>
                {view !== "history" && (
                  <Link className="student-text-link" href="/career?view=build">
                    Start a project
                  </Link>
                )}
              </div>
              {view === "history" ? (
                complete.length ? (
                  list(complete)
                ) : (
                  <p>No completed activities yet.</p>
                )
              ) : active.length ? (
                list(active)
              ) : (
                <div className="career-plan-empty">
                  <h3>Choose something you’d like to work on</h3>
                  <p>
                    Start with a project, explore a career, or add an activity
                    of your own. You can leave it unscheduled until you’re
                    ready.
                  </p>
                  <div className="career-actions">
                    <Link className="student-button" href="/career?view=build">
                      Work on a project
                    </Link>
                    <Link
                      className="student-text-link"
                      href="/career?view=explore"
                    >
                      Explore careers
                    </Link>
                  </div>
                </div>
              )}
            </section>
            {paused.length > 0 && (
              <section className="home-section">
                <h2>Saved for later</h2>
                {list(paused)}
              </section>
            )}
            {view !== "history" && complete.length > 0 && (
              <section className="home-section">
                <div className="career-section-heading">
                  <h2>Completed work</h2>
                </div>
                {list(complete.slice(0, 5))}
                <Link className="student-text-link" href="/career?view=history">
                  View history
                </Link>
              </section>
            )}
          </div>
          <aside className="career-plan-help">
            <h2>Find a starting point</h2>
            <Link href="/career?view=guides&resource=projects">
              Build on your coursework
            </Link>
            <Link href="/career?view=guides&resource=internships">
              Learn how internships work
            </Link>
            <Link href="/community">Find a group or research opportunity</Link>
            <Link href="/career?view=practice">Plan coding practice</Link>
            <Link href="/career?new=preparation">
              Prepare for an application or interview
            </Link>
          </aside>
        </div>
      )}
    </div>
  )
}
