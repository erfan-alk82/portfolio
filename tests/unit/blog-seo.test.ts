import { describe, expect, test } from "vitest";
import {
  blogPostingJsonLd,
  buildPostMetadata,
  postAlternates,
  postPath,
  serializeJsonLd,
  type PublicPost,
} from "@/lib/blog/seo";

const base = new URL("https://example.com");

const post: PublicPost = {
  slug: "event-driven-notes",
  locale: "en",
  title: "Notes on [[Kafka]] consumers",
  description: "What I learned running consumers in production.",
  bodyMd: "Body",
  publishedAt: "2026-11-01T10:00:00.000Z",
  updatedAt: "2026-11-05T12:30:00.000Z",
  publishedLocales: ["fa", "en"],
};

describe("postPath", () => {
  test("builds the localized path", () => {
    expect(postPath("fa", "hello")).toBe("/fa/blog/hello");
  });
});

describe("postAlternates", () => {
  test("lists both languages and defaults to Persian", () => {
    expect(postAlternates(base, "hello", ["fa", "en"])).toEqual({
      fa: "https://example.com/fa/blog/hello",
      en: "https://example.com/en/blog/hello",
      "x-default": "https://example.com/fa/blog/hello",
    });
  });

  test("an English-only post lists only English and defaults to it", () => {
    expect(postAlternates(base, "hello", ["en"])).toEqual({
      en: "https://example.com/en/blog/hello",
      "x-default": "https://example.com/en/blog/hello",
    });
  });

  test("a Persian-only post never points at a missing English page", () => {
    const languages = postAlternates(base, "hello", ["fa"]);
    expect(languages).not.toHaveProperty("en");
    expect(languages["x-default"]).toBe("https://example.com/fa/blog/hello");
  });
});

describe("buildPostMetadata", () => {
  const metadata = buildPostMetadata(post, { base, siteName: "Erfan Alikhani" });

  test("uses plain text for the title", () => {
    expect(metadata.title).toBe("Notes on Kafka consumers | Erfan Alikhani");
    expect(metadata.description).toBe(post.description);
  });

  test("sets canonical and hreflang from published languages", () => {
    expect(metadata.alternates?.canonical).toBe("/en/blog/event-driven-notes");
    expect(metadata.alternates?.languages).toEqual(postAlternates(base, post.slug, post.publishedLocales));
    expect(metadata.alternates?.types).toEqual({ "application/rss+xml": "/en/feed.xml" });
  });

  test("describes an Open Graph article with its dates", () => {
    expect(metadata.openGraph).toMatchObject({
      type: "article",
      url: "/en/blog/event-driven-notes",
      siteName: "Erfan Alikhani",
      title: "Notes on Kafka consumers | Erfan Alikhani",
      description: post.description,
      locale: "en_US",
      alternateLocale: ["fa_IR"],
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
    });
    expect(metadata.twitter).toMatchObject({ card: "summary_large_image" });
  });

  test("omits alternate locales that are not published", () => {
    const single = buildPostMetadata({ ...post, publishedLocales: ["en"] }, { base, siteName: "x" });
    expect(single.openGraph).toMatchObject({ alternateLocale: [] });
  });
});

describe("blogPostingJsonLd", () => {
  test("describes the post and links the shared author entity", () => {
    const data = blogPostingJsonLd(post, { base });
    expect(data).toMatchObject({
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: "Notes on Kafka consumers",
      description: post.description,
      inLanguage: "en",
      url: "https://example.com/en/blog/event-driven-notes",
      mainEntityOfPage: "https://example.com/en/blog/event-driven-notes",
      datePublished: post.publishedAt,
      dateModified: post.updatedAt,
      author: { "@id": "https://example.com/#person" },
    });
  });

  test("serialisation cannot close the script element", () => {
    const json = serializeJsonLd({ headline: "</script><script>alert(1)</script>" });
    expect(json).not.toContain("<");
    expect(JSON.parse(json)).toEqual({ headline: "</script><script>alert(1)</script>" });
  });
});
