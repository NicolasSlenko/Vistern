import { ProfileStudio } from "@/components/resume-studio/profile-studio"

/**
 * The master profile: one record of everything the student has done, edited
 * on its own. The resumes built from it live at /resumes.
 *
 * Wrapped in ResumeProvider by components/app-chrome.tsx, which the studio
 * reads for the cached XYZ review.
 */
export default function ProfilePage() {
  return <ProfileStudio />
}
