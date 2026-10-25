import type { Resume } from "@/app/api/parse/resumeSchema"
import { rewriteKey, type BulletField, type BulletSection } from "@/lib/resume-suggestions"

/**
 * The resume as a page: the student's own words, typeset the way a recruiter
 * will see them.
 *
 * This is deliberately HTML rather than the uploaded PDF. The AI's marks have
 * to sit on the exact line they are about, and a line in the DOM can be
 * measured exactly, at any zoom, in any font, as it reflows. Reading
 * coordinates back out of a rendered PDF only ever approximates that.
 *
 * Every bullet carries `data-mark` with the same key the rewrites are filed
 * under, which is the whole hinge: resume-marks.tsx finds these nodes, takes
 * their rectangles, and draws over them without either side knowing about the
 * other's layout.
 */

/** Letter paper, in the units the marks are measured in. 1 unit ≈ 1pt at 100%. */
export const PAGE = { width: 612, height: 792 }

const nonEmpty = (values: (string | undefined | null)[]) => values.map((value) => value?.trim()).filter(Boolean) as string[]

/** A date range as a resume prints it. An empty end date reads as ongoing. */
function dateRange(start?: string, end?: string): string {
  const from = start?.trim()
  const to = end?.trim()
  if (from && to) return `${from} – ${to}`
  if (from) return `${from} – Present`
  return to || ""
}

/** A section's rule and heading, in the small-caps a resume uses. */
function Heading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-[3px] mt-[11px] border-b border-black pb-[1px] text-[11.5px] font-bold uppercase tracking-[0.06em] text-black first:mt-0">
      {children}
    </h2>
  )
}

/** The two-column line every entry opens with: what and where, when and whence. */
function EntryHead({ left, right, below, belowRight }: { left: string; right?: string; below?: string; belowRight?: string }) {
  return (
    <>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[11px] font-bold text-black">{left}</span>
        {right && <span className="shrink-0 text-[11px] font-bold text-black">{right}</span>}
      </div>
      {(below || belowRight) && (
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-[10.5px] italic text-black">{below}</span>
          {belowRight && <span className="shrink-0 text-[10.5px] italic text-black">{belowRight}</span>}
        </div>
      )}
    </>
  )
}

/**
 * The bullets of one field. Each `li` is tagged with its rewrite key so the
 * mark layer can find it; `data-mark-text` is the span the line is drawn
 * under, which excludes the bullet glyph and its indent.
 */
function Bullets({
  items,
  section,
  entryIndex,
  field,
}: {
  items: string[]
  section: BulletSection
  entryIndex: number
  field: BulletField
}) {
  if (!items.length) return null
  return (
    <ul className="ml-[13px] mt-[2px] list-none">
      {items.map((text, bulletIndex) => (
        <li
          key={bulletIndex}
          data-mark={rewriteKey({ section, entryIndex, field, bulletIndex })}
          className="relative mb-[1.5px] pl-[9px] text-[10.5px] leading-[1.32] text-black"
        >
          <span aria-hidden="true" className="absolute left-0 top-0">
            •
          </span>
          <span data-mark-text>{text}</span>
        </li>
      ))}
    </ul>
  )
}

export function ResumePaper({ resume }: { resume: Resume }) {
  const { basics } = resume
  const city = nonEmpty([basics.location?.city, basics.location?.state]).join(", ")
  // The contact line: whatever the student actually gave, separated by pipes.
  const contact = nonEmpty([basics.phone, basics.email, basics.linkedin, basics.github, basics.portfolio, city])

  const skills: [string, string[]][] = [
    ["Languages", resume.skills.programming_languages],
    ["Frameworks", [...resume.skills.frameworks, ...resume.skills.libraries]],
    ["Databases", resume.skills.databases],
    ["Tools", [...resume.skills.devops_tools, ...resume.skills.cloud_platforms]],
    ["Other", resume.skills.other],
  ]
  const shownSkills = skills.filter(([, values]) => values.length > 0)

  return (
    // The paper's own font stack, not the app's: this is a document, and it
    // should look like the one that gets sent.
    <article
      data-resume-paper
      className="relative bg-white font-[Georgia,'Times_New_Roman',serif] text-black"
      style={{ width: PAGE.width, minHeight: PAGE.height, padding: "40px 46px" }}
    >
      <header className="mb-[6px] text-center">
        <h1 className="text-[23px] font-normal uppercase tracking-[0.07em] text-black">{basics.name || "Your name"}</h1>
        {contact.length > 0 && (
          <p className="mt-[3px] text-[9.5px] leading-[1.4] text-black">
            {contact.map((item, index) => (
              <span key={index}>
                {index > 0 && <span className="px-[4px] text-black/50">|</span>}
                <span className="underline decoration-black/40 underline-offset-[2px]">{item}</span>
              </span>
            ))}
          </p>
        )}
      </header>

      {resume.education.length > 0 && (
        <section>
          <Heading>Education</Heading>
          {resume.education.map((entry, index) => (
            <div key={index} className="mb-[4px]">
              <EntryHead
                left={entry.school}
                right={dateRange(entry.start_date, entry.end_date)}
                below={nonEmpty([entry.degree, entry.field !== entry.degree ? entry.field : "", entry.gpa ? `GPA: ${entry.gpa}` : ""]).join(
                  ", ",
                )}
              />
              {entry.achievements?.length > 0 && (
                <ul className="ml-[13px] mt-[2px] list-none">
                  {entry.achievements.map((item, at) => (
                    <li key={at} className="relative mb-[1.5px] pl-[9px] text-[10.5px] leading-[1.32]">
                      <span aria-hidden="true" className="absolute left-0 top-0">
                        •
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </section>
      )}

      {resume.experience.length > 0 && (
        <section>
          <Heading>Experience</Heading>
          {resume.experience.map((entry, entryIndex) => (
            <div key={entryIndex} className="mb-[5px]">
              <EntryHead
                left={entry.position}
                right={dateRange(entry.start_date, entry.end_date)}
                below={entry.company}
                belowRight={entry.location}
              />
              <Bullets items={entry.responsibilities ?? []} section="experience" entryIndex={entryIndex} field="responsibilities" />
              <Bullets items={entry.achievements ?? []} section="experience" entryIndex={entryIndex} field="achievements" />
            </div>
          ))}
        </section>
      )}

      {resume.projects.length > 0 && (
        <section>
          <Heading>Projects</Heading>
          {resume.projects.map((entry, entryIndex) => (
            <div key={entryIndex} className="mb-[5px]">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[11px] text-black">
                  <strong className="font-bold">{entry.name}</strong>
                  {entry.technologies?.length > 0 && (
                    <span className="italic"> | {entry.technologies.join(", ")}</span>
                  )}
                </span>
                {entry.link && <span className="shrink-0 text-[10px] underline decoration-black/40">{entry.link}</span>}
              </div>
              {entry.description && <p className="text-[10.5px] leading-[1.32]">{entry.description}</p>}
              <Bullets items={entry.highlights ?? []} section="projects" entryIndex={entryIndex} field="highlights" />
            </div>
          ))}
        </section>
      )}

      {shownSkills.length > 0 && (
        <section>
          <Heading>Technical skills</Heading>
          <dl className="text-[10.5px] leading-[1.42]">
            {shownSkills.map(([label, values]) => (
              <div key={label} className="flex gap-[4px]">
                <dt className="shrink-0 font-bold">{label}:</dt>
                <dd>{values.join(", ")}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {resume.extracurriculars.length > 0 && (
        <section>
          <Heading>Leadership</Heading>
          {resume.extracurriculars.map((entry, index) => (
            <div key={index} className="mb-[4px]">
              <EntryHead
                left={entry.organization}
                right={dateRange(entry.start_date, entry.end_date)}
                below={entry.role}
              />
            </div>
          ))}
        </section>
      )}
    </article>
  )
}
