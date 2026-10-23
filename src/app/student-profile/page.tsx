import Link from "next/link"
import { ArrowRight, BookOpen, BriefcaseBusiness, FolderKanban, GraduationCap, UsersRound } from "lucide-react"
import { StudentShell } from "@/components/student/student-shell"
import { loadStudent } from "@/lib/load-student"
import { backgroundLabels, yearLabels } from "@/lib/student-profile"

export default async function StudentProfilePage() {
  const { profile, resume } = await loadStudent()
  const school = resume?.education[0]?.school
  const skills = resume ? Object.values(resume.skills).flat().filter(Boolean).slice(0, 12) : []
  const evidence = [
    { label: "Education", count: resume?.education.length || 0, icon: GraduationCap },
    { label: "Projects", count: resume?.projects.length || 0, icon: FolderKanban },
    { label: "Experience", count: resume?.experience.length || 0, icon: BriefcaseBusiness },
    { label: "Campus & other", count: resume?.extracurriculars.length || 0, icon: UsersRound },
  ]

  return (
    <StudentShell>
      <div className="career-page scaffold-page student-profile-page">
        <header className="career-page-heading">
          <div>
            <span className="scaffold-eyebrow">Shared student context</span>
            <h1>Student profile</h1>
            <p>Your background and resume evidence help keep your next steps relevant. Review these details before using them in an application.</p>
          </div>
          <Link className="student-button student-secondary" href="/onboarding?edit=1">Edit background</Link>
        </header>

        <div className="student-profile-intro">
          <div>
            <span className="scaffold-eyebrow">Your context</span>
            <h2>{resume?.basics.name || "Your student story"}</h2>
            <p>{school || "Add your school in your resume"}{profile?.year ? ` · ${yearLabels[profile.year]}` : ""}</p>
          </div>
          <Link href="/profile">Open my resume <ArrowRight size={16} /></Link>
        </div>

        <div className="student-profile-grid">
          <section className="student-profile-panel">
            <div className="student-profile-panel-heading"><BookOpen size={20} /><h2>What you’ve shared</h2></div>
            {profile?.backgroundAreas.length ? (
              <div className="student-profile-tags">{profile.backgroundAreas.map((area) => <span key={area}>{backgroundLabels[area]}</span>)}</div>
            ) : <p className="student-profile-muted">Add classes, projects, research, work, or campus activities to make this space yours.</p>}
            {profile?.backgroundNote && <p className="student-profile-note">{profile.backgroundNote}</p>}
            <Link href="/onboarding?edit=1">Review background <ArrowRight size={15} /></Link>
          </section>
          <section className="student-profile-panel">
            <div className="student-profile-panel-heading"><FolderKanban size={20} /><h2>Resume evidence</h2></div>
            <div className="student-profile-evidence">{evidence.map(({ label, count, icon: Icon }) => <div key={label}><Icon size={17} /><strong>{count}</strong><span>{label}</span></div>)}</div>
            <p className="student-profile-muted">These counts come from your current resume. Check each item in the resume editor before using it in a tailored version.</p>
            <Link href="/profile">Review resume evidence <ArrowRight size={15} /></Link>
          </section>
        </div>
        <section className="student-profile-panel student-profile-skills">
          <div className="student-profile-panel-heading"><BriefcaseBusiness size={20} /><h2>Skills on your resume</h2></div>
          {skills.length ? <div className="student-profile-tags">{skills.map((skill, index) => <span key={`${skill}-${index}`}>{skill}</span>)}</div> : <p className="student-profile-muted">Skills you verify in your resume will appear here.</p>}
          <Link href="/profile">Update skills <ArrowRight size={15} /></Link>
        </section>
      </div>
    </StudentShell>
  )
}
