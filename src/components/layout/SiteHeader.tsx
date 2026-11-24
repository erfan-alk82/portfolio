import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { NavSectionId, SiteCopy } from "@/content";
import { LanguageSwitch } from "./LanguageSwitch";
import { ThemeToggle } from "./ThemeToggle";

interface SiteHeaderProps {
  locale: Locale;
  copy: SiteCopy;
  /** Path after the locale for sub-pages ("/case-studies/x"). Section links then point home. */
  path?: string;
}

const NAV_ORDER: readonly NavSectionId[] = [
  "about",
  "experience",
  "skills",
  "projects",
  "contact",
];

export function SiteHeader({ locale, copy, path = "" }: SiteHeaderProps) {
  const other: Locale = locale === "fa" ? "en" : "fa";
  // On the home page sections are same-page anchors; elsewhere they lead back home.
  const home = path ? `/${locale}` : "";
  const itemClass =
    "inline-flex min-h-11 items-center px-1 text-sm font-medium text-ink-soft transition-colors duration-150 hover:text-signal-deep";
  const onBlog = path === "/blog" || path.startsWith("/blog/");
  const links = [
    ...NAV_ORDER.map((id) => (
      <li key={id} className="shrink-0">
        <a href={`${home}#${id}`} className={itemClass}>
          {copy.nav.sections[id]}
        </a>
      </li>
    )),
    // The blog is a page of its own, not a section of the home page.
    <li key="blog" className="shrink-0">
      <Link
        href={`/${locale}/blog`}
        aria-current={onBlog ? "page" : undefined}
        className={`${itemClass} aria-[current=page]:text-ink aria-[current=page]:underline aria-[current=page]:decoration-signal aria-[current=page]:decoration-2 aria-[current=page]:underline-offset-8`}
      >
        {copy.nav.blog}
      </Link>
    </li>,
  ];

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
        {/* One-row menu only from lg: below that six links do not fit beside the name and controls. */}
        <nav aria-label={copy.nav.label} className="hidden lg:block">
          <ul className="flex items-center gap-6">{links}</ul>
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle label={copy.theme.label} />
          <LanguageSwitch
            target={other}
            label={copy.language.switchTo}
            hint={copy.language.switchLabel}
            path={path}
          />
        </div>
      </div>
      <nav
        aria-label={copy.nav.label}
        className="border-t border-rule/70 lg:hidden"
      >
        <ul className="flex gap-5 overflow-x-auto px-5 sm:px-8 [scrollbar-width:none] [&_a:focus-visible]:outline-offset-[-3px]">
          {links}
        </ul>
      </nav>
    </header>
  );
}
