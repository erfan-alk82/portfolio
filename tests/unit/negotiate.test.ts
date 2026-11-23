import { describe, expect, test } from "vitest";
import { pickLocale } from "@/i18n/negotiate";

describe("pickLocale", () => {
  test("prefers a valid locale cookie over the Accept-Language header", () => {
    expect(pickLocale({ cookie: "en", acceptLanguage: "fa-IR,fa;q=0.9" })).toBe("en");
  });

  test("ignores an unsupported cookie value", () => {
    expect(pickLocale({ cookie: "de", acceptLanguage: "en-US,en;q=0.9" })).toBe("en");
  });

  test("matches a regional Accept-Language tag to its base language", () => {
    expect(pickLocale({ acceptLanguage: "fa-IR" })).toBe("fa");
    expect(pickLocale({ acceptLanguage: "en-GB" })).toBe("en");
  });

  test("respects q-values rather than header order", () => {
    expect(pickLocale({ acceptLanguage: "en;q=0.4, fa;q=0.8" })).toBe("fa");
  });

  test("skips unsupported languages and takes the next supported one", () => {
    expect(pickLocale({ acceptLanguage: "de-DE, en;q=0.5" })).toBe("en");
  });

  test("falls back to Persian when nothing usable is sent", () => {
    expect(pickLocale({})).toBe("fa");
    expect(pickLocale({ acceptLanguage: "de, fr;q=0.8" })).toBe("fa");
    expect(pickLocale({ acceptLanguage: "*" })).toBe("fa");
  });

  test("ignores entries with q=0", () => {
    expect(pickLocale({ acceptLanguage: "en;q=0, de" })).toBe("fa");
  });
});
