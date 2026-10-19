import Link from "next/link"
import { careers, guides } from "@/lib/career/catalog"
import { activityDraft, sourceDraft } from "@/lib/career/templates"
import type { ActivityFields } from "@/lib/career/workspace"

export function ResourceBrowser({
  view,
  resource,
  onChoose,
}: {
  view: string
  resource?: string
  onChoose: (draft: ActivityFields) => void
}) {
  if (view === "practice")
    return (
      <section className="career-reading">
        <h2>Coding practice</h2>
        <p>
          Use a practice resource alongside the topics you’re learning. Keep
          notes about your approach, where you needed help, and what to revisit.
        </p>
        <div className="career-resource-links">
          <a
            href="https://neetcode.io/roadmap"
            target="_blank"
            rel="noopener noreferrer"
          >
            <strong>NeetCode roadmap</strong>
            <span>Topics, problems, and explanations</span>
          </a>
          <a
            href="https://leetcode.com/studyplan/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <strong>LeetCode study plans</strong>
            <span>Practice on LeetCode</span>
          </a>
        </div>
        <button
          className="student-button"
          onClick={() =>
            onChoose({
              ...activityDraft("practice"),
              title: "",
              steps: [
                {
                  title: "Try a problem and explain the approach",
                  done: false,
                },
                {
                  title: "Check edge cases and record what needs review",
                  done: false,
                },
              ],
            })
          }
        >
          Plan a practice session
        </button>
        <Link
          className="student-text-link"
          href="/career?view=guides&resource=coding"
        >
          Read the interview practice guide
        </Link>
      </section>
    )

  if (view === "guides") {
    const guide = guides.find((guide) => guide.id === resource)
    if (guide)
      return (
        <article className="career-reading">
          <Link className="student-text-link" href="/career?view=guides">
            All career guides
          </Link>
          <h2>{guide.title}</h2>
          <p className="career-reading-intro">{guide.intro}</p>
          {guide.sections.map(([title, text]) => (
            <section key={title}>
              <h3>{title}</h3>
              <p>{text}</p>
            </section>
          ))}
          <h3>Resources</h3>
          <div className="career-resource-links">
            {guide.resources.map(([title, description, href]) => (
              <a
                key={href}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
              >
                <strong>{title}</strong>
                <span>{description}</span>
              </a>
            ))}
          </div>
          <button
            className="student-button"
            onClick={() =>
              onChoose(sourceDraft({ type: "guide", id: guide.id }))
            }
          >
            Add to my plan
          </button>
        </article>
      )
    return (
      <section>
        <div className="career-section-heading">
          <h2>Career guides</h2>
        </div>
        <div className="career-resource-list">
          {guides.map((guide) => (
            <Link
              key={guide.id}
              href={`/career?view=guides&resource=${guide.id}`}
            >
              <h3>{guide.title}</h3>
              <p>{guide.intro}</p>
              <span className="student-text-link">Read guide</span>
            </Link>
          ))}
        </div>
      </section>
    )
  }
  const career = careers.find((career) => career.id === resource)
  if (career)
    return (
      <article className="career-reading">
        <Link className="student-text-link" href="/career?view=explore">
          All careers
        </Link>
        <h2>{career.name}</h2>
        <p className="career-reading-intro">{career.daily}</p>
        <section>
          <h3>Useful foundations</h3>
          <ul>
            {career.skills.map((skill) => (
              <li key={skill}>{skill}</li>
            ))}
          </ul>
        </section>
        <section>
          <h3>A way to try the work</h3>
          <p>{career.experiment}</p>
        </section>
        <div className="career-actions">
          <button
            className="student-button"
            onClick={() =>
              onChoose({
                ...sourceDraft({ type: "career", id: career.id }),
                notes: career.experiment,
              })
            }
          >
            Add an exploration activity
          </button>
          <a
            className="student-text-link"
            href={career.roadmap}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open learning roadmap
          </a>
        </div>
        <Link className="student-text-link" href="/community">
          Find people to learn with
        </Link>
      </article>
    )
  return (
    <section>
      <div className="career-section-heading">
        <h2>Explore careers</h2>
      </div>
      <p className="career-section-description">
        Compare the work, then choose something you’d like to try. You can
        explore more than one area.
      </p>
      <div className="career-resource-list">
        {careers.map((career) => (
          <Link
            key={career.id}
            href={`/career?view=explore&resource=${career.id}`}
          >
            <h3>{career.name}</h3>
            <p>{career.description}</p>
            <span className="student-text-link">See the work</span>
          </Link>
        ))}
      </div>
    </section>
  )
}
