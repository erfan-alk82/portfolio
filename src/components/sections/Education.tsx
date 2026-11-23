import { profile, type SiteCopy } from "@/content";
import type { Locale } from "@/i18n/config";
import { formatPeriod } from "@/lib/dates";

type Props = {
  locale: Locale;
  copy: SiteCopy;
};

export function Education({ locale, copy }: Props) {
  const { education } = copy;
  const { start, end } = profile.education;

  return (
    <section
      id="education"
      aria-labelledby="education-title"
      className="border-t border-ink py-16 lg:py-20"
    >
      <div className="grid gap-6 lg:grid-cols-12 lg:gap-12">
        <h2
          id="education-title"
          className="display text-3xl font-extrabold text-ink lg:col-span-3"
        >
          {education.title}
        </h2>
        <div className="lg:col-span-6">
          <h3 className="text-xl font-bold text-ink">{education.degree}</h3>
          <p className="mt-1 text-ink-soft">
            {education.institution}
            {locale === "fa" ? "، " : ", "}
            {education.location}
          </p>
        </div>
        <p className="text-sm font-semibold text-contour-strong lg:col-span-3 lg:text-end">
          <span data-period>{formatPeriod(locale, start, end)}</span>
        </p>
      </div>
    </section>
  );
}
