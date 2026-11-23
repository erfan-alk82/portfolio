import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { allCaseStudies } from "../../src/content/profile";

const LOCALES = ["fa", "en"] as const;
const TITLES = {
  geoinsight: { fa: "GeoInsight", en: "GeoInsight" },
  factory: { fa: "سامانه‌ی مدیریت تولید کارخانه", en: "Factory production management" },
} as const;
// Case studies can be switched off in src/content/profile.ts; only enabled ones are served.
const STUDIES = allCaseStudies.filter((s) => s.enabled).map((s) => ({ slug: s.slug, ...TITLES[s.id] }));
const DISABLED = allCaseStudies.filter((s) => !s.enabled);

test.describe("hero map interaction", () => {
  test("every map label is a link to its role, announced with the role @desktop-only", async ({ page }) => {
    await page.goto("/en");
    const labels = page.locator(".map-label");
    await expect(labels).toHaveCount(5);
    await expect(page.locator('.map-label[data-job="dinamotor"]')).toHaveAccessibleName(/Dinamotor.*Front-end team lead/);
  });

  test("focusing a label lights up its route and dims the others @desktop-only", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/fa");
    const highlight = page.locator('[data-highlight="pantrylab"]');
    await expect(highlight).toHaveCSS("opacity", "0");
    await page.locator('.map-label[data-job="pantrylab"]').focus();
    await expect(highlight).not.toHaveCSS("opacity", "0");
    await expect(page.locator('.map-label[data-job="sisootech"]')).toHaveCSS("opacity", "0.45");
  });

  test("activating a label jumps to that role in Experience", async ({ page }) => {
    await page.goto("/en");
    await page.locator('.map-label[data-job="nadinsoft"]').click();
    await expect(page).toHaveURL(/#job-nadinsoft$/);
    await expect(page.locator("#job-nadinsoft")).toBeInViewport();
  });
});

for (const locale of LOCALES) {
  for (const study of STUDIES) {
    test.describe(`/${locale}/case-studies/${study.slug}`, () => {
      const path = `/${locale}/case-studies/${study.slug}`;

      test("renders in the right language and direction with its diagram", async ({ page }) => {
        const response = await page.goto(path);
        expect(response?.status()).toBe(200);
        await expect(page.locator("html")).toHaveAttribute("lang", locale);
        await expect(page.locator("html")).toHaveAttribute("dir", locale === "fa" ? "rtl" : "ltr");
        await expect(page.getByRole("heading", { level: 1 })).toHaveText(study[locale]);
        await expect(page.getByTestId("case-study-diagram")).toBeVisible();
      });

      test("publishes canonical, hreflang and CreativeWork data", async ({ page }) => {
        await page.goto(path);
        await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", new RegExp(`${path}$`));
        await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveAttribute(
          "href",
          new RegExp(`/fa/case-studies/${study.slug}$`),
        );
        const jsonLd = await page.locator('script[type="application/ld+json"]').textContent();
        expect(JSON.parse(jsonLd ?? "{}")).toMatchObject({ "@type": "CreativeWork", inLanguage: locale });
      });

      test("header links lead home and the language switch keeps the page", async ({ page }) => {
        await page.goto(path);
        const other = locale === "fa" ? "en" : "fa";
        await expect(page.getByTestId("language-switch")).toHaveAttribute("href", `/${other}/case-studies/${study.slug}`);
        const navHrefs = await page.locator("header nav a").evaluateAll((links) => links.map((a) => a.getAttribute("href")));
        for (const href of navHrefs) expect(href).toMatch(new RegExp(`^/${locale}#`));
      });

      test("has no WCAG 2.2 AA violations", async ({ page }) => {
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.goto(path);
        const results = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
          .analyze();
        expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(" | ")}`)).toEqual([]);
      });
    });
  }
}

test("projects link to every enabled case study, and the sitemap lists them", async ({ page, request }) => {
  await page.goto("/fa");
  for (const study of allCaseStudies.filter((s) => s.enabled)) {
    await expect(page.getByTestId(`case-study-link-${study.id}`)).toHaveAttribute("href", `/fa/case-studies/${study.slug}`);
  }
  const sitemap = await (await request.get("/sitemap.xml")).text();
  for (const locale of LOCALES) {
    for (const study of STUDIES) expect(sitemap).toContain(`/${locale}/case-studies/${study.slug}</loc>`);
  }
});

test("disabled case studies have no links, return 404 and stay out of the sitemap", async ({ page, request }) => {
  test.skip(DISABLED.length === 0, "every case study is enabled");
  await page.goto("/en");
  const sitemap = await (await request.get("/sitemap.xml")).text();
  for (const study of DISABLED) {
    await expect(page.getByTestId(`case-study-link-${study.id}`)).toHaveCount(0);
    for (const locale of LOCALES) {
      const response = await request.get(`/${locale}/case-studies/${study.slug}`);
      expect(response.status(), `${locale}/${study.slug}`).toBe(404);
      expect(sitemap).not.toContain(`/case-studies/${study.slug}`);
    }
  }
});

test("an unknown case study returns a localised 404", async ({ page }) => {
  const response = await page.goto("/en/case-studies/does-not-exist");
  expect(response?.status()).toBe(404);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});
