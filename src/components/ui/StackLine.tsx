type Props = {
  label: string;
  stack: readonly string[];
  separator: string;
};

/** "Stack: .NET, Redis, Kafka" with each term isolated; renders nothing for an empty stack. */
export function StackLine({ label, stack, separator }: Props) {
  if (stack.length === 0) return null;
  return (
    <p className="text-sm text-ink-soft">
      <span className="font-semibold text-contour-strong">{label}: </span>
      {stack.map((tech, i) => (
        <span key={tech}>
          <bdi dir="ltr" lang="en">
            {tech}
          </bdi>
          {i < stack.length - 1 ? separator : null}
        </span>
      ))}
    </p>
  );
}
