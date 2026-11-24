/**
 * Localised strings may contain [[term]] markers for Latin-script terms
 * (see lib/rich.ts). Facts that do not change between languages live in
 * profile.ts so they are written once.
 */
export type Rich = string;

export type SectionId = "about" | "experience" | "skills" | "projects" | "education" | "contact";
export type NavSectionId = Exclude<SectionId, "education">;

export type JobId = "sisootech" | "dinamotor" | "pantrylab" | "nadinsoft" | "unitedtech";
export type ProjectId = "geoinsight" | "pantrylab" | "factory" | "samin" | "csharp-framework";
export type Employment = "full-time" | "part-time";
export type ProjectLinkKind = "website" | "appStore" | "googlePlay";
export type CaseStudyId = "geoinsight" | "factory";
export type SpokenLanguage = "fa" | "en";
export type LanguageLevel = "native" | "intermediate";

export interface SpokenLanguageFacts {
  code: SpokenLanguage;
  level: LanguageLevel;
  /** Label used in cv/erfan.yaml, checked by tests/unit/cv-sync.test.ts. */
  cvLabel: string;
}
export type SkillGroupId = "backend" | "frontend" | "mobile" | "data" | "devops" | "architecture";
export type NdviClass = "bare" | "sparse" | "moderate" | "healthy" | "dense";

/** A dated step inside one employer, e.g. junior → mid-level → full-stack. */
export interface StepFacts {
  start: string;
  end: string | null;
}

export interface JobFacts {
  id: JobId;
  company: string;
  employment: Employment;
  /** Company page on LinkedIn, when the owner provided one. */
  linkedin?: string;
  start: string;
  end: string | null;
  /** Newest first; titles live in JobCopy.steps at the same index. */
  steps?: readonly StepFacts[];
  stack: readonly string[];
}

export interface ProjectLink {
  kind: ProjectLinkKind;
  url: string;
}

export interface ProjectFacts {
  id: ProjectId;
  /** Product name in Latin script; when absent, ProjectCopy.name is used. */
  name?: string;
  company: string;
  /** Omitted when the owner has not given project dates. */
  period?: StepFacts;
  stack: readonly string[];
  links?: readonly ProjectLink[];
}

export interface Fact {
  label: string;
  value: Rich;
}

export interface JobCopy {
  role: string;
  location: string;
  highlights: readonly Rich[];
  steps?: readonly Rich[];
}

export interface ProjectCopy {
  /** Only for projects without a Latin product name. */
  name?: Rich;
  kind: Rich;
  description: Rich;
}

export interface SkillGroupCopy {
  label: Rich;
  items: readonly Rich[];
}

export interface CaseStudyFacts {
  id: CaseStudyId;
  /** URL segment under /[locale]/case-studies/. */
  slug: string;
  projectId: ProjectId;
  jobId: JobId;
  /** Off: no page (real 404), no link from Projects, not in the sitemap. */
  enabled: boolean;
}

export interface CaseStudySection {
  heading: string;
  paragraphs?: readonly Rich[];
  bullets?: readonly Rich[];
}

interface CaseStudyCopyBase {
  title: Rich;
  kind: Rich;
  /** Plain text: used for the meta description and social cards. */
  summary: string;
  intro: Rich;
  sections: readonly CaseStudySection[];
  confidentiality: Rich;
}

export interface GeoDiagramCopy {
  title: string;
  caption: Rich;
  source: Rich;
  sourceDetail: Rich;
  services: Rich;
  events: Rich;
  search: Rich;
  cache: Rich;
  storage: Rich;
  users: Rich;
}

export interface FactoryDiagramCopy {
  title: string;
  caption: Rich;
  hub: Rich;
  modules: { machines: string; production: string; scheduling: string; warehouse: string; more: string };
}

export interface CaseStudiesCopy {
  label: string;
  readMore: string;
  backToProjects: string;
  other: string;
  facts: { company: string; period: string; role: string; employment: string; stack: string };
  items: {
    geoinsight: CaseStudyCopyBase & { diagram: GeoDiagramCopy };
    factory: CaseStudyCopyBase & { diagram: FactoryDiagramCopy };
  };
}

/** Public blog UI. Post titles and bodies come from the database, not from here. */
export interface BlogCopy {
  /** Visible heading of the blog index. */
  title: string;
  /** <title> and social title of the blog index. */
  metaTitle: string;
  /** Meta description of the blog index (plain text). */
  description: string;
  intro: Rich;
  /** Label for the list of posts. */
  listLabel: string;
  empty: Rich;
  /** Shown when the database cannot be reached; the rest of the site keeps working. */
  unavailable: Rich;
  readMore: string;
  published: string;
  updated: string;
  backToBlog: string;
  rss: Rich;
  /** Title of the RSS channel. */
  feedTitle: string;
  /** Link to the other language's version of a post. */
  otherLanguage: string;
  loading: string;
}

export interface SiteCopy {
  meta: { title: string; description: string; siteName: string };
  nav: { label: string; skip: string; sections: Record<NavSectionId, string>; blog: string };
  language: { switchTo: string; switchLabel: string };
  /** Fixed name for the Night map toggle; its on/off state is exposed with aria-pressed. */
  theme: { label: string };
  hero: {
    name: string;
    role: Rich;
    lead: Rich;
    location: string;
    coordinates: string;
    primaryAction: string;
    cvAction: string;
    mapTitle: string;
    mapDescription: string;
    mapLegend: { fullTime: string; partTime: string };
  };
  about: {
    title: string;
    paragraphs: readonly Rich[];
    facts: readonly Fact[];
    languages: { label: string; names: Record<SpokenLanguage, string>; levels: Record<LanguageLevel, string> };
  };
  availability: { label: string; value: string };
  experience: {
    title: string;
    intro: string;
    stackLabel: string;
    stepsLabel: string;
    employment: Record<Employment, string>;
    onLinkedIn: string;
    jobs: Record<JobId, JobCopy>;
  };
  skills: { title: string; intro: string; groups: Record<SkillGroupId, SkillGroupCopy> };
  projects: {
    title: string;
    stackLabel: string;
    items: Record<ProjectId, ProjectCopy>;
    links: Record<ProjectLinkKind, string>;
    opensInNewTab: string;
    rasterCaption: string;
    rasterClasses: Record<NdviClass, string>;
    confidential: Rich;
  };
  caseStudies: CaseStudiesCopy;
  blog: BlogCopy;
  education: { title: string; degree: string; institution: string; location: string };
  contact: {
    title: string;
    lead: Rich;
    emailLabel: string;
    phoneLabel: string;
    copy: string;
    copied: string;
    copyFailed: string;
    compose: string;
    elsewhere: string;
    cv: string;
    links: { linkedin: string; github: string; telegram: string };
  };
  footer: { backToTop: string; note: string };
  notFound: { title: string; body: string; action: string };
}
