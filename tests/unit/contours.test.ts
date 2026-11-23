import { describe, expect, test } from "vitest";
import { buildContours, heightAt } from "@/lib/contours";

const options = { width: 600, height: 400, cell: 20, levels: 8, seed: 7 };

describe("heightAt", () => {
  test("is deterministic for a given seed", () => {
    expect(heightAt(123, 45, 7)).toBe(heightAt(123, 45, 7));
  });

  test("stays within the unit range", () => {
    for (let x = 0; x < 600; x += 37) {
      for (let y = 0; y < 400; y += 29) {
        const h = heightAt(x, y, 7);
        expect(h).toBeGreaterThanOrEqual(0);
        expect(h).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe("buildContours", () => {
  test("returns one path per requested level", () => {
    expect(buildContours(options)).toHaveLength(8);
  });

  test("produces identical output on repeated runs (safe for SSR)", () => {
    expect(buildContours(options)).toEqual(buildContours(options));
  });

  test("emits only move/line commands that stay inside the canvas", () => {
    const paths = buildContours(options);
    const numbers = paths
      .map((p) => p.d)
      .join(" ")
      .replace(/[ML]/g, " ")
      .trim()
      .split(/[\s,]+/)
      .map(Number);
    expect(numbers.length).toBeGreaterThan(0);
    for (const n of numbers) {
      expect(Number.isFinite(n)).toBe(true);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThanOrEqual(600);
    }
  });

  test("marks every fourth level as an index contour", () => {
    const paths = buildContours(options);
    expect(paths.filter((p) => p.index).map((p) => p.level)).toEqual([3, 7]);
  });
});
