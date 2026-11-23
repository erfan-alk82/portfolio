type Props = {
  label: string;
  value: string;
  /** "paper" on the light page, "band" on the dark contact band. */
  tone?: "paper" | "band";
};

/** "● Open to remote roles, project-based work and freelance": a status, not a call to action. */
export function Availability({ label, value, tone = "paper" }: Props) {
  const text = tone === "band" ? "text-paper/85" : "text-ink-soft";
  return (
    <p
      className={`flex items-center gap-2.5 text-sm ${text}`}
      data-testid="availability"
    >
      <span
        aria-hidden="true"
        className="size-2.5 shrink-0 rounded-full bg-vegetation ring-4 ring-vegetation/20"
      />
      <span className="sr-only">{label}: </span>
      <span>{value}</span>
    </p>
  );
}
