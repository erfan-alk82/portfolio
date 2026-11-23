import type { CSSProperties } from "react";
import { jobs, profile, type JobFacts, type JobId } from "@/content";
import type { Locale } from "@/i18n/config";
import { buildContours } from "@/lib/contours";
import { formatYearSpan } from "@/lib/dates";
import { smoothPath, type RoutePoint } from "@/lib/route";
import { timeScale, yearTicks, type TimeScale } from "@/lib/timeline";

type Props = {
  locale: Locale;
  title: string;
  description: string;
  legend: { fullTime: string; partTime: string };
};

/**
 * The hero map is a timeline drawn as terrain: across is time (2021 → today, flowing
 * in reading direction), up is the main route climbing through full-time roles.
 * Part-time roles held in parallel branch off onto their own trails, each running
 * from its start to its end, where a bar marks the end of the trail.
 */

const WIDTH = 640;
const HEIGHT = 480;
const SEED = 20;
const EDGE = 44;
const DOMAIN = { from: "2021-06", to: "2027-01" } as const;

/** Height of the main route at the start of each full-time role, and today. */
const MAIN_ALTITUDE: Partial<Record<JobId, number>> = {
  unitedtech: 404,
  nadinsoft: 300,
  sisootech: 196,
};
const TODAY_ALTITUDE = 124;
/** Each part-time role gets its own lane so parallel roles never merge. */
const LANE: Partial<Record<JobId, number>> = { pantrylab: 326, dinamotor: 394 };
const LANE_RUN_IN = 46;

/** Label placement relative to a point, in reading direction ("after" = towards later time). */
type Side = "after" | "afterAbove" | "beforeAbove";
const LABEL_SIDE: Record<JobId, Side> = {
  unitedtech: "after",
  nadinsoft: "beforeAbove",
  sisootech: "beforeAbove",
  pantrylab: "after",
  dinamotor: "after",
};

const contours = buildContours({
  width: WIDTH,
  height: HEIGHT,
  cell: 16,
  levels: 11,
  seed: SEED,
});

function byStart(a: JobFacts, b: JobFacts): number {
  return a.start.localeCompare(b.start);
}

function interpolate(points: readonly RoutePoint[], x: number): number {
  const sorted = [...points].sort((a, b) => a[0] - b[0]);
  for (let i = 0; i < sorted.length - 1; i++) {
    const [x0, y0] = sorted[i];
    const [x1, y1] = sorted[i + 1];
    if (x >= x0 && x <= x1) return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
  }
  return sorted[sorted.length - 1][1];
}

interface Geometry {
  scale: TimeScale;
  main: { job: JobFacts; at: RoutePoint }[];
  today: RoutePoint;
  trails: { job: JobFacts; d: string; at: RoutePoint; end: RoutePoint }[];
}

function buildGeometry(rtl: boolean): Geometry {
  const scale = timeScale({
    ...DOMAIN,
    x0: rtl ? WIDTH - EDGE : EDGE,
    x1: rtl ? EDGE : WIDTH - EDGE,
  });
  const direction = rtl ? -1 : 1;
  const main = jobs
    .filter((job) => job.employment === "full-time")
    .sort(byStart)
    .map((job) => ({
      job,
      at: [scale.x(job.start), MAIN_ALTITUDE[job.id] ?? 0] as RoutePoint,
    }));
  const today: RoutePoint = [scale.x(profile.asOf), TODAY_ALTITUDE];
  const mainPoints = [...main.map((m) => m.at), today];

  const trails = jobs
    .filter((job) => job.employment === "part-time")
    .map((job) => {
      const lane = LANE[job.id] ?? HEIGHT - EDGE;
      const xs = scale.x(job.start);
      const xe = scale.x(job.end ?? profile.asOf);
      const at: RoutePoint = [xs + direction * LANE_RUN_IN, lane];
      const end: RoutePoint = [xe, lane];
      const d = smoothPath([
        [xs, interpolate(mainPoints, xs)],
        at,
        [(at[0] + xe) / 2, lane + 6],
        end,
      ]);
      return { job, d, at, end };
    });

  return { scale, main, today, trails };
}

const geometry: Record<"ltr" | "rtl", Geometry> = {
  ltr: buildGeometry(false),
  rtl: buildGeometry(true),
};

const ROUTE_MS = 1800;
const ROUTE_DELAY_MS = 250;
const TRAIL_DELAY_MS = 1100;

function RouteLine({
  d,
  id,
  color,
  dash,
  delayMs,
}: {
  d: string;
  id: string;
  color: string;
  dash: string;
  delayMs: number;
}) {
  return (
    <>
      <mask id={id} maskUnits="userSpaceOnUse">
        <path
          d={d}
          pathLength={1}
          className="route-reveal"
          style={{ animationDelay: `${delayMs}ms` }}
          fill="none"
          stroke="white"
          strokeWidth={10}
        />
      </mask>
      <path
        d={d}
        mask={`url(#${id})`}
        fill="none"
        stroke={color}
        strokeWidth={2.5}
        strokeDasharray={dash}
        strokeLinecap="round"
      />
    </>
  );
}

function Marker({
  at,
  fill,
  radius = 6.5,
  delayMs,
}: {
  at: RoutePoint;
  fill: string;
  radius?: number;
  delayMs: number;
}) {
  return (
    <circle
      cx={at[0]}
      cy={at[1]}
      r={radius}
      className="waypoint"
      style={{ animationDelay: `${delayMs}ms` }}
      fill={fill}
      stroke="var(--color-ink)"
      strokeWidth={2.5}
    />
  );
}

function labelTransform(side: Side, rtl: boolean): string {
  const after = rtl ? "calc(-100% - 14px)" : "14px";
  const before = rtl ? "14px" : "calc(-100% - 14px)";
  if (side === "after") return `translate(${after}, 8px)`;
  if (side === "afterAbove") return `translate(${after}, calc(-100% - 8px))`;
  return `translate(${before}, calc(-100% - 8px))`;
}

function percent(value: number, total: number): string {
  return `${(value / total) * 100}%`;
}

function Overlay({ locale, geo }: { locale: Locale; geo: Geometry }) {
  const rtl = locale === "fa";
  const labelled = [
    ...geo.main.map(({ job, at }) => ({ job, at })),
    ...geo.trails.map(({ job, at }) => ({ job, at })),
  ];
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
      dir={rtl ? "rtl" : "ltr"}
    >
      {labelled.map(({ job, at }) => (
        <div
          key={job.id}
          style={
            {
              left: percent(at[0], WIDTH),
              top: percent(at[1], HEIGHT),
              transform: labelTransform(LABEL_SIDE[job.id], rtl),
            } as CSSProperties
          }
          className="absolute flex flex-col bg-paper-raised/85 px-1 text-[0.72rem] leading-tight sm:text-xs"
        >
          <span className="font-bold whitespace-nowrap text-ink">
            {job.company}
          </span>
          <span className="whitespace-nowrap text-ink-soft">
            {formatYearSpan(locale, job.start, job.end)}
          </span>
        </div>
      ))}
      {yearTicks(locale, geo.scale).map((tick) => (
        <span
          key={tick.label}
          style={{
            left: percent(tick.x, WIDTH),
            bottom: "14px",
            transform: "translateX(-50%)",
          }}
          className="absolute hidden text-[0.66rem] text-ink-soft/80 sm:block"
        >
          {tick.label}
        </span>
      ))}
    </div>
  );
}

function MapSvg({
  locale,
  geo,
  title,
  description,
}: {
  locale: Locale;
  geo: Geometry;
  title: string;
  description: string;
}) {
  const current = jobs.find((job) => job.end === null)?.id;
  const mainD = smoothPath([...geo.main.map((m) => m.at), geo.today]);
  const step = ROUTE_MS / (geo.main.length + 1);
  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="absolute inset-0 size-full"
      role="img"
      aria-labelledby={`survey-map-title-${locale}`}
      aria-describedby={`survey-map-desc-${locale}`}
    >
      <title id={`survey-map-title-${locale}`}>{title}</title>
      <desc id={`survey-map-desc-${locale}`}>{description}</desc>
      <g fill="none" strokeLinejoin="round" strokeLinecap="round">
        {contours.map((c) => (
          <path
            key={c.level}
            d={c.d}
            stroke={
              c.index ? "var(--color-contour-strong)" : "var(--color-contour)"
            }
            strokeWidth={c.index ? 1.3 : 0.7}
            strokeOpacity={c.index ? 0.75 : 0.5}
          />
        ))}
      </g>
      <g stroke="var(--color-ink-soft)" strokeOpacity={0.5} strokeWidth={1}>
        {yearTicks(locale, geo.scale).map((tick) => (
          <line
            key={tick.label}
            x1={tick.x}
            x2={tick.x}
            y1={HEIGHT - 10}
            y2={HEIGHT}
          />
        ))}
      </g>
      {geo.trails.map((trail, i) => (
        <g key={trail.job.id}>
          <RouteLine
            d={trail.d}
            id={`trail-${trail.job.id}`}
            color="var(--color-hydro)"
            dash="1 6"
            delayMs={TRAIL_DELAY_MS + i * 300}
          />
          {/* End of the trail: the role finished here. */}
          <line
            x1={trail.end[0]}
            x2={trail.end[0]}
            y1={trail.end[1] - 8}
            y2={trail.end[1] + 8}
            stroke="var(--color-hydro)"
            strokeWidth={3}
            strokeLinecap="round"
            className="waypoint"
            style={{ animationDelay: `${TRAIL_DELAY_MS + ROUTE_MS}ms` }}
          />
          <Marker
            at={trail.at}
            fill="var(--color-hydro)"
            delayMs={TRAIL_DELAY_MS + 400 + i * 300}
          />
        </g>
      ))}
      <RouteLine
        d={mainD}
        id="route-main"
        color="var(--color-signal)"
        dash="7 6"
        delayMs={ROUTE_DELAY_MS}
      />
      {geo.main.map((m, i) => (
        <Marker
          key={m.job.id}
          at={m.at}
          fill="var(--color-paper-raised)"
          delayMs={ROUTE_DELAY_MS + step * (i + 0.6)}
        />
      ))}
      {current ? (
        <Marker
          at={geo.today}
          fill="var(--color-signal)"
          radius={8}
          delayMs={ROUTE_DELAY_MS + ROUTE_MS}
        />
      ) : null}
    </svg>
  );
}

function LegendSwatch({ color, dash }: { color: string; dash: string }) {
  return (
    <svg viewBox="0 0 28 6" className="h-1.5 w-7">
      <path
        d="M1 3h26"
        stroke={color}
        strokeWidth={2.5}
        strokeDasharray={dash}
        strokeLinecap="round"
      />
    </svg>
  );
}

export function SurveyMap({ locale, title, description, legend }: Props) {
  const geo = geometry[locale === "fa" ? "rtl" : "ltr"];
  return (
    <figure className="flex flex-col gap-3">
      <div className="border border-ink p-1.5">
        {/* Coordinates are computed per direction, so the container itself never flips. */}
        <div
          dir="ltr"
          className="graticule relative aspect-[4/3] border border-rule bg-paper-raised"
        >
          <MapSvg
            locale={locale}
            geo={geo}
            title={title}
            description={description}
          />
          <Overlay locale={locale} geo={geo} />
        </div>
      </div>
      <figcaption className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-ink-soft">
        {/* The title repeats the SVG's accessible name, so the caption is visual only. */}
        <span aria-hidden="true">{title}</span>
        <span aria-hidden="true" className="flex items-center gap-2">
          <LegendSwatch color="var(--color-signal)" dash="5 4" />
          {legend.fullTime}
        </span>
        <span aria-hidden="true" className="flex items-center gap-2">
          <LegendSwatch color="var(--color-hydro)" dash="1 5" />
          {legend.partTime}
        </span>
      </figcaption>
    </figure>
  );
}
