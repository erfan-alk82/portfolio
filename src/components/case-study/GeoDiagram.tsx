import { ArrowDown } from "lucide-react";
import type { GeoDiagramCopy } from "@/content";
import { Rich } from "@/components/ui/Rich";

type Props = {
  copy: GeoDiagramCopy;
};

function Arrow() {
  return (
    <li aria-hidden="true" className="flex justify-center py-1 text-contour">
      <ArrowDown className="size-5" strokeWidth={1.75} />
    </li>
  );
}

const box = "rounded-sm border border-rule bg-paper-raised px-4 py-3";

/**
 * GeoInsight as a top-to-bottom flow. Built from HTML lists (not SVG text) so Persian
 * shapes correctly, screen readers get an ordered sequence, and it reflows on phones.
 */
export function GeoDiagram({ copy }: Props) {
  return (
    <figure className="flex flex-col gap-4" data-testid="case-study-diagram">
      <div className="border border-ink p-1.5">
        <div className="graticule border border-rule bg-paper p-4 sm:p-6">
          <h3 className="mb-4 text-sm font-semibold text-contour-strong">
            {copy.title}
          </h3>
          <ol className="flex flex-col">
            <li className={box}>
              <p className="font-semibold text-ink">
                <Rich text={copy.source} />
              </p>
              <p className="mt-1 text-sm text-ink-soft">
                <Rich text={copy.sourceDetail} />
              </p>
            </li>
            <Arrow />
            <li className="grid gap-3 sm:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
              <p className={`${box} border-signal/60 font-semibold text-ink`}>
                <Rich text={copy.services} />
              </p>
              <p className={`${box} border-dashed text-sm text-ink-soft`}>
                <Rich text={copy.events} />
              </p>
            </li>
            <Arrow />
            <li>
              <ul className="grid gap-3 sm:grid-cols-3">
                {[copy.search, copy.cache, copy.storage].map((store) => (
                  <li key={store} className={`${box} text-sm text-ink`}>
                    <Rich text={store} />
                  </li>
                ))}
              </ul>
            </li>
            <Arrow />
            <li className={`${box} border-hydro/60 font-semibold text-hydro`}>
              <Rich text={copy.users} />
            </li>
          </ol>
        </div>
      </div>
      <figcaption className="text-sm text-ink-soft">
        <Rich text={copy.caption} />
      </figcaption>
    </figure>
  );
}
