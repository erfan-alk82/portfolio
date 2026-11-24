import { isValidSlug } from "@/lib/blog/slug";
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

/**
 * True for /{locale}/blog/{x} where x can never be a post: not a valid slug
 * (see lib/blog/slug.ts), too long, percent-encoded, or more segments. The
 * proxy answers these with a real 404 before any database read.
 */
export function isMalformedBlogPath(pathname: string): boolean {
  const [, , section, slug, ...rest] = pathname.split("/");
  if (section !== "blog" || !slug) return false;
  return rest.some(Boolean) || !isValidSlug(slug);
}
