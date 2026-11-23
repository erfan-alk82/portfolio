import { Download, MapPin } from "lucide-react";
import { jobs, profile, type JobId, type SiteCopy } from "@/content";
import type { Locale } from "@/i18n/config";
import { SurveyMap } from "@/components/map/SurveyMap";
import { Availability } from "@/components/ui/Availability";
import { Rich } from "@/components/ui/Rich";
import { plainText } from "@/lib/rich";

type Props = {
  locale: Locale;
  copy: SiteCopy;
};

export function Hero({ locale, copy }: Props) {
  const { hero } = copy;
  const roles = Object.fromEntries(
    jobs.map((job) => [job.id, plainText(copy.experience.jobs[job.id].role)]),
  ) as Record<JobId, string>;

  return (
    <section
      aria-labelledby="hero-title"
      className="grid items-end gap-12 pt-10 pb-20 sm:pt-16 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16 lg:pt-20 lg:pb-28"
    >
      <div className="flex flex-col">
        <p className="flex flex-wrap items-center gap-x-2 text-sm text-ink-soft">
          <MapPin
            aria-hidden="true"
            className="size-4 text-signal"
            strokeWidth={1.75}
          />
          <span>{hero.location}</span>
          <span aria-hidden="true" className="text-rule">
            /
          </span>
          <span>{hero.coordinates}</span>
        </p>
        <h1
          id="hero-title"
          className="display mt-6 text-hero font-extrabold text-ink"
        >
          {hero.name}
        </h1>
        <p className="mt-5 text-xl font-semibold text-hydro sm:text-2xl">
          <Rich text={hero.role} />
        </p>
        <p className="measure mt-6 text-lg text-ink-soft">
          <Rich text={hero.lead} />
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-4">
          <a
            href="#contact"
            className="inline-flex min-h-12 items-center rounded-sm bg-ink px-6 font-semibold text-paper transition-colors duration-150 hover:bg-signal-deep active:translate-y-px"
          >
            {hero.primaryAction}
          </a>
          <a
            href={profile.cvPath}
            download
            className="link-signal inline-flex min-h-12 items-center gap-2 font-semibold"
          >
            <Download
              aria-hidden="true"
              className="size-4"
              strokeWidth={1.75}
            />
            {hero.cvAction}
          </a>
        </div>
        <div className="mt-6">
          <Availability
            label={copy.availability.label}
            value={copy.availability.value}
          />
        </div>
      </div>
      <SurveyMap
        locale={locale}
        title={hero.mapTitle}
        description={hero.mapDescription}
        legend={hero.mapLegend}
        roles={roles}
      />
    </section>
  );
}
