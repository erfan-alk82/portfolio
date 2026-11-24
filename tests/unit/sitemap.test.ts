import { describe, expect, test } from "vitest";
import { buildSitemap, type SitemapPost } from "@/lib/blog/sitemap";

const base = new URL("https://example.com");

const posts: SitemapPost[] = [
  { slug: "both", locale: "fa", publishedAt: "2026-11-01T00:00:00.000Z", updatedAt: "2026-11-03T00:00:00.000Z" },
  { slug: "both", locale: "en", publishedAt: "2026-11-05T00:00:00.000Z", updatedAt: "2026-11-02T00:00:00.000Z" },
  { slug: "fa-only", locale: "fa", publishedAt: "2026-10-01T00:00:00.000Z", updatedAt: "2026-10-01T00:00:00.000Z" },
];

function entry(map: ReturnType<typeof buildSitemap>, url: string) {
  return map.find((e) => e.url === url);
}

describe("buildSitemap", () => {
  const map = buildSitemap(base, ["", "/blog"], posts);

  test("lists every static page in both languages with hreflang", () => {
    expect(entry(map, "https://example.com/fa")?.alternates?.languages).toMatchObject({ fa: "https://example.com/fa" });
    expect(entry(map, "https://example.com/en/blog")).toBeDefined();
  });

  test("a post is modified when its translation last changed or was first published, whichever is later", () => {
    expect(entry(map, "https://example.com/fa/blog/both")?.lastModified).toBe("2026-11-03T00:00:00.000Z");
    expect(entry(map, "https://example.com/en/blog/both")?.lastModified).toBe("2026-11-05T00:00:00.000Z");
  });

  test("hreflang only names the published languages of each post", () => {
    expect(Object.keys(entry(map, "https://example.com/fa/blog/fa-only")?.alternates?.languages ?? {})).toEqual([
      "fa",
      "x-default",
    ]);
  });

  test("each blog index is as fresh as its newest post", () => {
    expect(entry(map, "https://example.com/fa/blog")?.lastModified).toBe("2026-11-03T00:00:00.000Z");
    expect(entry(map, "https://example.com/en/blog")?.lastModified).toBe("2026-11-05T00:00:00.000Z");
  });

  test("without posts the index has no lastModified, and other pages never do", () => {
    const empty = buildSitemap(base, ["", "/blog"], []);
    expect(entry(empty, "https://example.com/fa/blog")?.lastModified).toBeUndefined();
    expect(entry(map, "https://example.com/fa")?.lastModified).toBeUndefined();
  });
});
