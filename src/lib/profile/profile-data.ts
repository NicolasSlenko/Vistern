import { createHash } from "node:crypto";
import { getResumeObject, type Resume } from "@/app/api/parse/resumeSchema";
import type { Json } from "@/lib/supabase/database.types";

export type ProfileItemType =
  | "experience"
  | "project"
  | "education"
  | "skill"
  | "certification"
  | "achievement"
  | "publication"
  | "extracurricular";

export interface ProfileItemInput {
  item_type: ProfileItemType;
  identity_key: string;
  title: string;
  content: Json;
  verification_status: "verified";
  sort_order: number;
}

type StoredProfileItem = {
  item_type: string;
  title: string;
  content: Json;
  sort_order: number;
};

function identityKey(itemType: ProfileItemType, parts: string[], content: unknown, index: number) {
  const identity = parts.map((part) => part.trim().toLocaleLowerCase());
  if (identity.every((part) => !part)) {
    identity.push(JSON.stringify(content), String(index));
  }
  return createHash("sha256")
    .update(JSON.stringify([itemType, ...identity]))
    .digest("hex");
}

function createItem(
  itemType: ProfileItemType,
  title: string,
  parts: string[],
  content: unknown,
  index: number,
): ProfileItemInput {
  return {
    item_type: itemType,
    identity_key: identityKey(itemType, parts, content, index),
    title: title.trim() || itemType,
    content: content as Json,
    verification_status: "verified",
    sort_order: index,
  };
}

export function profileItemsFromResume(resume: Resume): ProfileItemInput[] {
  const items: ProfileItemInput[] = [];

  resume.experience.forEach((entry, index) => {
    items.push(createItem("experience", entry.position || entry.company, [entry.company, entry.position, entry.start_date], entry, index));
  });
  resume.projects.forEach((entry, index) => {
    items.push(createItem("project", entry.name, [entry.name], entry, index));
  });
  resume.education.forEach((entry, index) => {
    items.push(createItem("education", entry.school, [entry.school, entry.degree, entry.field, entry.start_date], entry, index));
  });

  for (const [category, skills] of Object.entries(resume.skills)) {
    skills.forEach((skill, index) => {
      items.push(createItem("skill", skill, [category, skill], { category }, index));
    });
  }

  resume.certifications.forEach((entry, index) => {
    items.push(createItem("certification", entry.name, [entry.name, entry.issuer, entry.date], entry, index));
  });
  resume.achievements.forEach((entry, index) => {
    items.push(createItem("achievement", entry.title, [entry.title, entry.issuer, entry.date], entry, index));
  });
  resume.publications.forEach((entry, index) => {
    items.push(createItem("publication", entry.title, [entry.title, entry.publisher, entry.date], entry, index));
  });
  resume.extracurriculars.forEach((entry, index) => {
    items.push(createItem("extracurricular", entry.organization, [entry.organization, entry.role, entry.start_date], entry, index));
  });

  return items;
}

export function normalizeProfileData(value: unknown): Resume {
  const defaults = getResumeObject();
  if (!value || typeof value !== "object") return defaults;
  const input = value as Partial<Resume>;

  return {
    ...defaults,
    ...input,
    basics: {
      ...defaults.basics,
      ...(input.basics ?? {}),
      location: {
        ...defaults.basics.location,
        ...(input.basics?.location ?? {}),
      },
    },
    skills: { ...defaults.skills, ...(input.skills ?? {}) },
    education: Array.isArray(input.education) ? input.education : defaults.education,
    experience: Array.isArray(input.experience) ? input.experience : defaults.experience,
    projects: Array.isArray(input.projects) ? input.projects : defaults.projects,
    certifications: Array.isArray(input.certifications) ? input.certifications : defaults.certifications,
    achievements: Array.isArray(input.achievements) ? input.achievements : defaults.achievements,
    publications: Array.isArray(input.publications) ? input.publications : defaults.publications,
    extracurriculars: Array.isArray(input.extracurriculars) ? input.extracurriculars : defaults.extracurriculars,
  };
}

export function resumeFromProfileItems(basics: Json, rows: StoredProfileItem[]): Resume {
  const result = normalizeProfileData({ basics });

  for (const row of rows) {
    const content = row.content as Record<string, unknown>;
    switch (row.item_type) {
      case "experience": result.experience.push(content as unknown as Resume["experience"][number]); break;
      case "project": result.projects.push(content as unknown as Resume["projects"][number]); break;
      case "education": result.education.push(content as unknown as Resume["education"][number]); break;
      case "certification": result.certifications.push(content as unknown as Resume["certifications"][number]); break;
      case "achievement": result.achievements.push(content as unknown as Resume["achievements"][number]); break;
      case "publication": result.publications.push(content as unknown as Resume["publications"][number]); break;
      case "extracurricular": result.extracurriculars.push(content as unknown as Resume["extracurriculars"][number]); break;
      case "skill": {
        const category = content.category;
        if (typeof category === "string" && category in result.skills) {
          result.skills[category as keyof Resume["skills"]].push(row.title);
        }
        break;
      }
    }
  }

  return result;
}
