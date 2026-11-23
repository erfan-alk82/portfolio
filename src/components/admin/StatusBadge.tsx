type Props = {
  status: "draft" | "published" | "missing";
};

const LABEL = { draft: "Draft", published: "Published", missing: "Not written" } as const;

const DOT = { draft: "bg-contour", published: "bg-vegetation", missing: "bg-rule" } as const;

/** The word carries the state; the dot only reinforces it. */
export function StatusBadge({ status }: Props) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-ink">
      <span aria-hidden="true" className={`size-2 rounded-full ${DOT[status]}`} />
      {LABEL[status]}
    </span>
  );
}
