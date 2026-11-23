import { test } from "@playwright/test";

/**
 * Visual review captures, not assertions. Run with:
 *   npx playwright test screenshots --project=desktop
 * Images land in test-results/screens for manual design review.
 */
const WIDTHS = [375, 768, 1440] as const;

test.describe("visual review @desktop-only", () => {
  test.skip(!process.env.CAPTURE, "Set CAPTURE=1 to capture review screenshots");

  for (const locale of ["fa", "en"] as const) {
    for (const width of WIDTHS) {
      test(`${locale} at ${width}px`, async ({ page }) => {
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.setViewportSize({ width, height: 900 });
        await page.goto(`/${locale}`);
        await page.evaluate(() => document.fonts.ready);
        await page.screenshot({ path: `test-results/screens/${locale}-${width}.png`, fullPage: true });
      });
    }
  }
});
