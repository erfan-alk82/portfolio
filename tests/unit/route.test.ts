import { describe, expect, test } from "vitest";
import { smoothPath } from "@/lib/route";

describe("smoothPath", () => {
  test("starts at the first point and ends at the last", () => {
    const d = smoothPath([
      [0, 100],
      [50, 50],
      [100, 0],
    ]);
    expect(d.startsWith("M0 100")).toBe(true);
    expect(d.endsWith("100 0")).toBe(true);
  });

  test("emits one cubic segment per pair of points", () => {
    const d = smoothPath([
      [0, 0],
      [10, 10],
      [20, 0],
      [30, 10],
    ]);
    expect(d.match(/C/g)).toHaveLength(3);
  });

  test("rejects fewer than two points", () => {
    expect(() => smoothPath([[0, 0]])).toThrow();
  });
});
