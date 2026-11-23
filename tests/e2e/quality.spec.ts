import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const LOCALES = ["fa", "en"] as const;
const WIDTHS = [320, 375, 768, 1024, 1440, 1920] as const;

for (const locale of LOCALES) {
  test.describe(`/${locale} quality`, () => {
    test("has no automatically detectable WCAG 2.2 AA violations", async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(`/${locale}`);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(" | ")}`)).toEqual([]);
    });

    test("never scrolls horizontally @desktop-only", async ({ page }) => {
      for (const width of WIDTHS) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(`/${locale}`);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        expect(overflow, `overflow at ${width}px`).toBeLessThanOrEqual(0);
      }
    });

    test("starts keyboard navigation with a working skip link", async ({ page }) => {
      await page.goto(`/${locale}`);
      await page.keyboard.press("Tab");
      const skip = page.getByRole("link", { name: locale === "fa" ? "رفتن به محتوای اصلی" : "Skip to content" });
      await expect(skip).toBeFocused();
      await expect(skip).toBeVisible();
      await page.keyboard.press("Enter");
      await expect(page.locator("main")).toBeFocused();
    });

    test("every in-page link points at an existing section", async ({ page }) => {
      await page.goto(`/${locale}`);
      const hashes = await page.locator('a[href^="#"]').evaluateAll((links) =>
        links.map((a) => a.getAttribute("href")?.slice(1) ?? ""),
      );
      expect(hashes.length).toBeGreaterThan(5);
      for (const id of new Set(hashes)) {
        await expect(page.locator(`[id="${id}"]`), `#${id}`).toHaveCount(1);
      }
    });

    test("external links open safely and the CV downloads", async ({ page, request }) => {
      await page.goto(`/${locale}`);
      for (const link of await page.locator('a[target="_blank"]').all()) {
        await expect(link).toHaveAttribute("rel", /noopener/);
        await expect(link).toHaveAttribute("href", /^https:\/\//);
      }
      const cvHref = await page.locator("a[download]").first().getAttribute("href");
      const cv = await request.get(cvHref ?? "");
      expect(cv.status()).toBe(200);
      expect(cv.headers()["content-type"]).toContain("application/pdf");
    });

    test("publishes the phone number as a callable link", async ({ page }) => {
      await page.goto(`/${locale}`);
      const phone = page.getByTestId("phone");
      await expect(phone).toHaveAttribute("href", "tel:+989365833763");
      await expect(phone).toHaveText(locale === "fa" ? "۰۹۳۶ ۵۸۳ ۳۷۶۳" : "+98 936 583 3763");
    });

    test("respects reduced motion", async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(`/${locale}`);
      const animations = await page
        .locator(".route-reveal, .waypoint")
        .evaluateAll((els) => els.map((el) => getComputedStyle(el).animationName));
      expect(animations.length).toBeGreaterThan(2);
      expect(new Set(animations)).toEqual(new Set(["none"]));
    });

    test("ships security headers", async ({ request }) => {
      const response = await request.get(`/${locale}`);
      const headers = response.headers();
      expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
      expect(headers["x-content-type-options"]).toBe("nosniff");
      expect(headers["x-powered-by"]).toBeUndefined();
    });
  });
}

test.describe("contact", () => {
  test("copies the email address and announces it @desktop-only", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/en#contact");
    await page.getByTestId("copy-email").click();
    await expect(page.getByRole("status")).toHaveText("Email copied");
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("erfanalikhani6@gmail.com");
  });

  test("explains what to do when copying fails", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true });
    });
    await page.goto("/fa#contact");
    await page.getByTestId("copy-email").click();
    await expect(page.getByRole("status")).toHaveText("کپی نشد. آدرس را انتخاب و دستی کپی کنید.");
  });
});

test.describe("career data", () => {
  for (const locale of LOCALES) {
    test(`/${locale} lists five roles, Nadin Soft steps and PantryLab store links`, async ({ page }) => {
      await page.goto(`/${locale}`);
      await expect(page.locator("#experience > ol > li")).toHaveCount(5);
      await expect(page.locator("#experience ol ol li")).toHaveCount(3);
      for (const host of ["pantrylab.net", "apps.apple.com", "play.google.com"]) {
        await expect(page.locator(`#projects a[href*="${host}"]`)).toHaveCount(1);
      }
      await expect(page.locator(`#experience a[href*="linkedin.com/company/dinamotor-software"]`)).toHaveCount(1);
    });
  }
});

test.describe("night map", () => {
  const NIGHT_PAPER = "rgb(14, 24, 36)";
  const DAY_PAPER = "rgb(232, 236, 230)";
  const background = (page: import("@playwright/test").Page) =>
    page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor);

  test("follows the system preference when nothing is saved", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/en");
    expect(await background(page)).toBe(NIGHT_PAPER);
    await page.emulateMedia({ colorScheme: "light" });
    expect(await background(page)).toBe(DAY_PAPER);
  });

  test("the toggle switches, is remembered, and applies before paint", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/fa");
    const toggle = page.getByTestId("theme-toggle");
    await expect(toggle).toHaveAccessibleName("نقشه‌ی شب");
    // Retry the click until hydration has attached the handler (slow CI runners).
    await expect(async () => {
      await toggle.click();
      await expect(page.locator("html")).toHaveAttribute("data-theme", "dark", { timeout: 500 });
    }).toPass();
    await expect(toggle).toHaveAttribute("aria-pressed", "true");

    // The boot script must set the theme before any stylesheet paints.
    // The first animation frame runs before the first paint: the theme must already be set.
    await page.addInitScript(() => {
      requestAnimationFrame(() => {
        (window as unknown as { themeAtLoad?: string }).themeAtLoad = document.documentElement.dataset.theme;
      });
    });
    await page.reload();
    expect(await page.evaluate(() => (window as unknown as { themeAtLoad?: string }).themeAtLoad)).toBe("dark");
    expect(await background(page)).toBe(NIGHT_PAPER);
  });

  for (const locale of LOCALES) {
    test(`/${locale} has no WCAG 2.2 AA violations at night`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
      await page.goto(`/${locale}`);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(" | ")}`)).toEqual([]);
    });
  }
});

test.describe("availability and languages", () => {
  const expected = {
    fa: { availability: "آماده‌ی همکاری دورکاری، پروژه‌ای و فریلنس", languages: ["فارسی", "انگلیسی"] },
    en: { availability: "Open to remote roles, project-based work and freelance", languages: ["Persian", "English"] },
  } as const;

  for (const locale of LOCALES) {
    test(`/${locale} shows availability in hero and contact, and spoken languages`, async ({ page }) => {
      await page.goto(`/${locale}`);
      const availability = page.getByTestId("availability");
      await expect(availability).toHaveCount(2);
      await expect(availability.first()).toContainText(expected[locale].availability);
      for (const language of expected[locale].languages) {
        await expect(page.locator("#about dd", { hasText: language })).toHaveCount(1);
      }
    });
  }
});

test.describe("routing edges", () => {
  test("a URL with no locale and a file extension gets the default-locale 404", async ({ page }) => {
    const response = await page.goto("/wp-login.php");
    expect(response?.status()).toBe(404);
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.getByRole("link", { name: "رفتن به صفحه‌ی اصلی" })).toHaveAttribute("href", "/fa");
  });

  test("the negotiation redirect is never cached for other visitors", async ({ request }) => {
    const response = await request.get("/", { maxRedirects: 0 });
    expect(response.status()).toBe(307);
    expect(response.headers()["cache-control"]).toContain("no-store");
    expect(response.headers()["vary"]).toContain("Accept-Language");
  });

  test("Latin terms inside Persian are tagged as English for screen readers", async ({ page }) => {
    await page.goto("/fa");
    const untagged = await page.locator("main bdi[dir='ltr']:not([lang='en'])").count();
    expect(untagged).toBe(0);
  });
});

test.describe("crawlers", () => {
  test("x-default points at the default locale, not a redirect", async ({ page }) => {
    await page.goto("/en");
    await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveAttribute("href", /\/fa$/);
  });

  test("sitemap lists both languages with alternates", async ({ request }) => {
    const body = await (await request.get("/sitemap.xml")).text();
    expect(body).toContain("/fa</loc>");
    expect(body).toContain("/en</loc>");
    expect(body).toContain('hreflang="fa"');
  });

  test("robots allows crawling and points at the sitemap", async ({ request }) => {
    const body = await (await request.get("/robots.txt")).text();
    expect(body).toContain("Allow: /");
    expect(body).toContain("Sitemap:");
  });
});
