"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";

type Props = {
  email: string;
  labels: { copy: string; copied: string; copyFailed: string };
};

type CopyState = "idle" | "copied" | "failed";

/** How long the confirmation or error stays before clearing. */
const RESET_AFTER_MS = 4000;

/**
 * The button label stays constant; the result is announced once through the
 * status region. Clearing it before each attempt lets repeat clicks re-announce.
 */
export function CopyEmailButton({ email, labels }: Props) {
  const [state, setState] = useState<CopyState>("idle");
  const resetTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(resetTimer.current), []);

  const settle = (next: CopyState): void => {
    setState(next);
    resetTimer.current = window.setTimeout(
      () => setState("idle"),
      RESET_AFTER_MS,
    );
  };

  const handleClick = async (): Promise<void> => {
    window.clearTimeout(resetTimer.current);
    setState("idle");
    try {
      if (!navigator.clipboard) throw new Error("Clipboard API unavailable");
      await navigator.clipboard.writeText(email);
      settle("copied");
    } catch {
      // Insecure contexts and denied permissions land here; the message tells the visitor what to do.
      settle("failed");
    }
  };

  const message =
    state === "copied"
      ? labels.copied
      : state === "failed"
        ? labels.copyFailed
        : "";

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleClick}
        data-testid="copy-email"
        className="inline-flex min-h-12 items-center gap-2 rounded-sm bg-on-band px-5 font-semibold text-band transition-colors duration-150 hover:bg-signal-light active:translate-y-px"
      >
        {state === "copied" ? (
          <Check
            aria-hidden="true"
            className="size-4 text-vegetation"
            strokeWidth={2.25}
          />
        ) : (
          <Copy aria-hidden="true" className="size-4" strokeWidth={1.75} />
        )}
        {labels.copy}
      </button>
      <p role="status" className="min-h-6 text-sm text-on-band/80">
        {message}
      </p>
    </div>
  );
}
