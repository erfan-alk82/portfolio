import { describe, expect, test } from "vitest";
import { THEME_STORAGE_KEY, nextTheme, readStoredTheme, resolveTheme, themeBootScript } from "@/lib/theme";

describe("resolveTheme", () => {
  test("an explicit choice wins over the system preference", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });

  test("without a choice it follows the system", () => {
    expect(resolveTheme(null, true)).toBe("dark");
    expect(resolveTheme(null, false)).toBe("light");
  });
});

describe("readStoredTheme", () => {
  test("accepts only known values", () => {
    expect(readStoredTheme("dark")).toBe("dark");
    expect(readStoredTheme("light")).toBe("light");
    expect(readStoredTheme("sepia")).toBeNull();
    expect(readStoredTheme(null)).toBeNull();
  });
});

describe("nextTheme", () => {
  test("toggles between day and night", () => {
    expect(nextTheme("light")).toBe("dark");
    expect(nextTheme("dark")).toBe("light");
  });
});

describe("themeBootScript", () => {
  test("reads the same storage key the toggle writes", () => {
    expect(themeBootScript).toContain(JSON.stringify(THEME_STORAGE_KEY));
  });

  test("is a self-contained expression that cannot break the page", () => {
    expect(themeBootScript).toMatch(/^\(function\(\)\{try\{/);
    expect(themeBootScript).toMatch(/\}catch\(e\)\{\}\}\)\(\)$/);
    expect(() => new Function(themeBootScript)).not.toThrow();
  });
});
