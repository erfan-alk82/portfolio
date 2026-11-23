/** RSS 2.0 for one language of the blog. */

export interface FeedItem {
  title: string;
  description: string;
  url: string;
  /** ISO 8601 */
  publishedAt: string;
}

export interface FeedOptions {
  title: string;
  description: string;
  /** The blog index this feed belongs to. */
  siteLink: string;
  /** Absolute URL of the feed itself (atom:link rel=self). */
  feedUrl: string;
  language: string;
  /** Newest first. */
  items: readonly FeedItem[];
}

const XML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&apos;",
};

/** XML 1.0 forbids control characters other than tab, LF and CR, and the noncharacters U+FFFE/U+FFFF. */
function isInvalidXmlChar(code: number): boolean {
  return (code < 0x20 && code !== 0x09 && code !== 0x0a && code !== 0x0d) || code === 0xfffe || code === 0xffff;
}

export function escapeXml(value: string): string {
  let escaped = "";
  for (const char of value) {
    if (isInvalidXmlChar(char.codePointAt(0) ?? 0)) continue;
    escaped += XML_ESCAPES[char] ?? char;
  }
  return escaped;
}

function rfc822(iso: string): string {
  return new Date(iso).toUTCString();
}

function element(name: string, value: string): string {
  return `<${name}>${escapeXml(value)}</${name}>`;
}

export function buildRssFeed(options: FeedOptions): string {
  const items = options.items.map((item) =>
    [
      "<item>",
      element("title", item.title),
      element("link", item.url),
      `<guid isPermaLink="true">${escapeXml(item.url)}</guid>`,
      element("description", item.description),
      element("pubDate", rfc822(item.publishedAt)),
      "</item>",
    ].join(""),
  );
  const latest = options.items[0];

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    "<channel>",
    element("title", options.title),
    element("link", options.siteLink),
    element("description", options.description),
    element("language", options.language),
    `<atom:link href="${escapeXml(options.feedUrl)}" rel="self" type="application/rss+xml"/>`,
    latest ? element("lastBuildDate", rfc822(latest.publishedAt)) : "",
    ...items,
    "</channel>",
    "</rss>",
  ]
    .filter(Boolean)
    .join("\n");
}
