import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

/**
 * The Night map palette is declared twice in globals.css: once for an explicit
 * choice (data-theme="dark") and once for the system preference. CSS cannot share
 * one block across both, so this test keeps the two copies identical.
 */
const css = readFileSync(join(process.cwd(), "src", "app", "globals.css"), "utf8");

function declarations(selector: string): string[] {
  const start = css.indexOf(`${selector} {`);
  expect(start, `${selector} block not found`).toBeGreaterThan(-1);
  const body = css.slice(start + selector.length + 2, css.indexOf("}", start));
  return body
    .split(";")
    .map((line) => line.trim())
    .filter(Boolean)
    .sort();
}

describe("Night map palette", () => {
  test("explicit and system dark blocks declare the same values", () => {
    const explicit = declarations(':root[data-theme="dark"]');
    const system = declarations(':root:not([data-theme="light"])');
    expect(explicit.length).toBeGreaterThan(10);
    expect(system).toEqual(explicit);
  });

  test("every light colour token is overridden at night except the data ramp", () => {
    const night = declarations(':root[data-theme="dark"]').map((d) => d.split(":")[0]);
    const lightTokens = [...css.matchAll(/^\s*(--color-[a-z-]+):/gm)]
      .map((m) => m[1])
      .filter((token) => !token.startsWith("--color-ndvi"));
    for (const token of new Set(lightTokens)) expect(night, token).toContain(token);
  });
});
