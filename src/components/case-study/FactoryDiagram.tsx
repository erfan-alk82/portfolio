import type { FactoryDiagramCopy } from "@/content";
import { Rich } from "@/components/ui/Rich";

type Props = {
  copy: FactoryDiagramCopy;
};

const MODULE_ORDER = [
  "machines",
  "production",
  "scheduling",
  "warehouse",
] as const;

/** One application, four named areas around it, and an open "and more". */
export function FactoryDiagram({ copy }: Props) {
  return (
    <figure className="flex flex-col gap-4" data-testid="case-study-diagram">
      <div className="border border-ink p-1.5">
        <div className="graticule border border-rule bg-paper p-4 sm:p-6">
          <h3 className="mb-4 text-sm font-semibold text-contour-strong">
            {copy.title}
          </h3>
          <div className="rounded-sm border-2 border-signal/60 bg-paper-raised p-4 sm:p-6">
            <p className="font-semibold text-ink">
              <Rich text={copy.hub} />
            </p>
            <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {MODULE_ORDER.map((key) => (
                <li
                  key={key}
                  className="rounded-sm border border-rule bg-paper px-3 py-4 text-center text-sm font-semibold text-ink"
                >
                  {copy.modules[key]}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-center text-sm text-ink-soft">
              {copy.modules.more}
            </p>
          </div>
        </div>
      </div>
      <figcaption className="text-sm text-ink-soft">
        <Rich text={copy.caption} />
      </figcaption>
    </figure>
  );
}
