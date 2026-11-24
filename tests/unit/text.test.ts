import { describe, expect, test } from "vitest";
import { displayLength, truncateGraphemes } from "@/lib/text";

const ZWNJ = String.fromCharCode(0x200c);
const ZWSP = String.fromCharCode(0x200b);
const LRM = String.fromCharCode(0x200e);
const RLM = String.fromCharCode(0x200f);

describe("displayLength", () => {
  test("counts plain ASCII characters", () => {
    expect(displayLength("hello")).toBe(5);
  });

  test("ignores zero-width non-joiners in Persian compounds", () => {
    expect(displayLength(`می${ZWNJ}سازم`)).toBe(displayLength("میسازم"));
    expect(displayLength(`می${ZWNJ}سازم`)).toBe(6);
  });

  test("ignores zero-width spaces and direction marks", () => {
    expect(displayLength(`a${ZWSP}b${LRM}c${RLM}`)).toBe(3);
  });

  test("counts a grapheme cluster once", () => {
    expect(displayLength("👩‍💻")).toBe(1);
    expect(displayLength("é")).toBe(1);
  });

  test("collapses runs of whitespace and trims", () => {
    expect(displayLength("  a \n\n  b\t ")).toBe(3);
  });
});

describe("truncateGraphemes", () => {
  test("keeps short text unchanged", () => {
    expect(truncateGraphemes("short", 10)).toBe("short");
  });

  test("cuts long text to the limit, ending with an ellipsis", () => {
    const result = truncateGraphemes("a".repeat(200), 110);
    expect([...result]).toHaveLength(110);
    expect(result.endsWith("…")).toBe(true);
  });
});
