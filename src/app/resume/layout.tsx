import { ResumeWorkspaceProvider } from "@/components/resume/workspace-provider"
import "@/components/resume/resume.css"

export default function ResumeLayout({ children }: { children: React.ReactNode }) {
  return <ResumeWorkspaceProvider>{children}</ResumeWorkspaceProvider>
}
