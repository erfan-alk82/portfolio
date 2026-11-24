import { describe, expect, test } from "vitest";
import { allCaseStudies, caseStudies } from "@/content/profile";
import { isMalformedBlogPath, isUnknownCaseStudy } from "@/i18n/routes";

describe("isUnknownCaseStudy", () => {
  test("enabled case studies are served and disabled ones are treated as unknown", () => {
    for (const study of allCaseStudies) {
      expect(isUnknownCaseStudy(`/fa/case-studies/${study.slug}`), study.slug).toBe(!study.enabled);
      expect(isUnknownCaseStudy(`/en/case-studies/${study.slug}`), study.slug).toBe(!study.enabled);
    }
  });

  test("the published list contains exactly the enabled studies", () => {
    expect(caseStudies.map((s) => s.id)).toEqual(allCaseStudies.filter((s) => s.enabled).map((s) => s.id));
  });

  test("an unknown slug is flagged so the proxy can answer 404 before streaming", () => {
    expect(isUnknownCaseStudy("/en/case-studies/does-not-exist")).toBe(true);
  });

  test("other paths are left alone", () => {
    expect(isUnknownCaseStudy("/fa")).toBe(false);
    expect(isUnknownCaseStudy("/fa/case-studies")).toBe(false);
    expect(isUnknownCaseStudy("/en/blog/post")).toBe(false);
  });
});

describe("isMalformedBlogPath", () => {
  test("well-formed post slugs and the index go through", () => {
    expect(isMalformedBlogPath("/fa/blog")).toBe(false);
    expect(isMalformedBlogPath("/fa/blog/")).toBe(false);
    expect(isMalformedBlogPath("/en/blog/event-driven-notes")).toBe(false);
    expect(isMalformedBlogPath(`/en/blog/${"a".repeat(80)}`)).toBe(false);
  });

  test.each([
    "/en/blog/Upper-Case",
    "/en/blog/two--dashes",
    "/en/blog/-leading",
    `/en/blog/${"a".repeat(81)}`,
    "/fa/blog/%D8%B3%D9%84%D8%A7%D9%85",
    "/en/blog/a/b",
    "/en/blog/under_score",
  ])("%s is answered with a 404 before any database read", (path) => {
    expect(isMalformedBlogPath(path)).toBe(true);
  });

  test("other sections are left alone", () => {
    expect(isMalformedBlogPath("/en/case-studies/Upper")).toBe(false);
    expect(isMalformedBlogPath("/en")).toBe(false);
  });
});
