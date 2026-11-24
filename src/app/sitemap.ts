import type { MetadataRoute } from "next";
import { caseStudies } from "@/content";
import { buildSitemap } from "@/lib/blog/sitemap";
import { siteUrl } from "@/lib/site";
import { listPublished } from "@/server/blog/queries";

/**
 * Rendered per request (posts are published at runtime).
 * - DATABASE_URL intentionally unset: there is no blog, so the static pages are listed.
 * - Database failing: throw (a 500), so crawlers keep the last good sitemap instead of
 *   receiving one that silently dropped every post.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await listPublished();
  if (posts.status === "unavailable") throw new Error("Sitemap unavailable: the blog database cannot be reached");
  const staticPaths = ["", "/blog", ...caseStudies.map((study) => `/case-studies/${study.slug}`)];
  return buildSitemap(siteUrl, staticPaths, posts.items);
}
