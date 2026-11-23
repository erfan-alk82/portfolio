import type { Locale } from "@/i18n/config";
import type { NavSectionId, SiteCopy } from "@/content";
import { LanguageSwitch } from "./LanguageSwitch";

interface SiteHeaderProps {
  locale: Locale;
  copy: SiteCopy;
}

const NAV_ORDER: readonly NavSectionId[] = [
  "about",
  "experience",
  "skills",
  "projects",
  "contact",
];

export function SiteHeader({ locale, copy }: SiteHeaderProps) {
  const other: Locale = locale === "fa" ? "en" : "fa";
  const links = NAV_ORDER.map((id) => (
    <li key={id} className="shrink-0">
      <a
        href={`#${id}`}
        className="inline-flex min-h-11 items-center px-1 text-sm font-medium text-ink-soft transition-colors duration-150 hover:text-signal-deep"
      >
        {copy.nav.sections[id]}
      </a>
    </li>
  ));

  return (
    <header className="sticky top-0 z-30 border-b border-rule bg-paper">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-3 focus:z-40 focus:bg-ink focus:px-4 focus:py-2 focus:text-paper"
      >
        {copy.nav.skip}
      </a>
      <div className="mx-auto flex h-16 max-w-[90rem] items-center justify-between gap-6 px-5 sm:px-8 lg:px-12">
        <a
          href="#top"
          className="display text-lg font-extrabold whitespace-nowrap text-ink"
        >
          {copy.hero.name}
        </a>
        <nav aria-label={copy.nav.label} className="hidden md:block">
          <ul className="flex items-center gap-6">{links}</ul>
        </nav>
        <LanguageSwitch
          target={other}
          label={copy.language.switchTo}
          hint={copy.language.switchLabel}
        />
      </div>
      <nav
        aria-label={copy.nav.label}
        className="border-t border-rule/70 md:hidden"
      >
        <ul className="flex gap-5 overflow-x-auto px-5 sm:px-8 [scrollbar-width:none] [&_a:focus-visible]:outline-offset-[-3px]">
          {links}
        </ul>
      </nav>
    </header>
  );
}
