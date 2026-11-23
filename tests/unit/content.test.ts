import { describe, expect, test } from "vitest";
import { getCopy, jobs, profile, projects, skillGroupOrder } from "@/content";
import { locales } from "@/i18n/config";
import { formatPeriod } from "@/lib/dates";

const fa = getCopy("fa");
const en = getCopy("en");

/** Strings that are rendered through <Rich>, so Latin must be isolated. */
function persianRichStrings(): string[] {
  return [
    fa.hero.role,
    fa.hero.lead,
    ...fa.about.paragraphs,
    ...fa.about.facts.map((f) => f.value),
    ...Object.values(fa.experience.jobs).flatMap((j) => [j.role, ...j.highlights, ...(j.steps ?? [])]),
    fa.experience.stepsLabel,
    ...Object.values(fa.projects.links),
    ...Object.values(fa.skills.groups).flatMap((g) => [g.label, ...g.items]),
    ...Object.values(fa.projects.items).flatMap((p) => [p.kind, p.description, p.name ?? ""]),
    fa.projects.confidential,
    fa.contact.lead,
    ...Object.values(fa.caseStudies.items).flatMap((c) => [
      c.title,
      c.kind,
      c.intro,
      c.confidentiality,
      ...c.sections.flatMap((section) => [...(section.paragraphs ?? []), ...(section.bullets ?? [])]),
    ]),
    ...Object.entries(fa.caseStudies.items.geoinsight.diagram)
      .filter(([key]) => key !== "title")
      .map(([, value]) => value),
    fa.caseStudies.items.factory.diagram.caption,
    fa.caseStudies.items.factory.diagram.hub,
    ...Object.values(fa.caseStudies.items.factory.diagram.modules),
    fa.blog.intro,
    fa.blog.rss,
    fa.blog.empty,
    fa.blog.unavailable,
  ];
}

describe("bilingual content", () => {
  test("every job has the same number of highlights in both languages", () => {
    for (const job of jobs) {
      expect(fa.experience.jobs[job.id].highlights.length).toBe(
        en.experience.jobs[job.id].highlights.length,
      );
    }
  });

  test("every skill group lists the same number of items in both languages", () => {
    for (const id of skillGroupOrder) {
      expect(fa.skills.groups[id].items.length).toBe(en.skills.groups[id].items.length);
    }
  });

  test("every dated step has a title in both languages", () => {
    for (const job of jobs) {
      const count = job.steps?.length ?? 0;
      expect(fa.experience.jobs[job.id].steps?.length ?? 0, job.id).toBe(count);
      expect(en.experience.jobs[job.id].steps?.length ?? 0, job.id).toBe(count);
    }
  });

  test("projects without a product name are named in both languages", () => {
    for (const project of projects.filter((p) => !p.name)) {
      expect(fa.projects.items[project.id].name, project.id).toBeTruthy();
      expect(en.projects.items[project.id].name, project.id).toBeTruthy();
    }
  });

  test("every external link is https", () => {
    const urls = [
      ...jobs.flatMap((j) => (j.linkedin ? [j.linkedin] : [])),
      ...projects.flatMap((p) => (p.links ?? []).map((l) => l.url)),
    ];
    expect(urls.length).toBeGreaterThan(0);
    for (const url of urls) expect(new URL(url).protocol, url).toBe("https:");
  });

  test("case studies have the same structure in both languages", () => {
    for (const id of ["geoinsight", "factory"] as const) {
      const faSections = fa.caseStudies.items[id].sections;
      const enSections = en.caseStudies.items[id].sections;
      expect(faSections.length, id).toBe(enSections.length);
      faSections.forEach((section, i) => {
        expect(section.paragraphs?.length ?? 0, `${id} §${i}`).toBe(enSections[i].paragraphs?.length ?? 0);
        expect(section.bullets?.length ?? 0, `${id} §${i}`).toBe(enSections[i].bullets?.length ?? 0);
      });
    }
  });

  test("blog copy is complete in both languages", () => {
    expect(Object.keys(fa.blog).sort()).toEqual(Object.keys(en.blog).sort());
    for (const locale of locales) {
      const { blog, nav } = getCopy(locale);
      expect(nav.blog, locale).toBeTruthy();
      for (const [key, value] of Object.entries(blog)) expect(value, `${locale}.blog.${key}`).toBeTruthy();
    }
  });

  test("the Persian blog nav item is «وبلاگ»", () => {
    expect(fa.nav.blog).toBe("وبلاگ");
    expect(en.nav.blog).toBe("Blog");
  });

  test("about facts line up one to one", () => {
    expect(fa.about.facts.length).toBe(en.about.facts.length);
  });

  test("Persian rich text isolates every Latin-script term", () => {
    for (const text of persianRichStrings()) {
      const outside = text.replace(/\[\[[^\]]+\]\]/g, "");
      expect(outside, text).not.toMatch(/[A-Za-z]/);
    }
  });

  test("markers are balanced in every localised string", () => {
    for (const locale of locales) {
      const all = JSON.stringify(getCopy(locale));
      expect(all.split("[[").length).toBe(all.split("]]").length);
    }
  });

  test("Persian copy uses the zero-width non-joiner for compound words", () => {
    expect(fa.hero.lead).toContain("‌");
    expect(fa.hero.lead).not.toMatch(/می (سازم|کنم)/);
  });
});

describe("CV dates", () => {
  const periods = [
    ...jobs.map((j) => [j.start, j.end] as const),
    ...projects.flatMap((p) => (p.period ? [[p.period.start, p.period.end] as const] : [])),
    ...jobs.flatMap((j) => (j.steps ?? []).map((step) => [step.start, step.end] as const)),
    [profile.education.start, profile.education.end] as const,
  ];

  test.each(locales)("every period formats without ambiguity in %s", (locale) => {
    for (const [start, end] of periods) {
      expect(() => formatPeriod(locale, start, end)).not.toThrow();
    }
  });

  test("jobs are listed newest first", () => {
    const starts = jobs.map((j) => j.start);
    expect([...starts].sort().reverse()).toEqual(starts);
  });
});
