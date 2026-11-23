import { describe, expect, test } from "vitest";
import { buildRssFeed, escapeXml } from "@/lib/blog/rss";

describe("escapeXml", () => {
  test("escapes the five XML special characters", () => {
    expect(escapeXml(`<a href="x">Tom & 'Jerry'</a>`)).toBe(
      "&lt;a href=&quot;x&quot;&gt;Tom &amp; &apos;Jerry&apos;&lt;/a&gt;",
    );
  });

  test("drops characters XML 1.0 cannot carry", () => {
    expect(escapeXml("a\u0000b\u0008c\u000Bd")).toBe("abcd");
  });

  test("keeps Persian text and newlines", () => {
    expect(escapeXml("سلام\nدنیا")).toBe("سلام\nدنیا");
  });
});

describe("buildRssFeed", () => {
  const feed = buildRssFeed({
    title: "Blog & notes",
    description: "Writing",
    siteLink: "https://example.com/en/blog",
    feedUrl: "https://example.com/en/feed.xml",
    language: "en",
    items: [
      {
        title: "<script>alert(1)</script>",
        description: "First & only",
        url: "https://example.com/en/blog/first",
        publishedAt: "2026-11-01T10:00:00.000Z",
      },
    ],
  });

  test("is an RSS 2.0 document with a self link", () => {
    expect(feed.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(feed).toContain('<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">');
    expect(feed).toContain('<atom:link href="https://example.com/en/feed.xml" rel="self" type="application/rss+xml"/>');
    expect(feed).toContain("<language>en</language>");
  });

  test("escapes every text field", () => {
    expect(feed).toContain("<title>Blog &amp; notes</title>");
    expect(feed).toContain("<title>&lt;script&gt;alert(1)&lt;/script&gt;</title>");
    expect(feed).not.toContain("<script>");
  });

  test("uses RFC 822 dates and permalink guids", () => {
    expect(feed).toContain("<pubDate>Sun, 01 Nov 2026 10:00:00 GMT</pubDate>");
    expect(feed).toContain("<lastBuildDate>Sun, 01 Nov 2026 10:00:00 GMT</lastBuildDate>");
    expect(feed).toContain('<guid isPermaLink="true">https://example.com/en/blog/first</guid>');
  });

  test("an empty feed is still valid", () => {
    const empty = buildRssFeed({
      title: "t",
      description: "d",
      siteLink: "https://example.com/fa/blog",
      feedUrl: "https://example.com/fa/feed.xml",
      language: "fa",
      items: [],
    });
    expect(empty).toContain("<channel>");
    expect(empty).not.toContain("<item>");
    expect(empty).not.toContain("lastBuildDate");
  });
});
