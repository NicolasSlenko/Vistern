"use client"

import { useState } from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { Edit2, Plus, Save, X } from "lucide-react"
import type { Resume } from "@/app/api/parse/resumeSchema"
import { Field, ProseField, TagsField } from "@/components/resume-studio/fields"
import { pill } from "@/components/resume-studio/pills"

/**
 * What we read off an uploaded resume, shown back before any of it is kept.
 * The sheet reads first and edits second: every value is plain text until the
 * section's Edit is pressed, so a quick glance costs nothing.
 */

interface ResumeVerificationProps {
  parsedData: Resume
  onConfirm: (data: Resume) => void
  onCancel: () => void
  open: boolean
}

const SMALL_PILL = "h-8 px-3.5 text-[13px] font-medium"
const CARD = "rounded-[18px] border border-hairline bg-sheet p-5"

/** A value we don't have. Never the words "N/A": a dash says it more quietly. */
function Blank() {
  return <span className="text-ink-3">—</span>
}

/** One read-only fact: its label in small caps, the value under it. */
function Readout({ label, value, className = "" }: { label: string; value?: string | number | null; className?: string }) {
  const text = value === null || value === undefined ? "" : String(value).trim()
  return (
    <div className={`flex min-w-0 flex-col gap-1 ${className}`}>
      <span className="label-mono text-ink-2">{label}</span>
      <p className="text-[15px] leading-normal wrap-anywhere text-ink">{text === "" ? <Blank /> : text}</p>
    </div>
  )
}

/** A section of the sheet: its name in small caps over a hairline, with room for an action. */
function Section({ title, action, children }: { title: string; action?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex min-h-8 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-hairline pb-2">
        <h3 className="label-mono text-ink-2">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  )
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex h-[23px] items-center rounded-full bg-fill px-2.5 text-[12px] text-ink-2 ring-1 ring-fill-line ring-inset">
      {children}
    </span>
  )
}

function ChipGroup({ label, values }: { label: string; values: string[] }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="label-mono text-ink-2">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {values.map((value, idx) => (
          <Chip key={idx}>{value}</Chip>
        ))}
      </div>
    </div>
  )
}

/** Joins the parts of a date range or an address, dropping whatever is missing. */
const joined = (parts: (string | undefined | null)[], separator: string) =>
  parts.map((part) => (part ?? "").trim()).filter(Boolean).join(separator)

export function ResumeVerification({ parsedData, onConfirm, onCancel, open }: ResumeVerificationProps) {
  const [editedData, setEditedData] = useState<Resume>(parsedData)
  const [isEditing, setIsEditing] = useState(false)

  const handleBasicsChange = (field: string, value: string) => {
    setEditedData({
      ...editedData,
      basics: {
        ...editedData.basics,
        [field]: value,
      },
    })
  }

  const handleLocationChange = (field: string, value: string) => {
    setEditedData({
      ...editedData,
      basics: {
        ...editedData.basics,
        location: {
          ...editedData.basics.location,
          [field]: value,
        },
      },
    })
  }

  const handleEducationChange = (index: number, field: string, value: string | number) => {
    const newEducation = [...editedData.education]
    newEducation[index] = {
      ...newEducation[index],
      [field]: value,
    }
    setEditedData({
      ...editedData,
      education: newEducation,
    })
  }

  const handleExperienceChange = (index: number, field: string, value: string) => {
    const newExperience = [...editedData.experience]
    newExperience[index] = {
      ...newExperience[index],
      [field]: value,
    }
    setEditedData({
      ...editedData,
      experience: newExperience,
    })
  }

  const handleProjectChange = (index: number, field: string, value: string | string[]) => {
    const newProjects = [...editedData.projects]
    newProjects[index] = {
      ...newProjects[index],
      [field]: value,
    }
    setEditedData({
      ...editedData,
      projects: newProjects,
    })
  }

  const addExperience = () => {
    setEditedData({
      ...editedData,
      experience: [
        ...editedData.experience,
        {
          company: "",
          position: "",
          start_date: "",
          end_date: "",
          location: "",
          responsibilities: [],
          achievements: [],
          technologies: [],
        },
      ],
    })
  }

  const removeExperience = (index: number) => {
    setEditedData({
      ...editedData,
      experience: editedData.experience.filter((_, idx) => idx !== index),
    })
  }

  const addProject = () => {
    setEditedData({
      ...editedData,
      projects: [
        ...editedData.projects,
        {
          name: "",
          description: "",
          technologies: [],
          highlights: [],
          link: "",
          github: "",
        },
      ],
    })
  }

  const removeProject = (index: number) => {
    setEditedData({
      ...editedData,
      projects: editedData.projects.filter((_, idx) => idx !== index),
    })
  }

  const handleCertificationChange = (index: number, field: string, value: string) => {
    const newCertifications = [...editedData.certifications]
    newCertifications[index] = {
      ...newCertifications[index],
      [field]: value,
    }
    setEditedData({
      ...editedData,
      certifications: newCertifications,
    })
  }

  const addCertification = () => {
    setEditedData({
      ...editedData,
      certifications: [
        ...editedData.certifications,
        {
          name: "",
          issuer: "",
          date: "",
          credential_id: "",
          url: "",
        },
      ],
    })
  }

  const removeCertification = (index: number) => {
    setEditedData({
      ...editedData,
      certifications: editedData.certifications.filter((_, idx) => idx !== index),
    })
  }

  const handleConfirm = () => {
    onConfirm(editedData)
  }

  const skills = editedData.skills
  const skillGroups: [string, string[] | undefined][] = [
    ["Programming languages", skills?.programming_languages],
    ["Frameworks", skills?.frameworks],
    ["Libraries", skills?.libraries],
    ["Databases", skills?.databases],
    ["DevOps tools", skills?.devops_tools],
    ["Cloud platforms", skills?.cloud_platforms],
    ["Other skills", skills?.other],
  ]

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-ink/25 backdrop-blur-sm data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="zip-scope paper-frame fixed left-1/2 top-1/2 z-50 w-[calc(100vw-1rem)] max-w-[760px] -translate-x-1/2 -translate-y-1/2 data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          <div className="paper flex max-h-[88vh] flex-col overflow-hidden">
            <header className="flex shrink-0 items-start gap-4 border-b border-hairline px-6 py-5 sm:px-8">
              <div className="flex min-w-0 flex-col gap-1.5">
                <span className="label-mono text-ink-2">Check what we read</span>
                <DialogPrimitive.Title asChild>
                  <h2 className="font-serif text-[30px] leading-[1.05] tracking-[-0.03em] text-ink">
                    Does this look <em className="text-brand">right</em>?
                  </h2>
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="max-w-[56ch] text-[15px] leading-relaxed text-ink-2">
                  We pulled this out of your file. Anything we misread here follows you into every resume, so it’s worth a look before you
                  keep it.
                </DialogPrimitive.Description>
              </div>
              <DialogPrimitive.Close className="white-button ml-auto inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
                <X className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">Close</span>
              </DialogPrimitive.Close>
            </header>

            <div className="flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto px-6 py-6 sm:px-8">
              <Section
                title="Basic information"
                action={
                  <button type="button" onClick={() => setIsEditing(!isEditing)} className={pill("white", SMALL_PILL)}>
                    <Edit2 aria-hidden="true" />
                    {isEditing ? "Done editing" : "Edit"}
                  </button>
                }
              >
                <div className={`${CARD} grid grid-cols-1 gap-x-5 gap-y-[18px] sm:grid-cols-2`}>
                  {isEditing ? (
                    <>
                      <Field label="Name" value={editedData.basics.name} onChange={(value) => handleBasicsChange("name", value)} />
                      <Field
                        label="Email"
                        type="email"
                        value={editedData.basics.email}
                        onChange={(value) => handleBasicsChange("email", value)}
                      />
                      <Field
                        label="Phone"
                        type="tel"
                        value={editedData.basics.phone}
                        onChange={(value) => handleBasicsChange("phone", value)}
                      />
                      <div className="grid grid-cols-2 gap-x-4">
                        <Field
                          label="City"
                          value={editedData.basics.location.city}
                          placeholder="City"
                          onChange={(value) => handleLocationChange("city", value)}
                        />
                        <Field
                          label="State"
                          value={editedData.basics.location.state}
                          placeholder="State"
                          onChange={(value) => handleLocationChange("state", value)}
                        />
                      </div>
                      <Field
                        label="LinkedIn"
                        web
                        value={editedData.basics.linkedin}
                        onChange={(value) => handleBasicsChange("linkedin", value)}
                      />
                      <Field label="GitHub" web value={editedData.basics.github} onChange={(value) => handleBasicsChange("github", value)} />
                      <Field
                        label="Portfolio"
                        web
                        value={editedData.basics.portfolio}
                        placeholder="https://yourportfolio.com"
                        onChange={(value) => handleBasicsChange("portfolio", value)}
                      />
                    </>
                  ) : (
                    <>
                      <Readout label="Name" value={editedData.basics.name} />
                      <Readout label="Email" value={editedData.basics.email} />
                      <Readout label="Phone" value={editedData.basics.phone} />
                      <Readout
                        label="Location"
                        value={joined([editedData.basics.location.city, editedData.basics.location.state], ", ")}
                      />
                      <Readout label="LinkedIn" value={editedData.basics.linkedin} />
                      <Readout label="GitHub" value={editedData.basics.github} />
                      <Readout label="Portfolio" value={editedData.basics.portfolio} />
                    </>
                  )}
                </div>
              </Section>

              {editedData.education && editedData.education.length > 0 && (
                <Section title="Education">
                  <div className="flex flex-col gap-4">
                    {editedData.education.map((edu, idx) => {
                      const gpa = typeof edu.gpa === "string" ? parseFloat(edu.gpa) : edu.gpa || 0
                      return (
                        <div key={idx} className={`${CARD} grid grid-cols-1 gap-x-5 gap-y-[18px] sm:grid-cols-2`}>
                          {isEditing ? (
                            <>
                              <Field
                                label="School"
                                value={edu.school}
                                onChange={(value) => handleEducationChange(idx, "school", value)}
                              />
                              <Field
                                label="Degree"
                                value={edu.degree}
                                placeholder="e.g. Bachelor of Science"
                                onChange={(value) => handleEducationChange(idx, "degree", value)}
                              />
                              <Field
                                label="Field of study"
                                value={edu.field}
                                placeholder="e.g. Computer Science"
                                onChange={(value) => handleEducationChange(idx, "field", value)}
                              />
                              <div className="grid grid-cols-2 gap-x-4">
                                <Field
                                  label="Start"
                                  value={edu.start_date}
                                  placeholder="Start"
                                  onChange={(value) => handleEducationChange(idx, "start_date", value)}
                                />
                                <Field
                                  label="End"
                                  value={edu.end_date}
                                  placeholder="End"
                                  onChange={(value) => handleEducationChange(idx, "end_date", value)}
                                />
                              </div>
                              <Field
                                label="GPA"
                                type="number"
                                value={String(edu.gpa || 0)}
                                placeholder="e.g. 3.85"
                                onChange={(value) => handleEducationChange(idx, "gpa", parseFloat(value) || 0)}
                              />
                            </>
                          ) : (
                            <>
                              <Readout label="School" value={edu.school} />
                              <Readout label="Degree" value={edu.degree} />
                              <Readout label="Field of study" value={edu.field} />
                              <Readout label="Dates" value={joined([edu.start_date, edu.end_date], " – ")} />
                              <Readout label="GPA" value={gpa > 0 ? gpa.toFixed(2) : ""} />
                            </>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </Section>
              )}

              {(editedData.experience && editedData.experience.length > 0) || isEditing ? (
                <Section
                  title="Work experience"
                  action={
                    isEditing && (
                      <button type="button" onClick={addExperience} className={pill("white", SMALL_PILL)}>
                        <Plus aria-hidden="true" />
                        Add experience
                      </button>
                    )
                  }
                >
                  <div className="flex flex-col gap-4">
                    {editedData.experience.map((exp, idx) => (
                      <div key={idx} className={`${CARD} flex flex-col gap-4`}>
                        {isEditing && (
                          <div className="flex justify-end">
                            <button type="button" onClick={() => removeExperience(idx)} className={pill("white", SMALL_PILL)}>
                              <X aria-hidden="true" />
                              Remove
                            </button>
                          </div>
                        )}
                        <div className="grid grid-cols-1 gap-x-5 gap-y-[18px] sm:grid-cols-2">
                          {isEditing ? (
                            <>
                              <Field
                                label="Company"
                                value={exp.company}
                                onChange={(value) => handleExperienceChange(idx, "company", value)}
                              />
                              <Field
                                label="Position"
                                value={exp.position}
                                onChange={(value) => handleExperienceChange(idx, "position", value)}
                              />
                              <Field
                                label="Start date"
                                value={exp.start_date}
                                placeholder="e.g. Jan 2023"
                                onChange={(value) => handleExperienceChange(idx, "start_date", value)}
                              />
                              <Field
                                label="End date"
                                value={exp.end_date}
                                placeholder="e.g. Present"
                                onChange={(value) => handleExperienceChange(idx, "end_date", value)}
                              />
                              {exp.location && (
                                <Field
                                  className="sm:col-span-2"
                                  label="Location"
                                  value={exp.location}
                                  placeholder="e.g. San Francisco, CA"
                                  onChange={(value) => handleExperienceChange(idx, "location", value)}
                                />
                              )}
                            </>
                          ) : (
                            <>
                              <Readout label="Company" value={exp.company} />
                              <Readout label="Position" value={exp.position} />
                              <Readout label="Start date" value={exp.start_date} />
                              <Readout label="End date" value={exp.end_date} />
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </Section>
              ) : null}

              {editedData.skills && (
                <Section title="Skills">
                  <div className={`${CARD} flex flex-col gap-4`}>
                    {skillGroups.map(([label, values]) =>
                      values && values.length > 0 ? <ChipGroup key={label} label={label} values={values} /> : null
                    )}
                  </div>
                </Section>
              )}

              {(editedData.projects && editedData.projects.length > 0) || isEditing ? (
                <Section
                  title="Projects"
                  action={
                    isEditing && (
                      <button type="button" onClick={addProject} className={pill("white", SMALL_PILL)}>
                        <Plus aria-hidden="true" />
                        Add project
                      </button>
                    )
                  }
                >
                  <div className="flex flex-col gap-4">
                    {editedData.projects.map((project, idx) => (
                      <div key={idx} className={`${CARD} flex flex-col gap-4`}>
                        {isEditing ? (
                          <>
                            <div className="flex justify-end">
                              <button type="button" onClick={() => removeProject(idx)} className={pill("white", SMALL_PILL)}>
                                <X aria-hidden="true" />
                                Remove
                              </button>
                            </div>
                            <Field label="Project name" value={project.name} onChange={(value) => handleProjectChange(idx, "name", value)} />
                            <ProseField
                              label="Description"
                              rows={2}
                              value={project.description}
                              placeholder="Brief description of the project"
                              onChange={(value) => handleProjectChange(idx, "description", value)}
                            />
                            <TagsField
                              label="Tech stack"
                              value={project.technologies}
                              placeholder="React, Node.js, MongoDB"
                              onChange={(value) => handleProjectChange(idx, "technologies", value)}
                            />
                            <Field
                              label="GitHub link"
                              web
                              value={project.github}
                              placeholder="github.com/username/project"
                              onChange={(value) => handleProjectChange(idx, "github", value)}
                            />
                            <Field
                              label="Project link"
                              web
                              value={project.link}
                              placeholder="project-website.com"
                              onChange={(value) => handleProjectChange(idx, "link", value)}
                            />
                          </>
                        ) : (
                          <>
                            <Readout label="Project name" value={project.name} />
                            {project.technologies && project.technologies.length > 0 ? (
                              <ChipGroup label="Tech stack" values={project.technologies} />
                            ) : (
                              <Readout label="Tech stack" value="" />
                            )}
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </Section>
              ) : null}

              {editedData.achievements && editedData.achievements.length > 0 && (
                <Section title="Achievements">
                  <div className="flex flex-col gap-4">
                    {editedData.achievements.map((achievement, idx) => (
                      <div key={idx} className={`${CARD} flex flex-col gap-1.5`}>
                        <p className="text-[15px] font-medium tracking-[-0.01em] text-ink">{achievement.title}</p>
                        {(achievement.issuer || achievement.date) && (
                          <p className="text-[13px] text-ink-3">{joined([achievement.issuer, achievement.date], " · ")}</p>
                        )}
                        {achievement.description && (
                          <p className="pt-1 text-[15px] leading-relaxed text-ink-2">{achievement.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {editedData.certifications && editedData.certifications.length > 0 && (
                <Section
                  title="Certifications"
                  action={
                    isEditing && (
                      <button type="button" onClick={addCertification} className={pill("white", SMALL_PILL)}>
                        <Plus aria-hidden="true" />
                        Add
                      </button>
                    )
                  }
                >
                  <div className="flex flex-col gap-4">
                    {editedData.certifications.map((cert, idx) => (
                      <div key={idx} className={`${CARD} flex flex-col gap-4`}>
                        {isEditing && (
                          <div className="flex justify-end">
                            <button type="button" onClick={() => removeCertification(idx)} className={pill("white", SMALL_PILL)}>
                              <X aria-hidden="true" />
                              Remove
                            </button>
                          </div>
                        )}
                        <div className="grid grid-cols-1 gap-x-5 gap-y-[18px] sm:grid-cols-2">
                          {isEditing ? (
                            <>
                              <Field
                                label="Certification name"
                                value={cert.name}
                                placeholder="AWS Certified Developer"
                                onChange={(value) => handleCertificationChange(idx, "name", value)}
                              />
                              <Field
                                label="Issuer"
                                value={cert.issuer}
                                placeholder="Amazon Web Services"
                                onChange={(value) => handleCertificationChange(idx, "issuer", value)}
                              />
                              <Field
                                label="Date"
                                value={cert.date}
                                placeholder="January 2024"
                                onChange={(value) => handleCertificationChange(idx, "date", value)}
                              />
                              <Field
                                label="Credential ID"
                                value={cert.credential_id}
                                placeholder="ABC123XYZ"
                                onChange={(value) => handleCertificationChange(idx, "credential_id", value)}
                              />
                              <Field
                                className="sm:col-span-2"
                                label="Certificate URL"
                                web
                                value={cert.url}
                                placeholder="https://..."
                                onChange={(value) => handleCertificationChange(idx, "url", value)}
                              />
                            </>
                          ) : (
                            <>
                              <Readout label="Certification name" value={cert.name} />
                              <Readout label="Issuer" value={cert.issuer} />
                              <Readout label="Date" value={cert.date} />
                              <Readout label="Credential ID" value={cert.credential_id} />
                              <div className="flex min-w-0 flex-col gap-1 sm:col-span-2">
                                <span className="label-mono text-ink-2">Certificate</span>
                                {cert.url ? (
                                  <a
                                    href={cert.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[15px] font-medium text-brand underline-offset-4 hover:underline"
                                  >
                                    View certificate
                                  </a>
                                ) : (
                                  <p className="text-[15px]">
                                    <Blank />
                                  </p>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {isEditing && (!editedData.certifications || editedData.certifications.length === 0) && (
                <Section
                  title="Certifications"
                  action={
                    <button type="button" onClick={addCertification} className={pill("white", SMALL_PILL)}>
                      <Plus aria-hidden="true" />
                      Add certification
                    </button>
                  }
                />
              )}

              {editedData.publications && editedData.publications.length > 0 && (
                <Section title="Publications">
                  <div className="flex flex-col gap-4">
                    {editedData.publications.map((pub, idx) => (
                      <div key={idx} className={`${CARD} flex flex-col gap-1.5`}>
                        <p className="text-[15px] font-medium tracking-[-0.01em] text-ink">{pub.title}</p>
                        {(pub.publisher || pub.date) && <p className="text-[13px] text-ink-3">{joined([pub.publisher, pub.date], " · ")}</p>}
                        {pub.summary && <p className="pt-1 text-[15px] leading-relaxed text-ink-2">{pub.summary}</p>}
                        {pub.url && (
                          <a
                            href={pub.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="pt-1 text-[14px] font-medium text-brand underline-offset-4 hover:underline"
                          >
                            View publication
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {editedData.extracurriculars && editedData.extracurriculars.length > 0 && (
                <Section title="Extracurricular activities">
                  <div className="flex flex-col gap-4">
                    {editedData.extracurriculars.map((activity, idx) => (
                      <div key={idx} className={`${CARD} flex flex-col gap-1.5`}>
                        <p className="text-[15px] font-medium tracking-[-0.01em] text-ink">{activity.organization}</p>
                        <p className="text-[15px] text-ink-2">{activity.role}</p>
                        <p className="text-[13px] text-ink-3">{joined([activity.start_date, activity.end_date], " – ")}</p>
                        {activity.achievements && activity.achievements.length > 0 && (
                          <ul className="flex list-disc flex-col gap-1 pt-1 pl-5 text-[15px] leading-relaxed text-ink-2">
                            {activity.achievements.map((achievement, achIdx) => (
                              <li key={achIdx}>{achievement}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </Section>
              )}
            </div>

            <footer className="flex shrink-0 flex-wrap items-center justify-end gap-2.5 border-t border-hairline px-6 py-4 sm:px-8">
              <button type="button" onClick={onCancel} className={pill("white")}>
                <X aria-hidden="true" />
                Cancel
              </button>
              <button type="button" onClick={handleConfirm} className={pill("brand")}>
                <Save aria-hidden="true" />
                Confirm and continue
              </button>
            </footer>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
