import type { ReactNode } from "react";

interface SectionHeadingProps {
  id: string;
  children: ReactNode;
  intro?: ReactNode;
}

export function SectionHeading({ id, children, intro }: SectionHeadingProps) {
  return (
    <div className="flex flex-col gap-3">
      <h2 id={id} className="display text-section font-extrabold text-ink">
        {children}
      </h2>
      {intro ? (
        <p className="measure text-base text-ink-soft">{intro}</p>
      ) : null}
    </div>
  );
}
