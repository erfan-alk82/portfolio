import { describe, expect, test } from "vitest";
import { monthValue, timeScale, yearTicks } from "@/lib/timeline";

const scale = timeScale({ from: "2021-06", to: "2027-01", x0: 40, x1: 600 });

describe("monthValue", () => {
  test("counts months from year zero", () => {
    expect(monthValue("2021-01")).toBe(2021 * 12);
    expect(monthValue("2021-08") - monthValue("2021-01")).toBe(7);
  });
});

describe("timeScale", () => {
  test("maps the domain edges to the range edges", () => {
    expect(scale.x("2021-06")).toBe(40);
    expect(scale.x("2027-01")).toBe(600);
  });

  test("is linear in between", () => {
    const mid = (monthValue("2021-06") + monthValue("2027-01")) / 2;
    expect(scale.xAt(mid)).toBeCloseTo(320);
  });

  test("keeps overlapping roles overlapping", () => {
    // Dinamotor (2023-10 – 2026-11) and PantryLab (2024-09 – 2026-10) run in parallel.
    expect(scale.x("2024-09")).toBeGreaterThan(scale.x("2023-10"));
    expect(scale.x("2026-10")).toBeLessThan(scale.x("2026-11"));
  });
});

describe("yearTicks", () => {
  test("English ticks fall on 1 January with Gregorian labels", () => {
    const ticks = yearTicks("en", scale);
    expect(ticks.map((t) => t.label)).toEqual(["2022", "2023", "2024", "2025", "2026", "2027"]);
    expect(ticks[0].x).toBeCloseTo(scale.x("2022-01"));
  });

  test("Persian ticks fall on Nowruz with Solar Hijri labels in Persian digits", () => {
    const ticks = yearTicks("fa", scale);
    expect(ticks[0].label).toBe("۱۴۰۱");
    expect(ticks[0].x).toBeGreaterThan(scale.x("2022-03"));
    expect(ticks[0].x).toBeLessThan(scale.x("2022-04"));
  });
});
