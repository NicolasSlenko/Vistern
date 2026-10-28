"use client"

import Link from "next/link"
import { ArrowUpRight, BookOpen, CalendarCheck, Check, Compass, FolderKanban, Pause, Play, Target, Users, type LucideIcon } from "lucide-react"
import { careers, guides, organizations } from "@/lib/career/catalog"
import { projectForActivity, projectPaths } from "@/lib/career/projects"
import type { CareerActivity } from "@/lib/career/workspace"

export const KIND: Record<CareerActivity["kind"], { label: string; icon: LucideIcon }> = {
  project: { label: "Project", icon: FolderKanban },
  exploration: { label: "Exploration", icon: Compass },
  learning: { label: "Learning", icon: BookOpen },
  practice: { label: "Practice", icon: Target },
  community: { label: "Community", icon: Users },
  preparation: { label: "Preparation", icon: CalendarCheck },
}

const STATUS: Record<CareerActivity["status"], string> = {
  active: "In progress",
  paused: "Saved for later",
  completed: "Complete",
}

const day = (value: string | null | undefined, withYear = true) =>
  value
    ? new Date(value.length === 10 ? `${value}T12:00:00` : value).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        ...(withYear ? { year: "numeric" } : {}),
      })
    : null

/** Steps done out of steps planned, as a whole percentage. */
export function activityProgress(activity: CareerActivity) {
  const total = activity.steps.length
  const done = activity.steps.filter((step) => step.done).length
  const percent = total ? Math.round((done / total) * 100) : activity.status === "completed" ? 100 : 0
  return { done, total, percent }
}

/** Where an activity came from, named, with a link to it if there is one. */
function origin(activity: CareerActivity) {
  const source = activity.source
  if (!source) return null
  if (source.type === "organization") {
    const item = organizations.find((entry) => entry.id === source.id)
    return item ? { label: "Organization", value: item.name, href: item.url, external: true } : null
  }
  if (source.type === "career") {
    const item = careers.find((entry) => entry.id === source.id)
    return item
      ? { label: "Career", value: item.name, href: `/career?view=explore&resource=${encodeURIComponent(item.id)}`, external: false }
      : null
  }
  if (source.type === "guide") {
    const item = guides.find((entry) => entry.id === source.id)
    return item
      ? { label: "Guide", value: item.title, href: `/career?view=guides&resource=${encodeURIComponent(item.id)}`, external: false }
      : null
  }
  return null
}

/**
 * Everything about one activity in one place: how far along it is, what it
 * is, what it uses, and what to do next. The plan and the completed-work page
 * both show it beside their lists, so choosing a different activity swaps
 * the panel rather than sending the student to another page.
 */
export function ActivityDetail({
  activity,
  onToggleStep,
  onChangeStatus,
  onEdit,
}: {
  activity: CareerActivity
  /** Leave out to show steps read-only, as finished work is. */
  onToggleStep?: (activity: CareerActivity, index: number, done: boolean) => void
  onChangeStatus?: (activity: CareerActivity, status: CareerActivity["status"]) => void
  onEdit: (activity: CareerActivity) => void
}) {
  const { done, total, percent } = activityProgress(activity)
  const kind = KIND[activity.kind]
  const project = projectForActivity(activity)
  const from = origin(activity)
  const allDone = done === total
  const notes = project ? activity.notes.split("\n\nPortfolio outcome:")[0] : activity.notes
  const details = [
    { label: "Type", value: kind.label },
    { label: "Status", value: STATUS[activity.status] },
    project && { label: "Level", value: `${project.level} · ${project.time}` },
    project && { label: "Path", value: projectPaths.find((path) => path.id === project.path)?.label ?? project.path },
    activity.scheduledOn && { label: "Date", value: day(activity.scheduledOn) },
    { label: "Started", value: day(activity.createdAt) },
    activity.completedAt
      ? { label: "Finished", value: day(activity.completedAt) }
      : activity.updatedAt !== activity.createdAt && { label: "Last update", value: day(activity.updatedAt) },
  ].filter(Boolean) as { label: string; value: string }[]

  return (
    <article className="career-detail" aria-labelledby={`detail-${activity.id}`}>
      <header className="career-detail-head">
        <span className="career-detail-icon"><kind.icon size={20} aria-hidden="true" /></span>
        <div>
          <span className="career-eyebrow">{kind.label} · {STATUS[activity.status]}</span>
          <h3 id={`detail-${activity.id}`}>{activity.title}</h3>
        </div>
      </header>

      <div className="career-detail-progress">
        <div>
          <strong>{percent}%</strong>
          <span>{total ? `${done} of ${total} steps done` : "No steps yet"}</span>
        </div>
        <div
          className="career-detail-bar"
          role="progressbar"
          aria-label={`${activity.title} progress`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          data-complete={percent === 100 || undefined}
        >
          <span style={{ width: `${percent}%` }} />
        </div>
      </div>

      <dl className="career-detail-facts">
        {details.map((item) => (
          <div key={item.label}>
            <dt>{item.label}</dt>
            <dd>{item.value}</dd>
          </div>
        ))}
        {from && (
          <div>
            <dt>{from.label}</dt>
            <dd>
              {from.external ? (
                <a href={from.href} target="_blank" rel="noopener noreferrer">{from.value} <ArrowUpRight size={13} aria-hidden="true" /></a>
              ) : (
                <Link href={from.href}>{from.value} <ArrowUpRight size={13} aria-hidden="true" /></Link>
              )}
            </dd>
          </div>
        )}
      </dl>

      {project && (
        <section className="career-detail-block" aria-label="Technologies">
          <span className="career-eyebrow">Technologies</span>
          <ul className="career-detail-tags">
            {project.tools.map((tool) => <li key={tool}>{tool}</li>)}
          </ul>
        </section>
      )}

      {project && (
        <section className="career-detail-block">
          <span className="career-eyebrow">What you&apos;ll have</span>
          <p>{project.outcome}</p>
        </section>
      )}

      {(notes || activity.reflection) && (
        <section className="career-detail-block">
          <span className="career-eyebrow">{activity.reflection ? "What came of it" : "Notes"}</span>
          <p>{activity.reflection || notes}</p>
        </section>
      )}

      {total > 0 && (
        <section className="career-detail-block">
          <span className="career-eyebrow">Steps</span>
          <ol className="career-detail-steps">
            {activity.steps.map((step, index) => (
              <li key={`${activity.id}-${index}`} data-done={step.done || undefined}>
                {onToggleStep ? (
                  <label>
                    <input type="checkbox" checked={step.done} onChange={(event) => onToggleStep(activity, index, event.target.checked)} />
                    <span>{step.title}</span>
                  </label>
                ) : (
                  <span><Check size={15} aria-hidden="true" />{step.title}</span>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      <footer className="career-detail-actions">
        {onChangeStatus && activity.status === "active" && (
          <>
            <button
              type="button"
              className="career-detail-primary"
              disabled={!allDone}
              onClick={() => onChangeStatus(activity, "completed")}
            >
              Mark complete <Check size={15} aria-hidden="true" />
            </button>
            <button type="button" onClick={() => onChangeStatus(activity, "paused")}>
              <Pause size={14} aria-hidden="true" /> Save for later
            </button>
          </>
        )}
        {onChangeStatus && activity.status === "paused" && (
          <button type="button" className="career-detail-primary" onClick={() => onChangeStatus(activity, "active")}>
            <Play size={14} aria-hidden="true" /> Move to in progress
          </button>
        )}
        <button type="button" onClick={() => onEdit(activity)}>
          {activity.status === "completed" ? "Open activity" : "Edit details"} <ArrowUpRight size={15} aria-hidden="true" />
        </button>
        {onChangeStatus && activity.status === "active" && !allDone && (
          <p>Finish the remaining {total - done === 1 ? "step" : `${total - done} steps`} to mark this complete.</p>
        )}
      </footer>
    </article>
  )
}
