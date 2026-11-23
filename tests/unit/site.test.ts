import { describe, expect, test } from "vitest";
import { languageAlternates, resolveSiteUrl } from "@/lib/site";

describe("resolveSiteUrl", () => {
  test("uses SITE_URL when it is set", () => {
    expect(resolveSiteUrl({ SITE_URL: "https://erfan.dev/" }).href).toBe("https://erfan.dev/");
  });

  test("falls back to the Vercel production host", () => {
    expect(resolveSiteUrl({ VERCEL_PROJECT_PRODUCTION_URL: "erfan.vercel.app" }).href).toBe(
      "https://erfan.vercel.app/",
    );
  });

  test("treats an empty SITE_URL as unset", () => {
    expect(resolveSiteUrl({ SITE_URL: "  ", VERCEL_PROJECT_PRODUCTION_URL: "erfan.vercel.app" }).host).toBe(
      "erfan.vercel.app",
    );
  });

  test("falls back to localhost outside production", () => {
    expect(resolveSiteUrl({ NODE_ENV: "development" }).href).toBe("http://localhost:3000/");
  });

  test("refuses to build production without a public URL", () => {
    expect(() => resolveSiteUrl({ NODE_ENV: "production" })).toThrow(/SITE_URL is required/);
  });

  test("rejects a value that is not an http(s) URL", () => {
    expect(() => resolveSiteUrl({ SITE_URL: "ftp://erfan.dev" })).toThrow(/SITE_URL/);
    expect(() => resolveSiteUrl({ SITE_URL: "not a url" })).toThrow(/SITE_URL/);
  });
});

describe("languageAlternates", () => {
  test("appends a sub-path to every alternate", () => {
    expect(languageAlternates(new URL("https://erfan.dev"), "/case-studies/geoinsight")).toEqual({
      fa: "https://erfan.dev/fa/case-studies/geoinsight",
      en: "https://erfan.dev/en/case-studies/geoinsight",
      "x-default": "https://erfan.dev/fa/case-studies/geoinsight",
    });
  });

  test("lists every locale and points x-default at the default locale", () => {
    expect(languageAlternates(new URL("https://erfan.dev"))).toEqual({
      fa: "https://erfan.dev/fa",
      en: "https://erfan.dev/en",
      "x-default": "https://erfan.dev/fa",
    });
  });
});
