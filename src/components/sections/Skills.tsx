import type { ReactNode } from "react";
import { skillGroupOrder, type SiteCopy, type SkillGroupId } from "@/content";
import type { Locale } from "@/i18n/config";
import { Rich } from "@/components/ui/Rich";
import { SectionHeading } from "@/components/ui/SectionHeading";

type Props = {
  locale: Locale;
  copy: SiteCopy;
};

/**
 * Each group gets a symbol from a map legend: roads, tracks, paths, filled and
 * outlined areas, a boundary. They distinguish groups without implying ratings.
 */
function LegendSymbol({ group }: { group: SkillGroupId }) {
  const common = {
    fill: "none",
    strokeWidth: 2.5,
    strokeLinecap: "round" as const,
  };
  const symbols: Record<SkillGroupId, ReactNode> = {
    backend: (
      <path d="M2 8h36" stroke="var(--color-ink)" {...common} strokeWidth={4} />
    ),
    frontend: (
      <path
        d="M2 8h36"
        stroke="var(--color-hydro)"
        {...common}
        strokeDasharray="7 4"
      />
    ),
    mobile: (
      <path
        d="M2 8h36"
        stroke="var(--color-vegetation)"
        {...common}
        strokeDasharray="0.5 5"
        strokeWidth={3}
      />
    ),
    data: (
      <rect
        x="8"
        y="1"
        width="24"
        height="14"
        fill="var(--color-hydro)"
        fillOpacity={0.85}
      />
    ),
    devops: (
      <rect
        x="9"
        y="2"
        width="22"
        height="12"
        stroke="var(--color-contour-strong)"
        fill="none"
        strokeWidth={2}
      />
    ),
    architecture: (
      <g stroke="var(--color-signal)" {...common} strokeWidth={1.5}>
        <path d="M2 5h36" />
        <path d="M2 11h36" strokeDasharray="5 3" />
      </g>
    ),
  };
  return (
    <svg aria-hidden="true" viewBox="0 0 40 16" className="h-4 w-10 shrink-0">
      {symbols[group]}
    </svg>
  );
}

export function Skills({ locale, copy }: Props) {
  const { skills } = copy;
  const separator = locale === "fa" ? "، " : ", ";

  return (
    <section
      id="skills"
      aria-labelledby="skills-title"
      className="border-t border-ink py-20 lg:py-28"
    >
      <SectionHeading id="skills-title" intro={skills.intro}>
        {skills.title}
      </SectionHeading>
      <ul className="mt-14 grid gap-x-12 sm:grid-cols-2 lg:grid-cols-3">
        {skillGroupOrder.map((id) => {
          const group = skills.groups[id];
          return (
            <li key={id} className="border-t border-rule py-7">
              <h3 className="flex items-center gap-4 text-lg font-bold text-ink">
                <LegendSymbol group={id} />
                <span>
                  <Rich text={group.label} />
                </span>
              </h3>
              <p className="mt-3 text-base text-ink-soft">
                {group.items.map((item, i) => (
                  <span key={item}>
                    <Rich text={item} />
                    {i < group.items.length - 1 ? separator : null}
                  </span>
                ))}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
