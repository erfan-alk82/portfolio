/**
 * Deterministic terrain and contour lines for the hero survey map.
 * Runs on the server at build time; the browser only receives SVG paths.
 */

export interface ContourOptions {
  width: number;
  height: number;
  /** Sampling step in SVG units. Smaller is smoother and heavier. */
  cell: number;
  levels: number;
  seed: number;
}

export interface ContourPath {
  level: number;
  /** Every fourth line is drawn heavier, as on survey maps. */
  index: boolean;
  d: string;
}

type Point = readonly [number, number];
type Segment = readonly [Point, Point];

const INDEX_EVERY = 4;
const NOISE_SCALE = 1 / 170;
const OCTAVES = [
  { frequency: 1, weight: 1 },
  { frequency: 2.1, weight: 0.45 },
  { frequency: 4.3, weight: 0.2 },
] as const;
const CONTRAST = 1.7;

function hash(ix: number, iy: number, seed: number): number {
  let h = (ix * 374761393 + iy * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967295;
}

const smooth = (t: number): number => t * t * (3 - 2 * t);
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

function valueNoise(x: number, y: number, seed: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const sx = smooth(x - ix);
  const sy = smooth(y - iy);
  const top = lerp(hash(ix, iy, seed), hash(ix + 1, iy, seed), sx);
  const bottom = lerp(hash(ix, iy + 1, seed), hash(ix + 1, iy + 1, seed), sx);
  return lerp(top, bottom, sy);
}

/** Terrain height in [0, 1] at an SVG coordinate. */
export function heightAt(x: number, y: number, seed: number): number {
  let total = 0;
  let weights = 0;
  for (const { frequency, weight } of OCTAVES) {
    total += weight * valueNoise(x * NOISE_SCALE * frequency, y * NOISE_SCALE * frequency, seed);
    weights += weight;
  }
  const stretched = (total / weights - 0.5) * CONTRAST + 0.5;
  return Math.min(1, Math.max(0, stretched));
}

function sampleGrid({ width, height, cell, seed }: ContourOptions): {
  xs: number[];
  ys: number[];
  values: number[][];
} {
  const xs = Array.from({ length: Math.ceil(width / cell) + 1 }, (_, i) => Math.min(i * cell, width));
  const ys = Array.from({ length: Math.ceil(height / cell) + 1 }, (_, j) => Math.min(j * cell, height));
  const values = ys.map((y) => xs.map((x) => heightAt(x, y, seed)));
  return { xs, ys, values };
}

function crossing(a: Point, b: Point, va: number, vb: number, threshold: number): Point {
  const t = va === vb ? 0.5 : (threshold - va) / (vb - va);
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
}

/** Marching squares for a single cell. Saddle cases are split consistently. */
function cellSegments(corners: readonly Point[], values: readonly number[], threshold: number): Segment[] {
  const edges: Point[] = [];
  for (let k = 0; k < 4; k++) {
    const next = (k + 1) % 4;
    if (values[k] >= threshold !== values[next] >= threshold) {
      edges.push(crossing(corners[k], corners[next], values[k], values[next], threshold));
    }
  }
  if (edges.length === 2) return [[edges[0], edges[1]]];
  if (edges.length === 4) return [[edges[0], edges[1]], [edges[2], edges[3]]];
  return [];
}

function segmentsAt(grid: ReturnType<typeof sampleGrid>, threshold: number): Segment[] {
  const { xs, ys, values } = grid;
  const segments: Segment[] = [];
  for (let j = 0; j < ys.length - 1; j++) {
    for (let i = 0; i < xs.length - 1; i++) {
      const corners: Point[] = [
        [xs[i], ys[j]],
        [xs[i + 1], ys[j]],
        [xs[i + 1], ys[j + 1]],
        [xs[i], ys[j + 1]],
      ];
      const v = [values[j][i], values[j][i + 1], values[j + 1][i + 1], values[j + 1][i]];
      segments.push(...cellSegments(corners, v, threshold));
    }
  }
  return segments;
}

/** Quantised so a crossing computed from either neighbouring cell maps to the same key. */
const key = ([x, y]: Point): string => `${Math.round(x * 100)},${Math.round(y * 100)}`;

/** Joins touching segments into polylines so the SVG stays compact. */
function stitch(segments: Segment[]): Point[][] {
  const byEnd = new Map<string, number[]>();
  segments.forEach(([a, b], index) => {
    for (const p of [a, b]) byEnd.set(key(p), [...(byEnd.get(key(p)) ?? []), index]);
  });
  const used = new Set<number>();
  const lines: Point[][] = [];

  const extend = (line: Point[]): void => {
    for (;;) {
      const tail = line[line.length - 1];
      const nextIndex = (byEnd.get(key(tail)) ?? []).find((i) => !used.has(i));
      if (nextIndex === undefined) return;
      used.add(nextIndex);
      const [a, b] = segments[nextIndex];
      line.push(key(a) === key(tail) ? b : a);
    }
  };

  segments.forEach(([a, b], index) => {
    if (used.has(index)) return;
    used.add(index);
    const forward: Point[] = [a, b];
    extend(forward);
    const backward: Point[] = [a];
    extend(backward);
    lines.push([...backward.slice(1).reverse(), ...forward]);
  });
  return lines;
}

const fmt = (n: number): string => String(Math.round(n * 10) / 10);

function toPath(lines: Point[][]): string {
  return lines
    .filter((line) => line.length > 2)
    .map((line) => line.map(([x, y], i) => `${i === 0 ? "M" : "L"}${fmt(x)} ${fmt(y)}`).join(""))
    .join("");
}

export function buildContours(options: ContourOptions): ContourPath[] {
  const grid = sampleGrid(options);
  return Array.from({ length: options.levels }, (_, level) => {
    const threshold = (level + 1) / (options.levels + 1);
    return {
      level,
      index: (level + 1) % INDEX_EVERY === 0,
      d: toPath(stitch(segmentsAt(grid, threshold))),
    };
  });
}
