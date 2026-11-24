import { describe, expect, test } from "vitest";
import { blogJsonLd, blogPostingJsonLd, buildPostMetadata, postAlternates, postPath, type PublicPost } from "@/lib/blog/seo";
import { personNode, serializeJsonLd } from "@/lib/jsonld";

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
  const metadata = buildPostMetadata(post, { base, siteName: "Erfan Alikhani", feedTitle: "Erfan Alikhani: writing" });

  test("uses plain text for the title", () => {
    expect(metadata.title).toBe("Notes on Kafka consumers | Erfan Alikhani");
    expect(metadata.description).toBe(post.description);
  });

  test("sets canonical and hreflang from published languages", () => {
    expect(metadata.alternates?.canonical).toBe("/en/blog/event-driven-notes");
    expect(metadata.alternates?.languages).toEqual(postAlternates(base, post.slug, post.publishedLocales));
    expect(metadata.alternates?.types).toEqual({
      "application/rss+xml": [{ url: "/en/feed.xml", title: "Erfan Alikhani: writing" }],
    });
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
    const single = buildPostMetadata({ ...post, publishedLocales: ["en"] }, { base, siteName: "x", feedTitle: "x" });
    expect(single.openGraph).toMatchObject({ alternateLocale: [] });
  });
});

describe("personNode", () => {
  test("is a minimal Person with the shared @id, so every page can stand alone", () => {
    expect(personNode(base, "fa", "عرفان علیخانی")).toEqual({
      "@type": "Person",
      "@id": "https://example.com/#person",
      name: "عرفان علیخانی",
      url: "https://example.com/fa",
    });
  });
});

describe("blogPostingJsonLd", () => {
  const options = { base, authorName: "Erfan Alikhani", blogName: "Erfan Alikhani: writing" };

  test("describes the post with an inline author, page and blog", () => {
    const data = blogPostingJsonLd(post, options);
    const url = "https://example.com/en/blog/event-driven-notes";
    const person = { "@type": "Person", "@id": "https://example.com/#person", name: "Erfan Alikhani", url: "https://example.com/en" };
    expect(data).toEqual({
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: "Notes on Kafka consumers",
      description: post.description,
      inLanguage: "en",
      url,
      mainEntityOfPage: { "@type": "WebPage", "@id": url },
      datePublished: post.publishedAt,
      dateModified: post.updatedAt,
      author: person,
      publisher: person,
      image: "https://example.com/og/en.png",
      isPartOf: {
        "@type": "Blog",
        "@id": "https://example.com/en/blog#blog",
        name: "Erfan Alikhani: writing",
        url: "https://example.com/en/blog",
        inLanguage: "en",
      },
    });
  });

  test("keeps the headline within 110 characters", () => {
    const data = blogPostingJsonLd({ ...post, title: "x".repeat(150) }, options);
    expect([...String(data.headline)]).toHaveLength(110);
  });

  test("serialisation cannot close the script element", () => {
    const json = serializeJsonLd({ headline: "</script><script>alert(1)</script>" });
    expect(json).not.toContain("<");
    expect(JSON.parse(json)).toEqual({ headline: "</script><script>alert(1)</script>" });
  });
});

describe("blogJsonLd", () => {
  test("defines the Blog node that posts point to", () => {
    expect(
      blogJsonLd({ base, locale: "fa", name: "نوشته‌ها", description: "توضیح", authorName: "عرفان علیخانی" }),
    ).toEqual({
      "@context": "https://schema.org",
      "@type": "Blog",
      "@id": "https://example.com/fa/blog#blog",
      name: "نوشته‌ها",
      description: "توضیح",
      url: "https://example.com/fa/blog",
      inLanguage: "fa",
      author: { "@type": "Person", "@id": "https://example.com/#person", name: "عرفان علیخانی", url: "https://example.com/fa" },
    });
  });
});
