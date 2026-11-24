import { describe, expect, test } from "vitest";
import { getCopy } from "@/content";
import {
  DESCRIPTION_RANGE,
  TITLE_RANGE,
  checkTranslationSeo,
  hasBlockingIssue,
  titleTag,
  type SeoInput,
} from "@/lib/blog/seo-checks";
import { displayLength } from "@/lib/text";

const ZWNJ = String.fromCharCode(0x200c);
/** Characters the " | Site name" suffix adds to every English <title>. */
const EN_SUFFIX = displayLength(`x | ${getCopy("en").meta.siteName}`) - 1;

/** A post title whose full <title> is exactly `total` characters long. */
function titleOfTotal(total: number): string {
  return "t".repeat(total - EN_SUFFIX);
}

const good: SeoInput = {
  slug: "event-driven-notes",
  locale: "en",
  title: titleOfTotal(45),
  description: "d".repeat(DESCRIPTION_RANGE.min),
  bodyMd: "Some body",
  otherTranslation: "published",
};

function failing(input: SeoInput): string[] {
  return checkTranslationSeo(input)
    .filter((check) => !check.passed)
    .map((check) => check.id);
}

describe("titleTag", () => {
  test("is the post title plus the site name, as rendered", () => {
    expect(titleTag("en", "Hello [[React]]")).toBe(`Hello React | ${getCopy("en").meta.siteName}`);
    expect(titleTag("fa", "سلام")).toBe(`سلام | ${getCopy("fa").meta.siteName}`);
  });
});

describe("checkTranslationSeo", () => {
  test("a complete translation passes every check", () => {
    expect(failing(good)).toEqual([]);
    expect(hasBlockingIssue(checkTranslationSeo(good))).toBe(false);
  });

  test.each([
    [TITLE_RANGE.min - 1, false],
    [TITLE_RANGE.min, true],
    [TITLE_RANGE.max, true],
    [TITLE_RANGE.max + 1, false],
  ])("a <title> of %i characters passes: %s", (total, passes) => {
    expect(failing({ ...good, title: titleOfTotal(total) }).includes("title-length")).toBe(!passes);
  });

  test("the message reports the full <title> length", () => {
    const check = checkTranslationSeo({ ...good, title: titleOfTotal(70) }).find((c) => c.id === "title-length");
    expect(check?.message).toContain("now 70");
  });

  test("Persian zero-width non-joiners do not count", () => {
    const withJoiners = `می${ZWNJ}خواهم`.repeat(4);
    const without = "میخواهم".repeat(4);
    const a = checkTranslationSeo({ ...good, locale: "fa", title: withJoiners }).find((c) => c.id === "title-length");
    const b = checkTranslationSeo({ ...good, locale: "fa", title: without }).find((c) => c.id === "title-length");
    expect(a?.message).toBe(b?.message);
  });

  test.each([
    [DESCRIPTION_RANGE.min - 1, false],
    [DESCRIPTION_RANGE.min, true],
    [DESCRIPTION_RANGE.max, true],
    [DESCRIPTION_RANGE.max + 1, false],
  ])("description of %i characters passes: %s", (length, passes) => {
    expect(failing({ ...good, description: "d".repeat(length) }).includes("description-length")).toBe(!passes);
  });

  test("whitespace runs in the description count once", () => {
    // Collapsed: (max - 2) + " " + "d" = max, so it passes; counted raw it would be over the limit.
    const description = `${"d".repeat(DESCRIPTION_RANGE.max - 2)}\n\n\n    d`;
    expect(failing({ ...good, description })).not.toContain("description-length");
    expect(failing({ ...good, description: `${description}d` })).toContain("description-length");
  });

  test("length warnings do not block publishing", () => {
    const checks = checkTranslationSeo({ ...good, title: "Short", description: "Short" });
    expect(checks.filter((c) => !c.passed).every((c) => c.severity === "warning")).toBe(true);
    expect(hasBlockingIssue(checks)).toBe(false);
  });

  test("[[term]] markers do not count towards the title length", () => {
    const title = `[[${titleOfTotal(TITLE_RANGE.max)}]]`;
    expect(failing({ ...good, title })).not.toContain("title-length");
  });

  test.each([
    ["slug", { slug: "Bad Slug" }],
    ["title-present", { title: "   " }],
    ["description-present", { description: "" }],
    ["body", { bodyMd: " \n " }],
  ] as const)("%s is a blocking error", (id, patch) => {
    const checks = checkTranslationSeo({ ...good, ...patch });
    const check = checks.find((c) => c.id === id);
    expect(check?.passed).toBe(false);
    expect(check?.severity).toBe("error");
    expect(hasBlockingIssue(checks)).toBe(true);
  });

  test.each(["missing", "draft"] as const)("warns when the other language is %s", (state) => {
    const check = checkTranslationSeo({ ...good, otherTranslation: state }).find((c) => c.id === "other-translation");
    expect(check?.passed).toBe(false);
    expect(check?.severity).toBe("warning");
    expect(check?.message).toMatch(/Persian/);
  });

  test("every check has a readable message", () => {
    for (const check of checkTranslationSeo({ ...good, locale: "fa", otherTranslation: "missing" })) {
      expect(check.message.length).toBeGreaterThan(10);
    }
  });
});
