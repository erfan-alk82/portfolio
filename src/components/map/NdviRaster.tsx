import type { NdviClass } from "@/content";
import { heightAt } from "@/lib/contours";

type Props = {
  caption: string;
  classes: Record<NdviClass, string>;
};

const COLS = 36;
const ROWS = 16;
const CELL = 10;
const SEED = 41;
/** Scales raster cells to terrain coordinates so the pattern reads as fields, not noise. */
const TERRAIN_SCALE = 14;

const CLASS_ORDER: readonly NdviClass[] = [
  "bare",
  "sparse",
  "moderate",
  "healthy",
  "dense",
];
const UPPER_BOUNDS = [0.32, 0.46, 0.58, 0.72, Number.POSITIVE_INFINITY];

function classify(value: number): NdviClass {
  return CLASS_ORDER[UPPER_BOUNDS.findIndex((bound) => value < bound)];
}

/** One compact path per class instead of hundreds of <rect>s. */
function buildRaster(): Record<NdviClass, string> {
  const paths: Record<NdviClass, string[]> = {
    bare: [],
    sparse: [],
    moderate: [],
    healthy: [],
    dense: [],
  };
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const value = heightAt(col * TERRAIN_SCALE, row * TERRAIN_SCALE, SEED);
      paths[classify(value)].push(
        `M${col * CELL} ${row * CELL}h${CELL}v${CELL}h-${CELL}z`,
      );
    }
  }
  return Object.fromEntries(
    CLASS_ORDER.map((c) => [c, paths[c].join("")]),
  ) as Record<NdviClass, string>;
}

const raster = buildRaster();

export function NdviRaster({ caption, classes }: Props) {
  return (
    <figure className="flex flex-col gap-4">
      <div className="border border-ink p-1.5">
        <svg
          viewBox={`0 0 ${COLS * CELL} ${ROWS * CELL}`}
          className="block h-auto w-full"
          aria-hidden="true"
          shapeRendering="crispEdges"
        >
          {CLASS_ORDER.map((c) => (
            <path key={c} d={raster[c]} fill={`var(--color-ndvi-${c})`} />
          ))}
          {/* A surveyed parcel boundary over the raster. */}
          <path
            d="M70 30L150 22L176 74L132 118L64 104Z"
            fill="none"
            stroke="var(--color-paper-raised)"
            strokeWidth={2}
            strokeDasharray="5 3"
          />
        </svg>
      </div>
      <ul
        aria-hidden="true"
        className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-soft"
      >
        {CLASS_ORDER.map((c) => (
          <li key={c} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="size-3 border border-ink/30"
              style={{ background: `var(--color-ndvi-${c})` }}
            />
            {classes[c]}
          </li>
        ))}
      </ul>
      <figcaption className="text-sm text-ink-soft">{caption}</figcaption>
    </figure>
  );
}
