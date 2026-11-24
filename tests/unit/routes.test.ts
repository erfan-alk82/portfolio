import { describe, expect, test } from "vitest";
import { allCaseStudies, caseStudies } from "@/content/profile";
import { isUnknownCaseStudy } from "@/i18n/routes";

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
