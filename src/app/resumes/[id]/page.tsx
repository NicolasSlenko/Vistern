import { ResumeDocStudio } from "@/components/resume-studio/resume-doc-studio"

/** One resume: the file, its wording, and the AI's rewrite for each weak bullet. */
export default async function ResumePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ResumeDocStudio id={id} />
}
