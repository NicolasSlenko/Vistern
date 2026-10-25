"use client"

import type React from "react"
import { useState } from "react"
import { Eye, PanelLeftClose, PanelLeftOpen, PencilLine } from "lucide-react"
import { ModeTabs, MODE_PANEL_ID, modeTabId, type ModeOption } from "./mode-tabs"

/**
 * The frame both studios sit in: one white sheet in a frosted frame over the
 * sky, with a top bar over two or three columns — the left panel, the form,
 * and (when there's a file to show) the page itself.
 *
 * On a narrow screen the columns stack and an Edit / Preview switch floats
 * at the foot. The breakpoint is a container query on the studio's own
 * width, not the window's: it sits inside the student shell's sidebar, so a
 * viewport breakpoint would promise room the columns don't have.
 *
 * The layout is adapted from resumezip's editor
 * (MIT, © 2025 Ian Hoang — https://github.com/ian-hoang/resumezip).
 */
export function StudioShell<Id extends string>({
  title,
  note,
  actions,
  modes,
  mode,
  onMode,
  left,
  children,
  preview,
  formRef,
}: {
  /** The name of what's being edited, in the top bar. */
  title: React.ReactNode
  /** The quiet line beside it: "Saved", "Unsaved changes". */
  note?: React.ReactNode
  /** Buttons at the right of the top bar. */
  actions?: React.ReactNode
  modes: ModeOption<Id>[]
  mode: Id
  onMode: (mode: Id) => void
  /** What the chosen panel shows, down the left column. */
  left: React.ReactNode
  /** The form, in the middle. */
  children: React.ReactNode
  /** The page itself. Left out, the studio is two columns and the form takes the room. */
  preview?: React.ReactNode
  formRef?: React.Ref<HTMLElement>
}) {
  // Narrow screens show the form or the page, not both.
  const [view, setView] = useState<"edit" | "preview">("edit")
  const showing = preview ? view : "edit"
  // Three columns in the room two want is tight, and the page is the one that
  // suffers. Folding the left panel away gives its width back to the page,
  // which is the thing you are actually reading.
  const [folded, setFolded] = useState(false)

  return (
    <div className="@container/studio zip-scope">
      <div
        className={`desk desk-bright flex min-h-screen flex-col p-2 sm:p-5 @6xl/studio:h-[calc(100vh-var(--chrome-top,82px))] @6xl/studio:min-h-0 @6xl/studio:overflow-clip @6xl/studio:p-6 ${
          preview ? "pb-24 sm:pb-24" : "pb-6"
        }`}
      >
        <div className="paper-frame flex flex-1 flex-col @6xl/studio:min-h-0">
          <div className="paper flex flex-1 flex-col @6xl/studio:min-h-0">
            {/* Raised over the columns and the floating switch, so anything
                that opens from it goes over them. */}
            <header className="relative z-40 border-b border-hairline">
              <div className="flex min-h-[72px] flex-wrap items-center justify-between gap-x-4 gap-y-2 px-3 py-[13px] sm:px-[14px] @6xl/studio:grid @6xl/studio:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
                <div className="flex min-w-0 items-center gap-3">{title}{note}</div>
                {/* In the middle of the bar on wide screens; narrower, atop the left column. */}
                <div className="hidden items-center gap-2 @6xl/studio:flex">
                  {preview && (
                    <button
                      type="button"
                      onClick={() => setFolded(!folded)}
                      aria-pressed={folded}
                      aria-label={folded ? "Show the side panel" : "Hide the side panel, giving the page more room"}
                      title={folded ? "Show the side panel" : "Hide the side panel"}
                      className="white-button inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-2"
                    >
                      {folded ? <PanelLeftOpen className="h-[17px] w-[17px]" /> : <PanelLeftClose className="h-[17px] w-[17px]" />}
                    </button>
                  )}
                  <ModeTabs modes={modes} mode={mode} onChoose={onMode} />
                </div>
                <div className="flex min-w-0 items-center justify-end gap-2.5">{actions}</div>
              </div>
            </header>

            <div className="flex flex-1 flex-col @6xl/studio:min-h-0 @6xl/studio:flex-row">
              {/* The left column. On wide screens it scrolls on its own and
                  fades at its foot as a sign there's more. */}
              <aside
                data-mode={mode}
                className={`shrink-0 border-b border-hairline @6xl/studio:flex @6xl/studio:flex-col @6xl/studio:overflow-clip @6xl/studio:rounded-bl-[28px] @6xl/studio:border-b-0 @6xl/studio:border-r ${
                  folded ? "@6xl/studio:w-0 @6xl/studio:border-r-0" : "@6xl/studio:w-[276px]"
                } ${showing === "preview" ? "hidden @6xl/studio:flex" : ""}`}
              >
                <div className="bg-sheet px-3 pt-3 sm:px-4 @6xl/studio:hidden">
                  <ModeTabs modes={modes} mode={mode} onChoose={onMode} stretch />
                </div>
                <div
                  role="tabpanel"
                  id={MODE_PANEL_ID}
                  aria-labelledby={modeTabId(mode)}
                  className="px-3 pb-3 pt-3 sm:px-4 @6xl/studio:min-h-0 @6xl/studio:flex-1 @6xl/studio:overflow-y-auto @6xl/studio:px-4 @6xl/studio:pb-8 @6xl/studio:pt-6 @6xl/studio:[mask-image:linear-gradient(to_bottom,#000_calc(100%-24px),transparent)]"
                >
                  {/* Switching fades the other one in (`starting:` is CSS @starting-style). */}
                  <div key={mode} className="transition-opacity duration-200 ease-out motion-reduce:transition-none starting:opacity-0">
                    {left}
                  </div>
                </div>
              </aside>

              {/* The form. With a page beside it, the middle column is as wide
                  as is comfortable to write in; without one, it takes the room. */}
              <main
                ref={formRef}
                className={`min-w-0 flex-1 px-4 pb-12 pt-7 sm:px-7 @6xl/studio:overflow-y-auto @6xl/studio:pb-14 ${
                  preview ? "@6xl/studio:w-[clamp(390px,33cqw,520px)] @6xl/studio:flex-none" : ""
                } ${showing === "preview" ? "hidden @6xl/studio:block" : ""}`}
              >
                <div className={`mx-auto ${preview ? "max-w-[560px]" : "max-w-[760px]"}`}>{children}</div>
              </main>

              {preview && (
                <section
                  aria-label="The page itself"
                  className={`min-w-0 flex-col p-3 @6xl/studio:flex @6xl/studio:flex-1 @6xl/studio:overflow-clip @6xl/studio:pl-0 ${
                    showing === "preview" ? "flex @max-6xl/studio:min-h-[70vh] @max-6xl/studio:flex-1" : "hidden"
                  }`}
                >
                  <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[22px] bg-fill @6xl/studio:rounded-[24px]">{preview}</div>
                </section>
              )}
            </div>
          </div>
        </div>

        {preview && (
          <div className="fixed inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-30 flex justify-center @6xl/studio:hidden">
            <div
              role="group"
              aria-label="View"
              className="flex gap-1 rounded-full bg-sheet p-[5px] shadow-[0_0_0_1px_rgb(17_24_20/0.06),0_10px_28px_-8px_rgb(17_24_20/0.3)]"
            >
              {(["edit", "preview"] as const).map((option) => {
                const Icon = option === "edit" ? PencilLine : Eye
                return (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={view === option}
                    onClick={() => setView(option)}
                    className={`inline-flex h-9 items-center gap-2 rounded-full px-4 text-[15px] font-medium transition-colors ${
                      view === option ? "bg-ink text-sheet" : "text-ink-3 hover:text-ink"
                    }`}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {option === "edit" ? "Edit" : "Preview"}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/** The top bar's title and the quiet note beside it, shared by both studios. */
export function StudioTitle({ children }: { children: React.ReactNode }) {
  return <h1 className="min-w-0 truncate text-[17px] font-medium tracking-[-0.02em] text-ink sm:text-[18px]">{children}</h1>
}

export function SaveNote({ state }: { state: "clean" | "dirty" | "saving" | "saved" | "failed" }) {
  const words = { clean: "", dirty: "Unsaved changes", saving: "Saving…", saved: "Saved", failed: "Not saved" }[state]
  return (
    <span role="status" className={`shrink-0 whitespace-nowrap text-[14px] ${state === "failed" ? "text-alert" : "text-ink-3"}`}>
      {words}
    </span>
  )
}
