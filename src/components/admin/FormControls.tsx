"use client";

import type { MouseEvent, ReactNode } from "react";

type SubmitProps = {
  children: ReactNode;
  className: string;
  /** Busy or not allowed right now; the button stays focusable (aria-disabled). */
  unavailable: boolean;
  name?: string;
  value?: string;
  describedBy?: string;
};

/**
 * A submit button that never uses the disabled attribute: a disabled button
 * drops keyboard focus mid-action. aria-disabled announces the state and the
 * click is cancelled, which also prevents double submits.
 */
export function SubmitButton({ children, className, unavailable, name, value, describedBy }: SubmitProps) {
  const block = (event: MouseEvent<HTMLButtonElement>): void => {
    if (unavailable) event.preventDefault();
  };
  return (
    <button
      type="submit"
      name={name}
      value={value}
      aria-disabled={unavailable || undefined}
      aria-describedby={describedBy}
      onClick={block}
      className={className}
    >
      {children}
    </button>
  );
}

/** A field error, announced as soon as it appears. */
export function FieldError({ id, message }: { id: string; message: string | undefined }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="text-sm font-semibold text-signal-deep">
      {message}
    </p>
  );
}

export function describedBy(...ids: (string | false | null | undefined)[]): string | undefined {
  const list = ids.filter(Boolean).join(" ");
  return list || undefined;
}
