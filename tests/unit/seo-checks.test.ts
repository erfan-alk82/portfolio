import { describe, expect, test } from "vitest";
import {
  DESCRIPTION_RANGE,
  TITLE_RANGE,
  checkTranslationSeo,
  hasBlockingIssue,
  type SeoInput,
} from "@/lib/blog/seo-checks";

const good: SeoInput = {
  slug: "event-driven-notes",
  locale: "en",
  title: "t".repeat(TITLE_RANGE.min),
  description: "d".repeat(DESCRIPTION_RANGE.min),
  bodyMd: "Some body",
  otherTranslation: "published",
};

function failing(input: SeoInput): string[] {
  return checkTranslationSeo(input)
    .filter((check) => !check.passed)
    .map((check) => check.id);
}

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
  ])("title of %i characters passes: %s", (length, passes) => {
    expect(failing({ ...good, title: "t".repeat(length) }).includes("title-length")).toBe(!passes);
  });

  test.each([
    [DESCRIPTION_RANGE.min - 1, false],
    [DESCRIPTION_RANGE.min, true],
    [DESCRIPTION_RANGE.max, true],
    [DESCRIPTION_RANGE.max + 1, false],
  ])("description of %i characters passes: %s", (length, passes) => {
    expect(failing({ ...good, description: "d".repeat(length) }).includes("description-length")).toBe(!passes);
  });

  test("length warnings do not block publishing", () => {
    const checks = checkTranslationSeo({ ...good, title: "Short", description: "Short" });
    expect(checks.filter((c) => !c.passed).every((c) => c.severity === "warning")).toBe(true);
    expect(hasBlockingIssue(checks)).toBe(false);
  });

  test("[[term]] markers do not count towards the title length", () => {
    const title = `[[${"t".repeat(TITLE_RANGE.max)}]]`;
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
