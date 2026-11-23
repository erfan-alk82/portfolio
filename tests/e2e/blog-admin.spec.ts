import AxeBuilder from "@axe-core/playwright";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";

/**
 * The publishing flow end to end, against a real database. The server under
 * test must run with DATABASE_URL and ADMIN_USERNAME / ADMIN_PASSWORD_HASH /
 * SESSION_SECRET; this process needs DATABASE_URL plus the plain-text
 * E2E_ADMIN_USERNAME / E2E_ADMIN_PASSWORD that match them. CI creates all of
 * these per run (see .github/workflows/pipeline.yml).
 */

const username = process.env.E2E_ADMIN_USERNAME ?? "";
const password = process.env.E2E_ADMIN_PASSWORD ?? "";
const enabled = Boolean(process.env.DATABASE_URL && username && password);

// Unique per run, so reruns against the same database never collide.
const slug = `e2e-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
const faTitle = "یادداشت آزمایشی";
const enTitle = "An end-to-end test post about publishing";

async function expectNoAxeViolations(page: Page): Promise<void> {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(" | ")}`)).toEqual([]);
}

test.describe("blog admin @desktop-only", () => {
  test.skip(
    !enabled,
    "Set DATABASE_URL, E2E_ADMIN_USERNAME and E2E_ADMIN_PASSWORD (and run the server with the matching ADMIN_* env) to test the admin.",
  );
  test.describe.configure({ mode: "serial" });

  let context: BrowserContext;
  let page: Page;
  let editorUrl = "";

  test.beforeAll(async ({ browser }, testInfo) => {
    context = await browser.newContext({ baseURL: testInfo.project.use.baseURL });
    page = await context.newPage();
  });

  test.afterAll(async () => {
    await context.close();
  });

  test("signed out, /admin leads to the login page", async () => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login$/);
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test("a wrong password gets one generic error", async () => {
    await page.goto("/admin/login");
    await page.getByLabel("Username").fill(username);
    await page.getByLabel("Password").fill(`${password}-wrong`);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.locator("#login-error")).toHaveText("That username and password do not match.");
    await expect(page.locator("#login-error")).toHaveAttribute("role", "alert");
    await expect(page).toHaveURL(/\/admin\/login$/);
  });

  test("the right credentials open the dashboard", async () => {
    await page.getByLabel("Username").fill(username);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole("heading", { name: "Posts", level: 1 })).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test("creates a Persian + English draft with a live SEO checklist", async () => {
    await page.goto("/admin/posts/new");
    await page.locator("#slug").fill(slug);
    await page.locator("#fa-title").fill(faTitle);
    await page.locator("#fa-description").fill("یک توضیح کوتاه برای آزمون انتشار.");
    await page.locator("#fa-body").fill("## بخش اول\n\nمتنی با [[React]] و `code`.");
    await page.locator("#en-title").fill(enTitle);
    await page.locator("#en-description").fill(
      "A short description for the end-to-end publishing test, long enough to pass the length check.",
    );
    await page.locator("#en-body").fill("## First section\n\nSome **bold** text and a [link](/en/blog).");

    await expect(page.locator("#fa-body")).toHaveAttribute("dir", "rtl");
    await expect(page.locator("#fa-title")).toHaveAttribute("lang", "fa");
    await expect(page.locator("#slug")).toHaveAttribute("dir", "ltr");
    // The Persian title is short: a visible warning, not a blocking error.
    const faWarning = page.locator('fieldset:has(#fa-title) [data-check="title-length"][data-state="warning"]');
    await expect(faWarning).toBeVisible();
    await expect(faWarning).toContainText("Warning");

    await page.getByRole("button", { name: "Show preview" }).first().click();
    await expect(page.getByRole("region", { name: "Persian preview" }).locator("bdi")).toHaveText("React");

    await page.getByRole("button", { name: "Create draft" }).click();
    await expect(page).toHaveURL(/\/admin\/posts\/[0-9a-f-]{36}\?created=1$/);
    await expect(page.getByText("Draft created.")).toBeVisible();
    editorUrl = page.url().replace(/\?.*$/, "");
    await expectNoAxeViolations(page);
  });

  test("publishes both languages", async () => {
    await page.getByRole("button", { name: "Publish Persian" }).click();
    await expect(page.getByText("The Persian version is live.")).toBeVisible();
    await page.getByRole("button", { name: "Publish English" }).click();
    await expect(page.getByText("The English version is live.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Unpublish English" })).toBeVisible();
  });

  test("the post appears on both blog indexes at once", async () => {
    await page.goto("/fa/blog");
    await expect(page.locator(`a[href="/fa/blog/${slug}"]`)).toHaveText(faTitle);
    await page.goto("/en/blog");
    await expect(page.locator(`a[href="/en/blog/${slug}"]`)).toHaveText(enTitle);
    await expectNoAxeViolations(page);
  });

  test("the post page carries canonical, hreflang and BlogPosting JSON-LD", async () => {
    await page.goto(`/en/blog/${slug}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(enTitle);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", new RegExp(`/en/blog/${slug}$`));
    await expect(page.locator('link[rel="alternate"][hreflang="fa"]')).toHaveAttribute("href", new RegExp(`/fa/blog/${slug}$`));
    await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute("href", new RegExp(`/en/blog/${slug}$`));
    await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveAttribute(
      "href",
      new RegExp(`/fa/blog/${slug}$`),
    );
    await expect(page.locator('meta[property="og:type"]')).toHaveAttribute("content", "article");
    await expect(page.locator('meta[property="article:published_time"]')).toHaveCount(1);

    const jsonLd = await page.locator('script[type="application/ld+json"]').allTextContents();
    const posting = jsonLd.map((text) => JSON.parse(text)).find((data) => data["@type"] === "BlogPosting");
    expect(posting).toMatchObject({ headline: enTitle, inLanguage: "en", author: { "@id": expect.stringMatching(/\/#person$/) } });
    await expectNoAxeViolations(page);
  });

  test("the sitemap and the Persian feed list the post", async ({ request }) => {
    expect(await (await request.get("/sitemap.xml")).text()).toContain(`/fa/blog/${slug}</loc>`);
    expect(await (await request.get("/fa/feed.xml")).text()).toContain(`/fa/blog/${slug}</link>`);
  });

  test("unpublishing English removes that page and its hreflang", async () => {
    await page.goto(editorUrl);
    await page.getByRole("button", { name: "Unpublish English" }).click();
    await expect(page.getByText("The English version is back to draft.")).toBeVisible();

    await page.goto(`/en/blog/${slug}`);
    await expect(page.getByRole("heading", { name: "This page isn't on the map" })).toBeVisible();
    await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute("content", /noindex/);

    await page.goto(`/fa/blog/${slug}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(faTitle);
    await expect(page.locator('link[rel="alternate"][hreflang="fa"]')).toHaveCount(1);
    await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveCount(0);
  });

  test("deletes the post after typing its slug", async () => {
    await page.goto(editorUrl);
    await page.getByRole("button", { name: "Delete this post…" }).click();
    const confirm = page.getByRole("button", { name: "Delete permanently" });
    await expect(confirm).toBeDisabled();
    await page.getByLabel(`Type ${slug} to confirm`).fill(slug);
    await confirm.click();
    await expect(page).toHaveURL(/\/admin\?deleted=1$/);
    await expect(page.getByText("The post was deleted.")).toBeVisible();
    await page.goto(`/fa/blog/${slug}`);
    await expect(page.getByRole("heading", { name: "این صفحه روی نقشه نیست" })).toBeVisible();
  });

  test("signing out ends the session", async () => {
    await page.goto("/admin");
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/admin\/login$/);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login$/);
  });
});
