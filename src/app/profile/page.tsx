"use client"

import { useState, useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import {
  FileText,
  Calendar,
  Eye,
  User,
  Mail,
  TrendingUp,
  Loader2,
  FileWarning,
  Trash2,
  AlertTriangle,
  Link as LinkIcon,
  BarChart3,
  Edit,
  Star,
  RotateCcw,
  Settings
} from "lucide-react"
import { toast } from "sonner"
import { useTheme } from "next-themes"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

import { ResumeEditor } from "@/components/profile/resume-editor"

import { useResume } from "@/contexts/resume-context"
import type { Resume } from "@/app/api/parse/resumeSchema"

export interface ResumeSubmission {
  id: string
  fileName: string
  s3Key: string
  uploadedAt: string
  score: number
}

interface ProfileSuggestion {
  id: string
  item_type: string
  proposed_data: { title?: string; content?: Record<string, unknown> }
  source_file_name: string | null
}

function summarizeSuggestion(content: Record<string, unknown> | undefined) {
  if (!content) return "";
  const parts = Object.values(content).flatMap((value) => {
    if (typeof value === "string" && value.trim()) return [value.trim()];
    if (typeof value === "number") return [String(value)];
    if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string").slice(0, 3);
    return [];
  });
  return parts.join(" · ").slice(0, 260);
}

function getScoreBadgeVariant(score: number): "default" | "secondary" | "destructive" | "outline" {
  if (score >= 85) return "default"
  if (score >= 70) return "secondary"
  return "destructive"
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatChartDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}

function ResumePreviewDialog({ submission, compact = false }: { submission: ResumeSubmission; compact?: boolean }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadPreview = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/resume-preview?key=${encodeURIComponent(submission.s3Key)}`)
      const result = await response.json()

      if (result.success) {
        setPreviewUrl(result.url)
      } else {
        setError(result.error || "Failed to load preview")
      }
    } catch (err) {
      setError("Failed to load preview")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size={compact ? "icon" : "sm"}
          className={cn(
            "border-[#c8d8ce] text-[#246347] hover:border-[#246347] hover:bg-[#eaf1ec] hover:text-[#1b5038]",
            compact && "size-11 shrink-0 rounded-xl",
          )}
          aria-label={compact ? `Preview ${submission.fileName}` : undefined}
          onClick={loadPreview}
        >
          <Eye className={cn("h-4 w-4", !compact && "mr-1.5")} />
          {!compact && "Preview"}
        </Button>
      </DialogTrigger>
      <DialogContent className="flex h-[min(82vh,900px)] w-[calc(100vw-24px)] max-w-5xl flex-col gap-3 overflow-hidden rounded-2xl border-[#dce6dd] bg-[#f7f8f6] p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex min-w-0 items-center gap-3 pr-8 text-left text-[#27332d]">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eaf1ec] text-[#246347]"><FileText className="h-5 w-5" /></span>
            <span className="break-words text-base sm:text-lg">{submission.fileName}</span>
          </DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-[#dce6dd] bg-white">
          {isLoading && (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}
          {error && (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
              <FileWarning className="h-12 w-12" />
              <p>{error}</p>
              <Button variant="outline" onClick={loadPreview}>
                Try Again
              </Button>
            </div>
          )}
          {previewUrl && !isLoading && !error && (
            <iframe
              src={previewUrl}
              className="h-full w-full border-0"
              title={`Preview of ${submission.fileName}`}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ResumeSubmissionCard({ 
  submission, 
  isActive, 
  onRestore
}: { 
  submission: ResumeSubmission, 
  isActive: boolean,
  onRestore: (id: string) => Promise<void>
}) {
  const isPdf = submission.fileName.toLowerCase().endsWith(".pdf")
  const [isRestoring, setIsRestoring] = useState(false)

  const handleRestoreClick = async () => {
    setIsRestoring(true)
    await onRestore(submission.id)
    setIsRestoring(false)
  }

  return (
    <Card className="hover:shadow-md transition-shadow mb-4">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="p-2 rounded-lg bg-muted">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium truncate" title={submission.fileName}>
                {submission.fileName}
              </h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                <Calendar className="h-3 w-3" />
                <span>{formatDate(submission.uploadedAt)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex flex-col items-center gap-1">
              <div className="text-xs text-muted-foreground">Score</div>
              <Badge variant={getScoreBadgeVariant(submission.score)} className="text-sm font-bold">
                {submission.score}
              </Badge>
            </div>
            <div className="flex gap-2">
              {!isActive && (
                <Button variant="outline" size="sm" onClick={handleRestoreClick} disabled={isRestoring}>
                  {isRestoring ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RotateCcw className="h-4 w-4 mr-1" />}
                  Restore
                </Button>
              )}
              {isPdf && <ResumePreviewDialog submission={submission} />}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ScoreChartTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border rounded-lg shadow-lg p-3">
        <p className="text-sm font-medium">{payload[0].payload.fileName}</p>
        <p className="text-xs text-muted-foreground">{payload[0].payload.fullDate}</p>
        <p className="text-sm font-bold mt-1">
          Score: <span className="text-primary">{payload[0].value}</span>
        </p>
      </div>
    )
  }
  return null
}

function ScoreHistoryChart({ submissions }: { submissions: ResumeSubmission[] }) {
  const { theme } = useTheme()
  const isDark = theme === "dark"

  const chartData = [...submissions]
    .sort((a, b) => new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime())
    .map((s, index) => ({
      date: formatChartDate(s.uploadedAt),
      fullDate: formatDate(s.uploadedAt),
      score: s.score,
      fileName: s.fileName,
      index: index + 1,
    }))

  const chartColor = isDark ? "#ffffff" : "hsl(var(--primary))"
  const gridColor = isDark ? "#333333" : "hsl(var(--muted))"

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Experience Evolution
        </CardTitle>
        <CardDescription>
          Tracking resume score improvements over time
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartColor} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis
                dataKey="date"
                className="text-xs"
                tick={{ fontSize: 12, fill: isDark ? '#ffffff' : 'hsl(var(--muted-foreground))' }}
              />
              <YAxis
                domain={[0, 100]}
                className="text-xs"
                tick={{ fontSize: 12, fill: isDark ? '#ffffff' : 'hsl(var(--muted-foreground))' }}
              />
              <Tooltip content={<ScoreChartTooltip />} />
              <Area
                type="monotone"
                dataKey="score"
                stroke={chartColor}
                strokeWidth={2}
                fill="url(#scoreGradient)"
                dot={{ r: 4, fill: chartColor }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

function ClearSubmissionsDialog({ onConfirm, isClearing, trigger }: { onConfirm: () => void, isClearing: boolean, trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const handleConfirm = () => {
    onConfirm()
    setOpen(false)
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive"><AlertTriangle className="h-5 w-5" /> Clear All?</DialogTitle>
          <DialogDescription>Irreversible action. Deletes all past submissions.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
          <Button variant="destructive" onClick={handleConfirm} disabled={isClearing}>Confirm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function ProfilePage() {
  const { isLoaded } = useUser()
  // Ensure typed as unknown first to avoid incompatibility if interface changed
  const { resumeData, setResumeData, refreshResumeData, showFeedback, toggleFeedback } = useResume()

  const [submissions, setSubmissions] = useState<ResumeSubmission[]>([])
  const [isLoadingSubs, setIsLoadingSubs] = useState(true)
  const [isClearing, setIsClearing] = useState(false)

  // Master Profile state
  const [masterProfile, setMasterProfile] = useState<Resume | null>(null)
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)
  const [profileSuggestions, setProfileSuggestions] = useState<ProfileSuggestion[]>([])
  const [decidingSuggestionId, setDecidingSuggestionId] = useState<string | null>(null)

  // Job board stats
  const [jobBoard, setJobBoard] = useState<Array<{ bucket: string }>>([])
  const appliedCount = jobBoard.filter(j => ["applied", "interviewing", "offer"].includes(j.bucket)).length
  const interviewCount = jobBoard.filter(j => ["interviewing", "offer"].includes(j.bucket)).length
  const offerCount = jobBoard.filter(j => j.bucket === "offer").length

  // Daily usage limits
  const [usageLimits, setUsageLimits] = useState<{
    analyzeMatch: { used: number; limit: number; remaining: number }
    tailorResume: { used: number; limit: number; remaining: number }
    isOwner: boolean
  } | null>(null)

  // Fetch Master Profile
  const fetchMasterProfile = async () => {
    try {
      const response = await fetch("/api/profile")
      const result = await response.json()
      if (result.success) setMasterProfile(result.data)
    } catch (err) {
      console.error("Failed to fetch master profile")
    } finally {
      setIsLoadingProfile(false)
    }
  }

  // Fetch submissions independently from resumeData context
  const fetchSubmissions = async () => {
    try {
      const response = await fetch("/api/resume-submissions")
      const result = await response.json()
      if (result.success) setSubmissions(result.data)
    } catch (err) {
      console.error("Failed to fetch submissions")
    } finally {
      setIsLoadingSubs(false)
    }
  }

  const fetchProfileSuggestions = async () => {
    try {
      const response = await fetch("/api/profile/import-proposals")
      const result = await response.json()
      if (result.success) setProfileSuggestions(result.data)
    } catch (err) {
      console.error("Failed to fetch profile suggestions")
    }
  }

  useEffect(() => {
    if (isLoaded) {
      fetchSubmissions()
      fetchMasterProfile()
      fetchProfileSuggestions()
      fetch("/api/job-board")
        .then(r => r.json())
        .then(r => { if (r.success) setJobBoard(r.data) })
        .catch(() => {})
      fetch("/api/usage")
        .then(r => r.json())
        .then(r => { if (r.success) setUsageLimits(r.data) })
        .catch(() => {})
    }
  }, [isLoaded])

  const decideProfileSuggestion = async (suggestion: ProfileSuggestion, decision: "accepted" | "skipped") => {
    setDecidingSuggestionId(suggestion.id)
    try {
      const response = await fetch("/api/profile/import-proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposalId: suggestion.id, decision }),
      })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error || "Unable to save decision")
      setProfileSuggestions((current) => current.filter((item) => item.id !== suggestion.id))
      if (decision === "accepted") await fetchMasterProfile()
      toast.success(decision === "accepted" ? "Added to your master profile" : "Suggestion skipped")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save decision")
    } finally {
      setDecidingSuggestionId(null)
    }
  }

  const handleRestore = async (id: string) => {
    try {
      const res = await fetch("/api/resume-submissions/restore", {
        method: "POST",
        body: JSON.stringify({ id })
      })
      const result = await res.json()
      if (result.success) {
        setResumeData(result.data)
        setSubmissions(prev => {
          const removed = prev.filter(s => s.id !== result.submission.id)
          return [result.submission, ...removed]
        })
        await refreshResumeData()
        toast.success("Resume restored successfully!")
      } else {
        toast.error(result.error)
      }
    } catch (e) {
      toast.error("An error occurred")
    }
  }

  const handleClearAll = async () => {
    setIsClearing(true)
    try {
      const res = await fetch("/api/resume-submissions", { method: "DELETE" })
      if (res.ok) {
        setSubmissions([])
        setResumeData(null) // Clear resume data from context
        await refreshResumeData() // Re-fetch (will find nothing → null)
        toast.success("Cleared all resume data")
      }
    } finally {
      setIsClearing(false)
    }
  }

  const handleSaveMasterProfile = async (data: Resume) => {
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        body: JSON.stringify(data)
      })
      const result = await res.json()
      if (result.success) {
        setMasterProfile(result.data)
        toast.success("Master Profile saved successfully!")
      } else {
        throw new Error(result.error)
      }
    } catch (e) {
      console.error(e)
      toast.error("Failed to save Master Profile")
      throw e
    }
  }

  return (
    <div className="student-tool-page">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col items-start gap-5 mb-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1>My resume</h1>
            <p className="mt-2 text-muted-foreground">Review your profile, resume versions, and progress.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" size="sm" asChild className="gap-2">
              <Link href="/settings"><Settings className="h-4 w-4" /> Settings</Link>
            </Button>
            <button type="button" role="switch" aria-checked={showFeedback} className="flex items-center gap-2 cursor-pointer select-none" onClick={toggleFeedback}>
            <div
              className={cn(
                "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                showFeedback ? 'bg-primary' : 'bg-input'
              )}
            >
              <span
                className={cn(
                  "pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform",
                  showFeedback ? "translate-x-4" : "translate-x-0"
                )}
              />
            </div>
            <span className="text-sm font-medium text-muted-foreground">AI Feedback</span>
            </button>
          </div>
        </div>

        <Tabs defaultValue="editor" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 sm:w-[400px]">
            <TabsTrigger value="editor" className="gap-2 px-2 sm:px-4"><User className="h-4 w-4 hidden sm:block" /> Editor</TabsTrigger>
            <TabsTrigger value="stats" className="gap-2 px-2 sm:px-4"><BarChart3 className="h-4 w-4 hidden sm:block" /> Progress</TabsTrigger>
            <TabsTrigger value="history" className="gap-2 px-2 sm:px-4"><Calendar className="h-4 w-4 hidden sm:block" /> History</TabsTrigger>
          </TabsList>

          {/* Tab: Resume Editor (The "Big Section") */}
          <TabsContent value="editor" className="space-y-4">
            <div className="grid items-start gap-6 xl:grid-cols-[minmax(260px,300px)_minmax(0,1fr)]">
              {/* All saved versions stay visible; no clipped inner scrolling region. */}
              <Card className="h-fit min-w-0 gap-0 overflow-hidden border-[#dde3dc] bg-white xl:col-span-1">
                <CardHeader className="border-b border-[#e7ece7] px-5 py-4">
                  <CardTitle className="flex items-center justify-between gap-2 text-base text-[#27332d]">
                    <span className="flex items-center gap-2"><FileText className="h-4 w-4 text-[#246347]" /> Past uploads</span>
                    <span className="rounded-full bg-[#eaf1ec] px-2.5 py-1 text-xs font-semibold text-[#246347]">{submissions.length}</span>
                  </CardTitle>
                  <CardDescription>Every saved version, newest first.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 p-3">
                  {submissions.map((sub, index) => (
                    <div key={sub.id} className="flex min-w-0 items-center gap-3 rounded-xl border border-[#e3e9e2] bg-[#fbfcfa] p-3 transition-colors hover:border-[#c8d8ce] hover:bg-white">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="min-w-0 break-words text-sm font-semibold leading-snug text-[#27332d]">{sub.fileName}</span>
                          {index === 0 && <span className="rounded-full bg-[#eaf1ec] px-2 py-0.5 text-[11px] font-semibold text-[#246347]">Current</span>}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-[#5c685f]">
                          <span>{formatDate(sub.uploadedAt)}</span>
                          <span aria-hidden="true">·</span>
                          <span>Score {sub.score}</span>
                        </div>
                      </div>
                      {sub.fileName.toLowerCase().endsWith(".pdf") && <ResumePreviewDialog submission={sub} compact />}
                    </div>
                  ))}
                  {submissions.length === 0 && <div className="px-3 py-8 text-center text-sm text-[#5c685f]">{isLoadingSubs ? "Loading uploads…" : "No uploads yet"}</div>}
                </CardContent>
              </Card>

              {/* Main Editor */}
              <div className="min-w-0">
                <Card className="mb-4">
                  <CardHeader className="py-4 bg-muted/30 border-b">
                    <CardTitle className="text-xl flex items-center gap-2">
                        <User className="h-5 w-5 text-primary" />
                        Comprehensive Master Profile
                    </CardTitle>
                    <CardDescription>
                        Your verified source of truth for experiences, projects, education, and skills. Resume uploads stay separate until you review suggested additions here.
                    </CardDescription>
                  </CardHeader>
                </Card>
                {profileSuggestions.length > 0 && (
                  <Card className="mb-4 border-primary/30">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">Review profile suggestions</CardTitle>
                      <CardDescription>Resume imports never change your master profile automatically. Accept only details you want to keep as verified profile information.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {profileSuggestions.map((suggestion) => (
                        <div key={suggestion.id} className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium">{suggestion.proposed_data.title || suggestion.item_type}</span>
                              <Badge variant="secondary">{suggestion.item_type}</Badge>
                            </div>
                            <p className="mt-1 text-sm text-muted-foreground">{summarizeSuggestion(suggestion.proposed_data.content)}</p>
                            {suggestion.source_file_name && <p className="mt-2 text-xs text-muted-foreground">Suggested from {suggestion.source_file_name}</p>}
                          </div>
                          <div className="flex shrink-0 gap-2">
                            <Button size="sm" onClick={() => decideProfileSuggestion(suggestion, "accepted")} disabled={decidingSuggestionId === suggestion.id}>
                              {decidingSuggestionId === suggestion.id ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}Add
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => decideProfileSuggestion(suggestion, "skipped")} disabled={decidingSuggestionId === suggestion.id}>Skip</Button>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
                {isLoadingProfile ? (
                    <Card className="flex flex-col items-center justify-center p-12 h-[400px]">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        <p className="mt-4 text-muted-foreground">Loading Master Profile...</p>
                    </Card>
                ) : masterProfile ? (
                  <ResumeEditor initialData={masterProfile} onSave={handleSaveMasterProfile} />
                ) : (
                  <Card className="flex flex-col items-center justify-center p-12 text-center h-[400px] border-dashed">
                    <FileText className="h-12 w-12 opacity-20 mb-4" />
                    <h3 className="text-lg font-semibold">No Profile Data</h3>
                    <p className="text-muted-foreground mb-4">Upload a resume to automatically initialize your Master Profile.</p>
                    <Button asChild><Link href="/upload">Upload Resume</Link></Button>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Tab: Statistics */}
          <TabsContent value="stats" className="space-y-6">
            {/* Stats Summary Card */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="text-3xl font-bold">{submissions.length}</div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Total Uploads</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="text-3xl font-bold text-primary">
                    {submissions.length > 0 ? Math.round(submissions.reduce((a, b) => a + b.score, 0) / submissions.length) : 0}
                  </div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Average Score</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="text-3xl font-bold text-green-500">
                    {submissions.length > 0 ? Math.max(...submissions.map(s => s.score)) : 0}
                  </div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Best Score</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="text-3xl font-bold">
                    {submissions.length > 0 ? submissions.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())[0]?.score : 0}
                  </div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Current Score</div>
                </CardContent>
              </Card>
            </div>

            {/* Job Activity */}
            <div>
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Career Activity</p>
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6 text-center">
                    <div className="text-3xl font-bold text-blue-500">{appliedCount}</div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Jobs Applied</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <div className="text-3xl font-bold text-violet-500">{interviewCount}</div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Interviews</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <div className="text-3xl font-bold text-green-500">{offerCount}</div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Offers</div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Daily AI Usage */}
            {usageLimits && !usageLimits.isOwner && (
              <div>
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Daily AI Usage</p>
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Analyze Matches</span>
                        <span className="text-xs text-muted-foreground">{usageLimits.analyzeMatch.used}/{usageLimits.analyzeMatch.limit} used</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2 mb-2">
                        <div
                          className="bg-primary rounded-full h-2 transition-all"
                          style={{ width: `${(usageLimits.analyzeMatch.used / usageLimits.analyzeMatch.limit) * 100}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        <span className={usageLimits.analyzeMatch.remaining === 0 ? "text-destructive font-medium" : "text-green-600 font-medium"}>
                          {usageLimits.analyzeMatch.remaining} remaining
                        </span>
                        {" "}today — resets at midnight
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Tailor Resume</span>
                        <span className="text-xs text-muted-foreground">{usageLimits.tailorResume.used}/{usageLimits.tailorResume.limit} used</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2 mb-2">
                        <div
                          className="bg-primary rounded-full h-2 transition-all"
                          style={{ width: `${(usageLimits.tailorResume.used / usageLimits.tailorResume.limit) * 100}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        <span className={usageLimits.tailorResume.remaining === 0 ? "text-destructive font-medium" : "text-green-600 font-medium"}>
                          {usageLimits.tailorResume.remaining} remaining
                        </span>
                        {" "}today — resets at midnight
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            <ScoreHistoryChart submissions={submissions} />

          </TabsContent>

          {/* Tab: History (Original View) */}
          <TabsContent value="history">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Detailed Submission History</CardTitle>
                {submissions.length > 0 && (
                  <ClearSubmissionsDialog
                    onConfirm={handleClearAll}
                    isClearing={isClearing}
                    trigger={<Button variant="outline" size="sm" className="text-destructive"><Trash2 className="h-4 w-4 mr-2" /> Clear History</Button>}
                  />
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {submissions.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">No resume submissions yet</p>
                    <Button className="mt-4" asChild>
                      <Link href="/upload">Upload Resume</Link>
                    </Button>
                  </div>
                ) : (
                  submissions.map((s, idx) => (
                    <ResumeSubmissionCard 
                      key={s.id} 
                      submission={s} 
                      isActive={idx === 0}
                      onRestore={handleRestore}
                    />
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

      </div>
    </div>
  )
}
