export type RoutePoint = readonly [number, number];

/** How strongly the curve bends toward neighbouring points (Catmull-Rom tension). */
const TENSION = 1 / 6;

const round = (n: number): number => Math.round(n * 10) / 10;

/** A smooth SVG path (Catmull-Rom converted to cubic Béziers) through every point. */
export function smoothPath(points: readonly RoutePoint[]): string {
  if (points.length < 2) throw new Error("A route needs at least two points");

  const [first] = points;
  const commands = [`M${round(first[0])} ${round(first[1])}`];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    const c1x = p1[0] + (p2[0] - p0[0]) * TENSION;
    const c1y = p1[1] + (p2[1] - p0[1]) * TENSION;
    const c2x = p2[0] - (p3[0] - p1[0]) * TENSION;
    const c2y = p2[1] - (p3[1] - p1[1]) * TENSION;
    commands.push(
      `C${round(c1x)} ${round(c1y)} ${round(c2x)} ${round(c2y)} ${round(p2[0])} ${round(p2[1])}`,
    );
  }
  return commands.join("");
}
