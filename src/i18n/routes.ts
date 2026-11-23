import { caseStudies } from "@/content/profile";

const CASE_STUDY_SLUGS = new Set(caseStudies.map((study) => study.slug));

/**
 * True for /{locale}/case-studies/{slug} with a slug that does not exist.
 * The page streams, so a notFound() there would keep a 200 status; the proxy
 * checks this first and serves the 404 page with a real 404.
 */
export function isUnknownCaseStudy(pathname: string): boolean {
  const [, , section, slug] = pathname.split("/");
  return section === "case-studies" && Boolean(slug) && !CASE_STUDY_SLUGS.has(slug);
}
