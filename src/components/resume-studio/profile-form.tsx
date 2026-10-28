"use client"

import type { Resume } from "@/app/api/parse/resumeSchema"
import { Field, SectionHeading, TagsField } from "./fields"
import { SKILL_GROUPS } from "./sections"

type Basics = Resume["basics"]

/** Who you are and how to reach you: the top of every resume. */
export function ProfileForm({ basics, onChange }: { basics: Basics; onChange: (basics: Basics) => void }) {
  const set = <K extends keyof Basics>(key: K, value: Basics[K]) => onChange({ ...basics, [key]: value })
  const setPlace = (key: keyof Basics["location"], value: string) => onChange({ ...basics, location: { ...basics.location, [key]: value } })

  return (
    <div className="flex flex-col gap-6">
      <SectionHeading title="Profile" note="The header of your resume, and how a recruiter gets hold of you." />

      <div className="grid grid-cols-1 gap-x-5 gap-y-[18px] sm:grid-cols-2">
        <Field className="sm:col-span-2" label="Full name" value={basics.name} placeholder="Alex Rivera" autoComplete="name" onChange={(value) => set("name", value)} />
        <Field label="Email" type="email" value={basics.email} placeholder="alex@ufl.edu" autoComplete="email" onChange={(value) => set("email", value)} />
        <Field label="Phone" type="tel" value={basics.phone} placeholder="(555) 123-4567" autoComplete="tel" onChange={(value) => set("phone", value)} />
        <Field label="City" value={basics.location.city} placeholder="Gainesville" autoComplete="address-level2" onChange={(value) => setPlace("city", value)} />
        <Field label="State" value={basics.location.state} placeholder="FL" autoComplete="address-level1" onChange={(value) => setPlace("state", value)} />
        <Field
          className="sm:col-span-2"
          label="LinkedIn"
          value={basics.linkedin}
          placeholder="linkedin.com/in/alexrivera"
          web
          onChange={(value) => set("linkedin", value)}
        />
        <Field label="GitHub" value={basics.github} placeholder="github.com/alexrivera" web onChange={(value) => set("github", value)} />
        <Field label="Portfolio" value={basics.portfolio} placeholder="alexrivera.dev" web onChange={(value) => set("portfolio", value)} />
      </div>
    </div>
  )
}

/** The skill groups, each a comma-separated line that shows back as chips. */
export function SkillsForm({ skills, onChange }: { skills: Resume["skills"]; onChange: (skills: Resume["skills"]) => void }) {
  const total = SKILL_GROUPS.reduce((count, group) => count + (skills[group.key]?.length ?? 0), 0)

  return (
    <div className="flex flex-col gap-6">
      <SectionHeading
        title="Skills"
        note={total === 0 ? "Nothing listed yet." : `${total} listed. Group them the way a job posting would.`}
      />
      <div className="grid grid-cols-1 gap-x-5 gap-y-[22px]">
        {SKILL_GROUPS.map((group) => (
          <TagsField
            key={group.key}
            label={group.label}
            value={skills[group.key] ?? []}
            placeholder={group.placeholder}
            hint=""
            onChange={(value) => onChange({ ...skills, [group.key]: value })}
          />
        ))}
      </div>
    </div>
  )
}
