import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/**
 * The public blog shell. These run with or without a database: without one the
 * index shows its "unavailable" message, the feed is empty and the sitemap
 * still lists every static page.
 */

const LOCALES = ["fa", "en"] as const;
const NAV_LABEL = { fa: "وبلاگ", en: "Blog" } as const;

for (const locale of LOCALES) {
  test.describe(`/${locale}/blog`, () => {
    test("is reachable from the site navigation", async ({ page }) => {
      await page.goto(`/${locale}`);
      const nav = page.getByRole("navigation", { name: locale === "fa" ? "بخش‌ها" : "Sections" }).first();
      const link = nav.getByRole("link", { name: NAV_LABEL[locale], exact: true });
      await expect(link).toHaveAttribute("href", `/${locale}/blog`);
    });

    test("renders its heading, canonical, hreflang and RSS link", async ({ page }) => {
      await page.goto(`/${locale}/blog`);
      await expect(page.locator("html")).toHaveAttribute("lang", locale);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", new RegExp(`/${locale}/blog$`));
      for (const lang of ["fa", "en", "x-default"]) {
        await expect(page.locator(`link[rel="alternate"][hreflang="${lang}"]`)).toHaveCount(1);
      }
      await expect(page.locator('link[rel="alternate"][type="application/rss+xml"]')).toHaveAttribute(
        "href",
        new RegExp(`/${locale}/feed\\.xml$`),
      );
      // The nav item marks the current page.
      await expect(page.locator('a[aria-current="page"]').first()).toHaveAttribute("href", `/${locale}/blog`);
    });

    test("shows posts or a clear empty state", async ({ page }) => {
      await page.goto(`/${locale}/blog`);
      const list = page.getByRole("list", { name: locale === "fa" ? "مقاله‌ها" : "Articles" });
      const empty = page.locator("main p[role=status]");
      await expect(list.or(empty)).toBeVisible();
    });

    test("has no automatically detectable WCAG 2.2 AA violations", async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(`/${locale}/blog`);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(" | ")}`)).toEqual([]);
    });

    test("serves a well-formed RSS feed", async ({ request }) => {
      const response = await request.get(`/${locale}/feed.xml`);
      expect(response.status()).toBe(200);
      expect(response.headers()["content-type"]).toContain("application/rss+xml");
      const body = await response.text();
      expect(body).toContain(`<language>${locale}</language>`);
      expect(body).toMatch(/<\/rss>$/);
    });
  });
}

test("an unknown post renders the 404 page and is not indexed", async ({ page }) => {
  await page.goto("/en/blog/this-post-does-not-exist");
  await expect(page.getByRole("heading", { name: "This page isn't on the map" })).toBeVisible();
  await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute("content", /noindex/);
});

test("the sitemap lists the blog index in both languages, and robots.txt hides the admin", async ({ request }) => {
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toMatch(/\/fa\/blog<\/loc>/);
  expect(sitemap).toMatch(/\/en\/blog<\/loc>/);
  expect(sitemap).toMatch(/\/fa<\/loc>/);
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Disallow: /admin");
});
