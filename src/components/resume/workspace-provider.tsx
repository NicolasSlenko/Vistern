"use client"

import { createContext, useContext, useEffect, useReducer, useState } from "react"
import type { WorkspaceState } from "@/lib/resume/types"
import { emptyWorkspace, sampleWorkspace } from "@/lib/resume/mock-data"
import { workspaceReducer, type WorkspaceAction } from "@/lib/resume/workspace"

// Mock persistence: the workspace lives in this browser until the profile API supports this model.
const STORAGE_KEY = "vistern-resume-workspace-v1"

interface WorkspaceContextValue {
  state: WorkspaceState
  dispatch: (action: WorkspaceAction) => void
  loadSample: () => void
  clearAll: () => void
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)

function readStored(): WorkspaceState | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as WorkspaceState
    return parsed?.profile?.sections ? parsed : null
  } catch {
    return null
  }
}

export function ResumeWorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(workspaceReducer, undefined, sampleWorkspace)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const stored = readStored()
    if (stored) dispatch({ type: "workspace/replace", state: stored })
    setLoaded(true)
  }, [])

  useEffect(() => {
    if (!loaded) return
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // Storage can be unavailable (private windows); the session still works in memory.
    }
  }, [state, loaded])

  const value: WorkspaceContextValue = {
    state,
    dispatch,
    loadSample: () => dispatch({ type: "workspace/replace", state: sampleWorkspace() }),
    clearAll: () => dispatch({ type: "workspace/replace", state: emptyWorkspace() }),
  }

  return (
    <WorkspaceContext.Provider value={value}>
      <div className="resume-workspace" data-loaded={loaded}>{children}</div>
    </WorkspaceContext.Provider>
  )
}

export function useResumeWorkspace() {
  const context = useContext(WorkspaceContext)
  if (!context) throw new Error("useResumeWorkspace must be used inside ResumeWorkspaceProvider")
  return context
}
