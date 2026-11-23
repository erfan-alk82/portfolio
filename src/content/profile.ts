import type { JobFacts, ProjectFacts, SkillGroupId } from "./types";

/**
 * Language-independent facts.
 * Sources: ../erfan.yaml (the RenderCV CV) for descriptions and education, and the
 * owner's LinkedIn timeline (provided 2026-11-23) for employers, titles and dates,
 * which supersedes the CV's dates.
 */
export const profile = {
  email: "erfanalikhani6@gmail.com",
  /** Published at the owner's request (2026-11-23). */
  phone: { tel: "+989365833763", display: { en: "+98 936 583 3763", fa: "۰۹۳۶ ۵۸۳ ۳۷۶۳" } },
  cvPath: "/cv/Erfan-Alikhani-CV.pdf",
  social: {
    linkedin: { handle: "erfan-alikhani", url: "https://www.linkedin.com/in/erfan-alikhani" },
    github: { handle: "erfan-alk82", url: "https://github.com/erfan-alk82" },
    telegram: { handle: "@erfan_alk82", url: "https://t.me/erfan_alk82" },
  },
  education: { start: "2020-01", end: "2025-01" },
  /** First professional role (United Techies), used for "since 2021". */
  careerStart: "2021-08",
  /** Month the content was last updated; open-ended roles are drawn up to here. */
  asOf: "2026-11",
} as const;

/** Newest first by start date. Part-time roles ran in parallel with full-time ones. */
export const jobs: readonly JobFacts[] = [
  {
    id: "sisootech",
    company: "Sisootech",
    employment: "full-time",
    start: "2025-08",
    end: null,
    stack: ["ASP.NET Core", "Elasticsearch", "Redis", "Kafka", "SQL Server"],
  },
  {
    id: "pantrylab",
    company: "PantryLab",
    employment: "part-time",
    linkedin: "https://www.linkedin.com/company/pantrylab/",
    start: "2024-09",
    end: "2026-10",
    stack: ["React Native", "Expo", "React", "Next.js", "TanStack", "Zustand", "MUI"],
  },
  {
    id: "dinamotor",
    company: "Dinamotor",
    employment: "part-time",
    linkedin: "https://www.linkedin.com/company/dinamotor-software/",
    start: "2023-10",
    end: "2026-11",
    stack: [],
  },
  {
    id: "nadinsoft",
    company: "Nadin Soft",
    employment: "full-time",
    linkedin: "https://www.linkedin.com/company/nadin-soft/",
    start: "2023-06",
    end: "2025-07",
    steps: [
      { start: "2024-10", end: "2025-07" },
      { start: "2023-06", end: "2024-10" },
      { start: "2023-06", end: "2023-09" },
    ],
    stack: ["C#", "ASP.NET Web API", "Clean Architecture", "CQRS", "Ocelot", "TypeScript", "React", "Vue", "MUI"],
  },
  {
    id: "unitedtech",
    company: "United Techies",
    employment: "full-time",
    linkedin: "https://www.linkedin.com/company/unitedtechies/",
    start: "2021-08",
    end: "2023-05",
    stack: ["JavaScript", "TypeScript", "React", "Next.js", "MUI"],
  },
];

export const projects: readonly ProjectFacts[] = [
  {
    id: "geoinsight",
    name: "GeoInsight",
    company: "Sisootech",
    period: { start: "2025-08", end: null },
    stack: ["ASP.NET Core", "Elasticsearch", "Redis", "Kafka", "SQL Server"],
  },
  {
    id: "pantrylab",
    name: "PantryLab",
    company: "PantryLab",
    period: { start: "2024-09", end: "2026-10" },
    stack: ["React Native", "Expo", "Next.js"],
    links: [
      { kind: "website", url: "https://pantrylab.net/" },
      { kind: "appStore", url: "https://apps.apple.com/us/app/pantry-lab/id6740086525" },
      { kind: "googlePlay", url: "https://play.google.com/store/apps/details?id=pantry.lab" },
    ],
  },
  {
    id: "factory",
    company: "Dinamotor",
    period: { start: "2023-10", end: "2026-11" },
    stack: [],
  },
  { id: "samin", name: "Samin", company: "Nadin Soft", stack: [] },
  { id: "csharp-framework", name: "Fundamental Structure for C#", company: "Nadin Soft", stack: ["C#"] },
];

export const skillGroupOrder: readonly SkillGroupId[] = [
  "backend",
  "frontend",
  "mobile",
  "data",
  "devops",
  "architecture",
];
