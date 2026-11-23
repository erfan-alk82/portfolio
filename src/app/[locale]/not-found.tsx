import Link from "next/link";
import { locale as localeParam } from "next/root-params";
import { getCopy } from "@/content";
import { defaultLocale, isLocale } from "@/i18n/config";

export default async function NotFound() {
  const requested = await localeParam();
  const locale = isLocale(requested) ? requested : defaultLocale;
  const { notFound, hero } = getCopy(locale);

  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center gap-6 px-5 sm:px-8">
      <p className="text-sm text-contour-strong">{hero.name}</p>
      <h1 className="display text-section font-extrabold text-ink">{notFound.title}</h1>
      <p className="text-lg text-ink-soft">{notFound.body}</p>
      <Link
        href={`/${locale}`}
        className="inline-flex min-h-12 w-fit items-center rounded-sm bg-ink px-6 font-semibold text-paper transition-colors duration-150 hover:bg-signal-deep"
      >
        {notFound.action}
      </Link>
    </main>
  );
}
