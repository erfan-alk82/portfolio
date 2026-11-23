import { describe, expect, test } from "vitest";
import { parseRich, plainText } from "@/lib/rich";

describe("parseRich", () => {
  test("returns a single plain segment when there are no markers", () => {
    expect(parseRich("Plain sentence.")).toEqual([{ text: "Plain sentence.", isolate: false }]);
  });

  test("isolates every [[term]] for bidi-safe rendering", () => {
    expect(parseRich("با [[ASP.NET Core]] و [[C#]] کار می‌کنم.")).toEqual([
      { text: "با ", isolate: false },
      { text: "ASP.NET Core", isolate: true },
      { text: " و ", isolate: false },
      { text: "C#", isolate: true },
      { text: " کار می‌کنم.", isolate: false },
    ]);
  });

  test("handles a marker at the very start and end", () => {
    expect(parseRich("[[.NET]]")).toEqual([{ text: ".NET", isolate: true }]);
  });

  test("leaves unmatched brackets as literal text", () => {
    expect(parseRich("a [[b")).toEqual([{ text: "a [[b", isolate: false }]);
  });
});

describe("plainText", () => {
  test("strips markers for metadata and aria labels", () => {
    expect(plainText("کار با [[Kafka]] و [[Redis]]")).toBe("کار با Kafka و Redis");
  });
});
