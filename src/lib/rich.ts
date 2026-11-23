/**
 * Content strings mark Latin-script terms as [[term]] so they can be
 * rendered inside a bidi isolate. Without it, terms such as ".NET" or "C#"
 * reorder their punctuation inside Persian sentences.
 */

export interface RichSegment {
  text: string;
  isolate: boolean;
}

const MARKER = /\[\[([^\]]+)\]\]/g;

export function parseRich(source: string): RichSegment[] {
  const segments: RichSegment[] = [];
  let cursor = 0;
  for (const match of source.matchAll(MARKER)) {
    const start = match.index;
    if (start > cursor) segments.push({ text: source.slice(cursor, start), isolate: false });
    segments.push({ text: match[1], isolate: true });
    cursor = start + match[0].length;
  }
  if (cursor < source.length) segments.push({ text: source.slice(cursor), isolate: false });
  return segments;
}

export function plainText(source: string): string {
  return source.replace(MARKER, "$1");
}
