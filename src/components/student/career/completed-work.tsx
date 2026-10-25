"use client"

import Link from "next/link"
import { useRef, useState } from "react"
import { ArrowLeft, ArrowUpRight, BookOpenCheck, Check, CircleCheck, Leaf } from "lucide-react"
import { GrowthGarden, type GardenLeaf } from "@/components/growth/growth-garden"
import { completedTrackIds, roadmapProgress, roadmapStages, type TrackId } from "@/lib/career/roadmap"
import { undergradPaths } from "@/lib/career/undergrad-paths"
import type { CareerActivity, CareerWorkspace } from "@/lib/career/workspace"

type CompletedItem =
  | { key: string; type: "track"; title: string; description: string; pathId: TrackId }
  | { key: string; type: "activity"; title: string; description: string; activity: CareerActivity }

function dateLabel(value: string | null) {
  return value
    ? new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "Completed"
}

export function CompletedWork({
  workspace,
  onChoose,
}: {
  workspace: CareerWorkspace
  onChoose: (activity: CareerActivity) => void
}) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const detailRef = useRef<HTMLDivElement>(null)
  const tracks: CompletedItem[] = completedTrackIds(workspace).map((pathId) => {
    const path = undergradPaths.find((entry) => entry.id === pathId)!
    return { key: `track:${pathId}`, type: "track", title: path.title, description: path.short, pathId }
  })
  const activities: CompletedItem[] = workspace.activities
    .filter((activity) => activity.status === "completed")
    .sort((a, b) => (b.completedAt || "").localeCompare(a.completedAt || ""))
    .map((activity) => ({
      key: `activity:${activity.id}`,
      type: "activity",
      title: activity.title,
      description: activity.reflection || activity.notes || "Finished activity",
      activity,
    }))
  const items = [...tracks, ...activities]
  const selected = items.find((item) => item.key === selectedKey) || items[0]

  // Oldest first on the tree, so a leaf keeps its place as more is finished —
  // the opposite order to the list below, which reads newest first.
  const leaves: GardenLeaf[] = [...items]
    .reverse()
    .map((item) => ({
      id: item.key,
      title: item.title,
      tone: item.type === "track" ? "track" : item.activity.kind,
      label: item.type === "track" ? "Career track" : item.activity.kind,
      note: item.description,
      date: item.type === "track" ? null : item.activity.completedAt,
    }))
  const trackProgress = selected?.type === "track" ? roadmapProgress(workspace, selected.pathId) : null

  function selectItem(key: string) {
    setSelectedKey(key)
    requestAnimationFrame(() => detailRef.current?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
      block: "start",
    }))
  }

  return (
    <section className="career-history" aria-labelledby="career-history-title">
      <Link className="career-history-back" href="/career"><ArrowLeft size={16} aria-hidden="true" /> Back to my plan</Link>
      <div className="career-history-intro">
        <span className="career-eyebrow">Your progress / completed work</span>
        <h2 id="career-history-title">The work behind your growth.</h2>
        <p>Every finished activity and career track has a place here. Select a highlighted leaf to revisit what you accomplished.</p>
      </div>
      <div className="career-history-layout">
        <div className="career-history-tree-panel">
          <div className="career-history-tree-heading"><span className="career-eyebrow">Growth archive</span><span>{items.length} {items.length === 1 ? "milestone" : "milestones"}</span></div>
          <div className="career-history-tree-art">
            {/* The same tree as the home page, from the same component, so a
                leaf is in the same place on both. Selection is driven from
                here because this page already has a detail panel for it. */}
            <GrowthGarden
              leaves={leaves}
              selected={selected?.key ?? null}
              onSelect={(key) => key && selectItem(key)}
            >
              <p className="text-[13px] leading-snug text-ink-2">
                {items.length
                  ? "Each leaf is something you finished. Choose one to see its details."
                  : "Your first completed milestone grows the first leaf."}
              </p>
            </GrowthGarden>
          </div>
        </div>
        {selected ? (
          <div ref={detailRef} className="career-history-detail" aria-live="polite">
            <span className="career-history-detail-icon">{selected.type === "track" ? <BookOpenCheck size={21} aria-hidden="true" /> : <CircleCheck size={21} aria-hidden="true" />}</span>
            <span className="career-eyebrow">{selected.type === "track" ? "Career track complete" : "Activity complete"}</span>
            <h3>{selected.title}</h3>
            <p className="career-history-summary">{selected.description}</p>
            {selected.type === "track" ? (
              <>
                <div className="career-history-detail-stat"><strong>{trackProgress?.completed} / {trackProgress?.total}</strong><span>roadmap steps completed</span></div>
                <div className="career-history-stage-list">
                  {roadmapStages[selected.pathId].map((stage, index) => (
                    <div key={stage.id}>
                      <span>Stage {String(index + 1).padStart(2, "0")}</span>
                      <strong>{stage.title}</strong>
                      <small>{stage.tasks.map((task) => task.title).join(" · ")}</small>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="career-history-detail-stat"><strong>{selected.activity.steps.filter((step) => step.done).length} / {selected.activity.steps.length}</strong><span>steps completed · {dateLabel(selected.activity.completedAt)}</span></div>
                {selected.activity.steps.length > 0 && <ul className="career-history-step-list">{selected.activity.steps.map((step, index) => <li key={`${selected.activity.id}-${index}`}><Check size={15} aria-hidden="true" />{step.title}</li>)}</ul>}
                <button type="button" className="career-history-open" onClick={() => onChoose(selected.activity)}>Open activity <ArrowUpRight size={16} aria-hidden="true" /></button>
              </>
            )}
          </div>
        ) : (
          <div className="career-history-empty"><span className="career-eyebrow">Nothing here yet</span><h3>Your work will grow here.</h3><p>Finish every step in a career track or mark an activity complete to add its first leaf.</p><Link href="/career">Continue my plan <ArrowUpRight size={16} aria-hidden="true" /></Link></div>
        )}
        {items.length > 0 && (
          <div className="career-history-collection">
            <div><span className="career-eyebrow">All milestones</span><h3>Completed work</h3></div>
            <div className="career-history-items">
              {items.map((item) => (
                <button key={item.key} type="button" aria-pressed={selected?.key === item.key} onClick={() => selectItem(item.key)}>
                  <span className="career-history-item-mark">{item.type === "track" ? <BookOpenCheck size={19} aria-hidden="true" /> : <Leaf size={19} aria-hidden="true" />}</span>
                  <span><small>{item.type === "track" ? "Completed track" : `${item.activity.kind} · ${dateLabel(item.activity.completedAt)}`}</small><strong>{item.title}</strong></span>
                  <ArrowUpRight size={17} aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
