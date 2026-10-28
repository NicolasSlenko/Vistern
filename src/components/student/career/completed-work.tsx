"use client"

import Link from "next/link"
import { useRef, useState } from "react"
import { ArrowLeft, ArrowUpRight, BookOpenCheck, Check, ChevronDown, CircleCheck, Leaf } from "lucide-react"
import { GARDEN_LEAF_LIMIT, GrowthGarden, type GardenLeaf } from "@/components/growth/growth-garden"
import { completedTrackIds, roadmapProgress, roadmapStages, type TrackId } from "@/lib/career/roadmap"
import { undergradPaths } from "@/lib/career/undergrad-paths"
import type { CareerActivity, CareerWorkspace } from "@/lib/career/workspace"
import { ActivityDetail } from "./activity-detail"

const GROUP_PAGE = 20
/** Below this many activities the list is short enough not to need a filter. */
const FILTER_AFTER = 12

type CompletedItem =
  | { key: string; type: "track"; title: string; description: string; pathId: TrackId }
  | { key: string; type: "activity"; title: string; description: string; activity: CareerActivity }

function dateLabel(value: string | null) {
  return value
    ? new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "Completed"
}

/** The term a date falls in, the way a student counts time: "Fall 2026". */
function termOf(value: string | null) {
  if (!value) return { key: "undated", label: "Undated" }
  const date = new Date(value)
  const month = date.getMonth()
  const year = date.getFullYear()
  const term = month <= 4 ? 0 : month <= 6 ? 1 : 2
  return { key: `${year}-${term}`, label: `${["Spring", "Summer", "Fall"][term]} ${year}` }
}

type Group = { key: string; label: string; items: CompletedItem[] }

/** Tracks first, then activities a term at a time, newest term first. */
function groupItems(items: CompletedItem[]): Group[] {
  const groups: Group[] = []
  const tracks = items.filter((item) => item.type === "track")
  if (tracks.length) groups.push({ key: "tracks", label: "Career tracks", items: tracks })
  for (const item of items) {
    if (item.type !== "activity") continue
    const term = termOf(item.activity.completedAt)
    const group = groups.find((entry) => entry.key === term.key)
    if (group) group.items.push(item)
    else groups.push({ key: term.key, label: term.label, items: [item] })
  }
  return groups
}

export function CompletedWork({
  workspace,
  onChoose,
}: {
  workspace: CareerWorkspace
  onChoose: (activity: CareerActivity) => void
}) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [kind, setKind] = useState<CareerActivity["kind"] | "all">("all")
  // Which terms are unfolded, and how far each has been shown. The newest term starts open.
  const [openGroups, setOpenGroups] = useState<Set<string> | null>(null)
  const [shown, setShown] = useState<Record<string, number>>({})
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

  const kinds = [...new Set(activities.map((item) => item.type === "activity" ? item.activity.kind : null).filter(Boolean))] as CareerActivity["kind"][]
  const listed = kind === "all" ? items : items.filter((item) => item.type === "activity" && item.activity.kind === kind)
  const groups = groupItems(listed)
  const open = openGroups ?? new Set(groups.slice(0, 1).map((group) => group.key))
  const groupOf = (key: string) => groupItems(items).find((group) => group.items.some((item) => item.key === key))

  function toggleGroup(key: string) {
    const next = new Set(open)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    setOpenGroups(next)
  }

  function selectItem(key: string) {
    setSelectedKey(key)
    // A leaf chosen on the tree opens its term in the list too, and shows far enough down to reach it.
    const group = groupOf(key)
    if (group) {
      setOpenGroups(new Set([...open, group.key]))
      const at = group.items.findIndex((item) => item.key === key)
      setShown((current) => ({ ...current, [group.key]: Math.max(current[group.key] ?? GROUP_PAGE, at + 1) }))
    }
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
                {items.length > GARDEN_LEAF_LIMIT
                  ? `The tree holds your latest ${GARDEN_LEAF_LIMIT} leaves. All ${items.length} milestones are listed below.`
                  : items.length
                    ? "Each leaf is something you finished. Choose one to see its details."
                    : "Your first completed milestone grows the first leaf."}
              </p>
            </GrowthGarden>
          </div>
        </div>
        {selected?.type === "activity" ? (
          <div ref={detailRef} className="career-history-detail career-history-detail-activity" aria-live="polite">
            <ActivityDetail key={selected.key} activity={selected.activity} onEdit={onChoose} />
          </div>
        ) : selected ? (
          <div ref={detailRef} className="career-history-detail" aria-live="polite">
            <span className="career-history-detail-icon">{selected.type === "track" ? <BookOpenCheck size={21} aria-hidden="true" /> : <CircleCheck size={21} aria-hidden="true" />}</span>
            <span className="career-eyebrow">{selected.type === "track" ? "Career track complete" : "Activity complete"}</span>
            <h3>{selected.title}</h3>
            <p className="career-history-summary">{selected.description}</p>
            {selected.type === "track" && (
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
            )}
          </div>
        ) : (
          <div className="career-history-empty"><span className="career-eyebrow">Nothing here yet</span><h3>Your work will grow here.</h3><p>Finish every step in a career track or mark an activity complete to add its first leaf.</p><Link href="/career">Continue my plan <ArrowUpRight size={16} aria-hidden="true" /></Link></div>
        )}
        {items.length > 0 && (
          <div className="career-history-collection">
            <div><span className="career-eyebrow">All milestones</span><h3>Completed work</h3></div>
            {activities.length > FILTER_AFTER && kinds.length > 1 && (
              <div className="career-history-filter" role="group" aria-label="Show completed work of one kind">
                {(["all", ...kinds] as const).map((option) => {
                  const count = option === "all" ? items.length : activities.filter((item) => item.type === "activity" && item.activity.kind === option).length
                  return (
                    <button key={option} type="button" aria-pressed={kind === option} onClick={() => setKind(option)}>
                      {option === "all" ? "All" : option} <span>{count}</span>
                    </button>
                  )
                })}
              </div>
            )}
            <div className="career-history-groups">
              {groups.map((group) => {
                const isOpen = open.has(group.key)
                const limit = shown[group.key] ?? GROUP_PAGE
                const panel = `career-history-group-${group.key}`
                return (
                  <section key={group.key} className="career-history-group">
                    <button type="button" className="career-history-group-head" aria-expanded={isOpen} aria-controls={panel} onClick={() => toggleGroup(group.key)}>
                      <ChevronDown size={16} aria-hidden="true" />
                      <strong>{group.label}</strong>
                      <span>{group.items.length} {group.items.length === 1 ? "milestone" : "milestones"}</span>
                    </button>
                    {isOpen && (
                      <div id={panel}>
                        <div className="career-history-items">
                          {group.items.slice(0, limit).map((item) => (
                            <button key={item.key} type="button" aria-pressed={selected?.key === item.key} onClick={() => selectItem(item.key)}>
                              <span className="career-history-item-mark">{item.type === "track" ? <BookOpenCheck size={19} aria-hidden="true" /> : <Leaf size={19} aria-hidden="true" />}</span>
                              <span><small>{item.type === "track" ? "Completed track" : `${item.activity.kind} · ${dateLabel(item.activity.completedAt)}`}</small><strong>{item.title}</strong></span>
                              <ArrowUpRight size={17} aria-hidden="true" />
                            </button>
                          ))}
                        </div>
                        {group.items.length > limit && (
                          <button type="button" className="career-history-more" onClick={() => setShown((current) => ({ ...current, [group.key]: limit + GROUP_PAGE }))}>
                            Show {Math.min(GROUP_PAGE, group.items.length - limit)} more <span>of {group.items.length - limit} left</span>
                          </button>
                        )}
                      </div>
                    )}
                  </section>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
