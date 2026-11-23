import { describe, expect, test } from "vitest";
import { isUnknownCaseStudy } from "@/i18n/routes";

describe("isUnknownCaseStudy", () => {
  test("known case studies are served", () => {
    expect(isUnknownCaseStudy("/fa/case-studies/geoinsight")).toBe(false);
    expect(isUnknownCaseStudy("/en/case-studies/factory-production")).toBe(false);
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
