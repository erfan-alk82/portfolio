import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { parse } from "yaml";
import { jobs, languages, profile, projects } from "@/content";

/**
 * cv/erfan.yaml (the RenderCV source of the downloadable PDF) and src/content/profile.ts
 * (the website) describe the same career. These tests fail as soon as one is edited
 * without the other.
 */

interface CvEntry {
  company?: string;
  name?: string;
  start_date?: string;
  end_date?: string;
  date?: string;
}

interface Cv {
  cv: {
    email: string;
    phone: string;
    social_networks: { network: string; username: string }[];
    sections: {
      experience: CvEntry[];
      selected_projects: CvEntry[];
      education: CvEntry[];
      languages: { label: string; details: string }[];
    };
  };
}

const cv = (parse(readFileSync(join(process.cwd(), "cv", "erfan.yaml"), "utf8")) as Cv).cv;

/** "Pantry Lab" ↔ "PantryLab", "Dinamotor Software" ↔ "Dinamotor". */
const normalise = (name: string): string => name.toLowerCase().replace(/[^a-z0-9]/g, "");
const sameCompany = (a: string, b: string): boolean =>
  normalise(a).startsWith(normalise(b)) || normalise(b).startsWith(normalise(a));
/** Project titles may carry the company in parentheses: "Factory Production Management (Dinamotor)". */
const mentions = (title: string, label: string): boolean => normalise(title).includes(normalise(label));

const cvEnd = (value: string | undefined): string | null => (value === "present" ? null : (value ?? null));

describe("CV and website stay in sync", () => {
  test("contact details match", () => {
    expect(cv.email).toBe(profile.email);
    expect(cv.phone).toBe(profile.phone.tel);
    const usernames = cv.social_networks.map((s) => s.username);
    expect(usernames).toContain(profile.social.linkedin.handle);
    expect(usernames).toContain(profile.social.github.handle);
    expect(usernames).toContain(profile.social.telegram.handle.replace(/^@/, ""));
  });

  test("every role has the same employer and dates in both", () => {
    expect(cv.sections.experience).toHaveLength(jobs.length);
    for (const job of jobs) {
      const entry = cv.sections.experience.find((e) => sameCompany(e.company ?? "", job.company));
      expect(entry, `${job.company} missing from cv/erfan.yaml`).toBeDefined();
      expect(entry?.start_date, job.company).toBe(job.start);
      expect(cvEnd(entry?.end_date), job.company).toBe(job.end);
    }
  });

  test("dated projects have the same period in both", () => {
    for (const project of projects.filter((p) => p.period)) {
      const label = project.name ?? project.company;
      const entry = cv.sections.selected_projects.find((e) => mentions(e.name ?? "", label));
      expect(entry, `${label} missing from cv/erfan.yaml`).toBeDefined();
      const [start, end] = (entry?.date ?? "").split(" to ");
      expect(start, label).toBe(project.period?.start);
      expect(end === "Present" ? null : end, label).toBe(project.period?.end ?? null);
    }
  });

  test("education dates match", () => {
    const [education] = cv.sections.education;
    expect(education.start_date).toBe(profile.education.start);
    expect(education.end_date).toBe(profile.education.end);
  });

  test("spoken languages match", () => {
    expect(cv.sections.languages.map((l) => l.label)).toEqual(languages.map((l) => l.cvLabel));
  });
});
