"use client";

import type { MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { Languages } from "lucide-react";
import type { Locale } from "@/i18n/config";

type Props = {
  target: Locale;
  label: string;
  hint: string;
};

/** Share of the viewport height a section's top must pass to count as "current". */
const READING_LINE = 0.35;

function sectionInView(): string {
  let current = "";
  for (const section of document.querySelectorAll<HTMLElement>(
    "main section[id]",
  )) {
    if (
      section.getBoundingClientRect().top <=
      window.innerHeight * READING_LINE
    )
      current = section.id;
  }
  return current ? `#${current}` : "";
}

/**
 * Plain link to the other language, so it works without JavaScript.
 * With JavaScript it carries the visitor's current section across.
 */
export function LanguageSwitch({ target, label, hint }: Props) {
  const router = useRouter();
  const href = `/${target}`;

  const handleClick = (event: MouseEvent<HTMLAnchorElement>): void => {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
      return;
    event.preventDefault();
    router.push(`${href}${window.location.hash || sectionInView()}`);
  };

  return (
    <a
      href={href}
      hrefLang={target}
      title={hint}
      onClick={handleClick}
      data-testid="language-switch"
      className="inline-flex min-h-11 items-center gap-2 rounded-sm border border-ink/25 px-3 text-sm font-semibold text-ink transition-colors duration-150 hover:border-signal hover:text-signal-deep"
    >
      <Languages aria-hidden="true" className="size-4" strokeWidth={1.75} />
      <span lang={target}>{label}</span>
    </a>
  );
}
