import { Check, CircleAlert, TriangleAlert } from "lucide-react";
import type { SeoCheck } from "@/lib/blog/seo-checks";

type Props = {
  id: string;
  checks: readonly SeoCheck[];
};

function Icon({ check }: { check: SeoCheck }) {
  if (check.passed) return <Check aria-hidden="true" className="size-4 shrink-0 text-vegetation" strokeWidth={2} />;
  if (check.severity === "error") {
    return <CircleAlert aria-hidden="true" className="size-4 shrink-0 text-signal-deep" strokeWidth={2} />;
  }
  return <TriangleAlert aria-hidden="true" className="size-4 shrink-0 text-contour-strong" strokeWidth={2} />;
}

/** Live SEO checklist. The state is spelled out for screen readers, not only shown by colour. */
export function SeoChecklist({ id, checks }: Props) {
  const errors = checks.filter((c) => !c.passed && c.severity === "error").length;
  const warnings = checks.filter((c) => !c.passed && c.severity === "warning").length;
  const summary =
    errors > 0
      ? `${errors} ${errors === 1 ? "error blocks" : "errors block"} publishing`
      : warnings > 0
        ? `${warnings} ${warnings === 1 ? "warning" : "warnings"}`
        : "Ready to publish";

  return (
    <section aria-labelledby={`${id}-heading`} className="flex flex-col gap-3 border-t border-rule pt-4">
      <h3 id={`${id}-heading`} className="flex flex-wrap items-baseline justify-between gap-2 text-sm font-semibold text-ink">
        SEO checklist
        <span className="font-normal text-ink-soft">{summary}</span>
      </h3>
      <ul className="flex flex-col gap-2 text-sm">
        {checks.map((check) => {
          const state = check.passed ? "Passed" : check.severity === "error" ? "Error" : "Warning";
          return (
            <li key={check.id} data-check={check.id} data-state={state.toLowerCase()} className="flex items-start gap-2">
              <span className="mt-1">
                <Icon check={check} />
              </span>
              <span className={check.passed ? "text-ink-soft" : "text-ink"}>
                {check.passed ? (
                  <span className="sr-only">{state}: </span>
                ) : (
                  <span className="font-semibold">{state}: </span>
                )}
                {check.message}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
