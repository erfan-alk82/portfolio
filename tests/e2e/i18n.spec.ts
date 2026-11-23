import { expect, test } from "@playwright/test";

const LOCALES = [
  { locale: "fa", dir: "rtl", name: "عرفان علیخانی" },
  { locale: "en", dir: "ltr", name: "Erfan Alikhani" },
] as const;

test.describe("locale negotiation at /", () => {
  const cases = [
    { browserLocale: "fa-IR", expected: /\/fa$/, label: "a Persian browser to /fa" },
    { browserLocale: "en-GB", expected: /\/en$/, label: "an English browser to /en" },
    { browserLocale: "de-DE", expected: /\/fa$/, label: "an unsupported language to Persian" },
  ];

  for (const { browserLocale, expected, label } of cases) {
    test(`sends ${label}`, async ({ browser }) => {
      // The browser locale drives the Accept-Language header Chromium sends.
      const context = await browser.newContext({ locale: browserLocale });
      const page = await context.newPage();
      await page.goto("/");
      await expect(page).toHaveURL(expected);
      await context.close();
    });
  }
});

for (const { locale, dir, name } of LOCALES) {
  test.describe(`/${locale}`, () => {
    test("sets lang and dir on the document", async ({ page }) => {
      await page.goto(`/${locale}`);
      await expect(page.locator("html")).toHaveAttribute("lang", locale);
      await expect(page.locator("html")).toHaveAttribute("dir", dir);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);
    });

    test("publishes canonical, hreflang and social metadata", async ({ page }) => {
      await page.goto(`/${locale}`);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", new RegExp(`/${locale}$`));
      for (const lang of ["fa", "en", "x-default"]) {
        await expect(page.locator(`link[rel="alternate"][hreflang="${lang}"]`)).toHaveCount(1);
      }
      await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute(
        "content",
        locale === "fa" ? "fa_IR" : "en_US",
      );
      await expect(page.locator('meta[property="og:image"]').first()).toHaveAttribute("content", new RegExp(`/og/${locale}\\.png$`));
      const jsonLd = await page.locator('script[type="application/ld+json"]').textContent();
      expect(JSON.parse(jsonLd ?? "{}")).toMatchObject({ "@type": "ProfilePage", mainEntity: { "@type": "Person", name } });
    });

    test("serves its own social image", async ({ page, request }) => {
      await page.goto(`/${locale}`);
      const imageUrl = await page.locator('meta[property="og:image"]').first().getAttribute("content");
      const response = await request.get(new URL(imageUrl ?? "").pathname);
      expect(response.status()).toBe(200);
      expect(response.headers()["content-type"]).toContain("image/png");
    });

    test("shows Solar Hijri years in Persian and Gregorian months in English", async ({ page }) => {
      await page.goto(`/${locale}`);
      const firstPeriod = page.locator("#experience [data-period]").first();
      await expect(firstPeriod).toHaveText(locale === "fa" ? "۱۴۰۴ – اکنون" : "Aug 2025 – Present");
    });
  });
}

test("renders Latin terms inside Persian text as LTR isolates", async ({ page }) => {
  await page.goto("/fa");
  expect(await page.locator("main bdi[dir='ltr']").count()).toBeGreaterThan(40);
  await expect(page.locator("main bdi[dir='ltr']", { hasText: "ASP.NET Core" }).first()).toBeVisible();
});

test.describe("language switching", () => {
  test("keeps the current section, updates lang/dir, and survives a reload", async ({ page }) => {
    await page.goto("/en#experience");
    await page.getByTestId("language-switch").click();
    await expect(page).toHaveURL(/\/fa#experience$/);
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator("html")).toHaveAttribute("lang", "fa");
    await expect(page.getByRole("heading", { level: 2, name: "سوابق کاری" })).toBeVisible();

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("lang", "fa");
  });

  test("carries the section in view even without a hash", async ({ page }) => {
    // Instant scrolling, so the section is in place before the click.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/fa");
    await page.evaluate(() => document.getElementById("skills")?.scrollIntoView({ block: "start" }));
    // A real pointer click: locator.click() would first scroll the sticky header "into view".
    const box = await page.getByTestId("language-switch").boundingBox();
    if (!box) throw new Error("language switch is not rendered");
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await expect(page).toHaveURL(/\/en#skills$/);
    await expect(page.getByRole("heading", { level: 2, name: "Skills" })).toBeInViewport();
  });

  test("remembers the choice for later visits to /", async ({ browser }) => {
    const context = await browser.newContext({ locale: "fa-IR" });
    const page = await context.newPage();
    await page.goto("/en");
    await page.goto("/");
    await expect(page).toHaveURL(/\/en$/);
    await context.close();
  });

  test("works as a plain link without JavaScript", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("/fa");
    await page.getByTestId("language-switch").click();
    await expect(page).toHaveURL(/\/en$/);
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
    await context.close();
  });
});

test.describe("not found", () => {
  for (const { locale } of LOCALES) {
    test(`/${locale}/missing returns a localised 404`, async ({ page }) => {
      const response = await page.goto(`/${locale}/missing-page`);
      expect(response?.status()).toBe(404);
      await expect(page.locator("html")).toHaveAttribute("lang", locale);
      const home = page.getByRole("link", { name: locale === "fa" ? "رفتن به صفحه‌ی اصلی" : "Go to the homepage" });
      await expect(home).toHaveAttribute("href", `/${locale}`);
    });
  }
});
