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

// Short on purpose: with " | site name" the <title> stays under 30 characters, a visible warning.
const faTitle = "آزمون";
const enTitle = "An end-to-end test post about publishing";
const NOT_FOUND = { fa: "این صفحه روی نقشه نیست", en: "This page isn't on the map" } as const;

async function expectNoAxeViolations(page: Page): Promise<void> {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(" | ")}`)).toEqual([]);
}

async function expectNotFound(page: Page, path: string, locale: "fa" | "en"): Promise<void> {
  await page.goto(path);
  await expect(page.getByRole("heading", { name: NOT_FOUND[locale] })).toBeVisible();
  await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute("content", /noindex/);
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
  let slug = "";

  test.beforeAll(async ({ browser }, testInfo) => {
    // Unique per run and per retry attempt, so nothing collides with an earlier try.
    slug = `e2e-${Date.now().toString(36)}-r${testInfo.retry}-${Math.random().toString(36).slice(2, 6)}`;
    context = await browser.newContext({ baseURL: testInfo.project.use.baseURL });
    page = await context.newPage();
  });

  test.afterAll(async () => {
    await context.close();
  });

  test("signed out, /admin answers a real 307 to the login page", async ({ request }) => {
    const response = await request.get("/admin", { maxRedirects: 0 });
    expect(response.status()).toBe(307);
    expect(response.headers().location).toMatch(/\/admin\/login$/);
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

  test("an invalid draft reports its errors and focuses the first one", async () => {
    await page.goto("/admin/posts/new");
    await page.locator("#slug").fill("not a slug");
    await page.locator("#en-body").fill("Body without a title");
    await page.getByRole("button", { name: "Create draft" }).click();
    await expect(page.locator("#slug-error")).toHaveAttribute("role", "alert");
    await expect(page.locator("#en-title-error")).toBeVisible();
    await expect(page.locator("#slug")).toBeFocused();
    await expect(page.locator("#slug")).toHaveAttribute("aria-invalid", "true");
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

  test("a second post cannot take the same slug", async () => {
    await page.goto("/admin/posts/new");
    await page.locator("#slug").fill(slug);
    await page.locator("#en-title").fill("Duplicate");
    await page.getByRole("button", { name: "Create draft" }).click();
    await expect(page.locator("#slug-error")).toHaveText("Another post already uses this slug.");
    await expect(page).toHaveURL(/\/admin\/posts\/new$/);
  });

  test("publishes both languages", async () => {
    await page.goto(editorUrl);
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
    await expect(page.locator('link[rel="alternate"][type="application/rss+xml"]')).toHaveAttribute("title", /.+/);
    await expect(page.locator('meta[property="og:type"]')).toHaveAttribute("content", "article");
    await expect(page.locator('meta[property="article:published_time"]')).toHaveCount(1);

    const jsonLd = await page.locator('script[type="application/ld+json"]').allTextContents();
    const posting = jsonLd.map((text) => JSON.parse(text)).find((data) => data["@type"] === "BlogPosting");
    expect(posting).toMatchObject({
      headline: enTitle,
      inLanguage: "en",
      author: { "@type": "Person", "@id": expect.stringMatching(/\/#person$/), name: expect.any(String) },
      mainEntityOfPage: { "@type": "WebPage" },
      isPartOf: { "@type": "Blog", "@id": expect.stringMatching(/\/en\/blog#blog$/) },
    });
    await expectNoAxeViolations(page);
  });

  test("the sitemap and the Persian feed list the post", async ({ request }) => {
    expect(await (await request.get("/sitemap.xml")).text()).toContain(`/fa/blog/${slug}</loc>`);
    expect(await (await request.get("/fa/feed.xml")).text()).toContain(`/fa/blog/${slug}</link>`);
  });

  test("renaming the slug warns first, then moves the post", async () => {
    await page.goto(editorUrl);
    const renamed = `${slug}-moved`;
    await page.locator("#slug").fill(renamed);
    await expect(page.locator("#slug-warning")).toContainText("old URL");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("Saved.")).toBeVisible();
    await expectNotFound(page, `/en/blog/${slug}`, "en");
    await page.goto(`/en/blog/${renamed}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(enTitle);
    slug = renamed;
  });

  test("unpublishing English removes that page and its hreflang", async () => {
    await page.goto(editorUrl);
    await page.getByRole("button", { name: "Unpublish English" }).click();
    await expect(page.getByText("The English version is back to draft.")).toBeVisible();

    await expectNotFound(page, `/en/blog/${slug}`, "en");
    await page.goto(`/fa/blog/${slug}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(faTitle);
    await expect(page.locator('link[rel="alternate"][hreflang="fa"]')).toHaveCount(1);
    await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveCount(0);
  });

  test("deletes the post after typing its slug", async () => {
    await page.goto(editorUrl);
    await page.getByRole("button", { name: "Delete this post…" }).click();
    const confirm = page.getByRole("button", { name: "Delete permanently" });
    await expect(confirm).toHaveAttribute("aria-disabled", "true");
    await page.getByLabel(`Type ${slug} to confirm`).fill(slug);
    await expect(confirm).not.toHaveAttribute("aria-disabled", "true");
    await confirm.click();
    await expect(page).toHaveURL(/\/admin\?deleted=1$/);
    await expect(page.getByText("The post was deleted.")).toBeVisible();
    await expectNotFound(page, `/fa/blog/${slug}`, "fa");
  });

  test("signing out ends the session", async () => {
    await page.goto("/admin");
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/admin\/login$/);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login$/);
  });
});
