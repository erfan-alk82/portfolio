import { describe, expect, test } from "vitest";
import { formatPeriod, formatYear, formatYearSpan, jalaliYear } from "@/lib/dates";

describe("formatYearSpan", () => {
  test("gives compact year ranges for map labels", () => {
    expect(formatYearSpan("en", "2021-08", "2023-05")).toBe("2021–2023");
    expect(formatYearSpan("fa", "2021-08", "2023-05")).toBe("۱۴۰۰–۱۴۰۲");
  });

  test("marks open-ended roles", () => {
    expect(formatYearSpan("en", "2025-08", null)).toBe("2025–Present");
    expect(formatYearSpan("fa", "2025-08", null)).toBe("۱۴۰۴–اکنون");
  });
});

describe("formatYear", () => {
  test("uses the Gregorian year in English", () => {
    expect(formatYear("en", "2022-07")).toBe("2022");
  });

  test("uses the Solar Hijri year in Persian digits", () => {
    expect(formatYear("fa", "2022-07")).toBe("۱۴۰۱");
  });
});

describe("jalaliYear", () => {
  test("converts months that sit inside a single Solar Hijri year", () => {
    expect(jalaliYear("2025-09")).toBe(1404);
    expect(jalaliYear("2024-07")).toBe(1403);
    expect(jalaliYear("2022-07")).toBe(1401);
    expect(jalaliYear("2020-07")).toBe(1399);
    expect(jalaliYear("2020-01")).toBe(1398);
    expect(jalaliYear("2025-01")).toBe(1403);
  });

  test("refuses months that straddle Nowruz instead of guessing", () => {
    expect(() => jalaliYear("2025-03")).toThrow(/straddles/);
  });

  test("rejects malformed input", () => {
    expect(() => jalaliYear("2025-13")).toThrow();
    expect(() => jalaliYear("Sept 2025")).toThrow();
  });
});

describe("formatPeriod", () => {
  test("English shows abbreviated Gregorian months", () => {
    expect(formatPeriod("en", "2024-07", "2025-09")).toBe("Jul 2024 – Sep 2025");
  });

  test("English marks an open period as present", () => {
    expect(formatPeriod("en", "2025-09", null)).toBe("Sep 2025 – Present");
  });

  test("Persian shows Solar Hijri years in Persian digits", () => {
    expect(formatPeriod("fa", "2022-07", "2024-07")).toBe("۱۴۰۱ – ۱۴۰۳");
  });

  test("Persian collapses a period inside one Solar Hijri year to that year", () => {
    expect(formatPeriod("fa", "2023-06", "2023-09")).toBe("۱۴۰۲");
  });

  test("Persian marks an open period with اکنون", () => {
    expect(formatPeriod("fa", "2025-09", null)).toBe("۱۴۰۴ – اکنون");
  });
});
