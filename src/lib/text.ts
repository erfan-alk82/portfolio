/**
 * Text length as a reader (and a search result snippet) sees it: grapheme
 * clusters, not UTF-16 code units, and without the invisible formatting
 * characters Persian text relies on (ZWNJ in compounds such as «می‌سازم»,
 * ZWSP, and the LRM/RLM direction marks).
 */

// ZWJ (U+200D) is kept: it joins emoji into a single grapheme.
const INVISIBLE_CODES = [0x200b, 0x200c, 0x200e, 0x200f, 0x2060, 0xfeff];
const INVISIBLE = new RegExp(`[${INVISIBLE_CODES.map((code) => String.fromCharCode(code)).join("")}]`, "g");

const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });

function graphemes(value: string): string[] {
  return Array.from(segmenter.segment(value), (part) => part.segment);
}

/** Invisible characters removed, whitespace runs collapsed to one space, ends trimmed. */
export function normalizeForLength(value: string): string {
  return value.replace(INVISIBLE, "").replace(/\s+/g, " ").trim();
}

export function displayLength(value: string): number {
  return graphemes(normalizeForLength(value)).length;
}

/** At most `max` graphemes; longer text ends with an ellipsis inside that budget. */
export function truncateGraphemes(value: string, max: number): string {
  const parts = graphemes(value);
  if (parts.length <= max) return value;
  return `${parts.slice(0, max - 1).join("").trimEnd()}…`;
}
