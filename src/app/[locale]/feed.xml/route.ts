import { getCopy } from "@/content";
import { isLocale } from "@/i18n/config";
import { buildRssFeed } from "@/lib/blog/rss";
import { feedPath, postPath } from "@/lib/blog/seo";
import { plainText } from "@/lib/rich";
import { siteUrl } from "@/lib/site";
import { listPublished } from "@/server/blog/queries";

/** RSS 2.0 per language: /fa/feed.xml and /en/feed.xml. Built per request from the cached post list. */
export async function GET(_request: Request, { params }: RouteContext<"/[locale]/feed.xml">): Promise<Response> {
  const { locale } = await params;
  if (!isLocale(locale)) return new Response("Not found", { status: 404 });
  const copy = getCopy(locale);
  const list = await listPublished();
  // A failing database must not look like "no posts" to feed readers.
  if (list.status === "unavailable") {
    return new Response("The feed is temporarily unavailable.", {
      status: 503,
      headers: { "Retry-After": "300", "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  const items = list.items
    .filter((item) => item.locale === locale)
    .map((item) => ({
      title: plainText(item.title),
      description: item.description,
      url: new URL(postPath(locale, item.slug), siteUrl).href,
      publishedAt: item.publishedAt,
      updatedAt: item.updatedAt,
    }));

  const xml = buildRssFeed({
    title: copy.blog.feedTitle,
    description: copy.blog.description,
    siteLink: new URL(`/${locale}/blog`, siteUrl).href,
    feedUrl: new URL(feedPath(locale), siteUrl).href,
    language: locale,
    items,
  });
  // No CDN caching: a new post must appear in the feed as soon as it is published.
  // The post list itself is cached server-side and expired by the admin's actions.
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}
