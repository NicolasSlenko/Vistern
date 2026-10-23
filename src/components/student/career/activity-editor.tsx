"use client"

import { useState } from "react"
import Link from "next/link"
import type { ActivityFields, CareerActivity } from "@/lib/career/workspace"
import { sourceLink } from "@/lib/career/templates"

export function ActivityEditor({
  activity,
  onSave,
  onCancel,
  saving,
  error,
}: {
  activity: ActivityFields & Partial<Pick<CareerActivity, "id" | "status">>
  onSave: (
    fields: ActivityFields,
    status: CareerActivity["status"],
  ) => Promise<void>
  onCancel: () => void
  saving: boolean
  error: string
}) {
  const [fields, setFields] = useState<ActivityFields>(activity)
  const [status, setStatus] = useState<CareerActivity["status"]>(
    activity.status || "active",
  )
  const resource = sourceLink(fields.source)
  const allDone = fields.steps.every((step) => step.done)
  function change<K extends keyof ActivityFields>(
    key: K,
    value: ActivityFields[K],
  ) {
    setFields((current) => ({ ...current, [key]: value }))
  }
  return (
    <form
      className="career-editor"
      onSubmit={(event) => {
        event.preventDefault()
        void onSave(fields, status)
      }}
    >
      <header className="career-section-heading">
        <h2>{activity.id ? "Your activity" : "Add to your plan"}</h2>
        <button
          type="button"
          className="student-text-link"
          onClick={onCancel}
          disabled={saving}
        >
          Back to plan
        </button>
      </header>
      <label className="career-field">
        What are you working on?
        <input
          disabled={saving}
          autoFocus
          required
          maxLength={180}
          value={fields.title}
          onChange={(event) => change("title", event.target.value)}
          placeholder="For example, improve my study planner"
        />
      </label>
      <div className="career-form-pair">
        <label className="career-field">
          Activity
          <select
            disabled={saving}
            value={fields.kind}
            onChange={(event) =>
              change("kind", event.target.value as ActivityFields["kind"])
            }
          >
            <option value="project">Project or classwork</option>
            <option value="exploration">Career exploration</option>
            <option value="learning">Learning</option>
            <option value="practice">Coding practice</option>
            <option value="community">Community activity</option>
            <option value="preparation">
              Application or interview preparation
            </option>
          </select>
        </label>
        <label className="career-field">
          Date <span>Optional</span>
          <input
            disabled={saving}
            type="date"
            value={fields.scheduledOn || ""}
            onChange={(event) =>
              change("scheduledOn", event.target.value || null)
            }
          />
          <small>
            Use a date you’ve chosen or one provided by the organizer or
            employer.
          </small>
        </label>
      </div>
      {resource && (
        <div className="career-source">
          <span>Related resource</span>
          {resource.external ? (
            <a
              className="student-text-link"
              href={resource.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              {resource.title}
            </a>
          ) : (
            <Link
              className="student-text-link"
              href={resource.href}
              target="_blank"
            >
              {resource.title}
            </Link>
          )}
        </div>
      )}
      <fieldset className="career-steps" disabled={saving}>
        <legend>Steps</legend>
        <p>Edit these to fit the work you want to do.</p>
        {fields.steps.map((step, index) => (
          <div className="career-step-edit" key={index}>
            <input
              disabled={saving}
              type="checkbox"
              aria-label={`Complete step ${index + 1}: ${step.title}`}
              checked={step.done}
              onChange={(event) =>
                change(
                  "steps",
                  fields.steps.map((item, i) =>
                    i === index
                      ? { ...item, done: event.target.checked }
                      : item,
                  ),
                )
              }
            />
            <input
              disabled={saving}
              aria-label={`Step ${index + 1}`}
              required
              maxLength={240}
              value={step.title}
              onChange={(event) =>
                change(
                  "steps",
                  fields.steps.map((item, i) =>
                    i === index ? { ...item, title: event.target.value } : item,
                  ),
                )
              }
            />
            <button
              type="button"
              aria-label={`Remove step ${index + 1}`}
              onClick={() =>
                change(
                  "steps",
                  fields.steps.filter((_, i) => i !== index),
                )
              }
            >
              Remove
            </button>
          </div>
        ))}
        {fields.steps.length < 6 && (
          <button
            type="button"
            className="student-text-link"
            onClick={() =>
              change("steps", [...fields.steps, { title: "", done: false }])
            }
          >
            Add a step
          </button>
        )}
      </fieldset>
      <label className="career-field">
        Notes and links
        <textarea
          disabled={saving}
          rows={4}
          maxLength={4000}
          value={fields.notes}
          onChange={(event) => change("notes", event.target.value)}
          placeholder="Keep the details you’ll need when you return to this work."
        />
      </label>
      <label className="career-field">
        What did you learn or contribute? <span>Optional</span>
        <textarea
          disabled={saving}
          rows={3}
          maxLength={2000}
          value={fields.reflection}
          onChange={(event) => change("reflection", event.target.value)}
        />
        <small>
          These notes stay with this activity. Add any experience to your resume
          separately after reviewing it.
        </small>
      </label>
      {activity.id && (
        <label className="career-field career-status-field">
          Status
          <select
            disabled={saving}
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as CareerActivity["status"])
            }
          >
            <option value="active">In progress</option>
            <option value="paused">Saved for later</option>
            <option value="completed" disabled={!allDone}>
              Completed{!allDone ? " (finish the steps first)" : ""}
            </option>
          </select>
        </label>
      )}
      {error && (
        <p role="alert" className="student-error">
          {error}
        </p>
      )}
      <div className="career-actions">
        <button type="submit" className="student-button" disabled={saving}>
          {saving ? "Saving…" : activity.id ? "Save changes" : "Add to my plan"}
        </button>
        <span className="career-save-hint">
          Changes save when you press this button.
        </span>
      </div>
      {status === "completed" && (
        <Link className="student-text-link" href="/resume">
          Review your resume
        </Link>
      )}
    </form>
  )
}
