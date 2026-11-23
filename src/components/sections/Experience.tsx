import { ArrowUpRight } from "lucide-react";
import { jobs, type JobFacts, type SiteCopy } from "@/content";
import type { Locale } from "@/i18n/config";
import { formatPeriod } from "@/lib/dates";
import { Rich } from "@/components/ui/Rich";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { StackLine } from "@/components/ui/StackLine";

type Props = {
  locale: Locale;
  copy: SiteCopy;
};

type CompanyProps = {
  job: JobFacts;
  onLinkedIn: string;
};

function Company({ job, onLinkedIn }: CompanyProps) {
  const name = (
    <bdi dir="ltr" lang="en" className="font-semibold text-hydro">
      {job.company}
    </bdi>
  );
  if (!job.linkedin) return name;
  return (
    <a
      href={job.linkedin}
      target="_blank"
      rel="noopener noreferrer"
      className="link-signal inline-flex items-center gap-1 decoration-hydro/40"
    >
      {name}
      <span className="sr-only"> {onLinkedIn}</span>
      <ArrowUpRight
        aria-hidden="true"
        className="size-3.5 text-hydro rtl:-scale-x-100"
        strokeWidth={1.75}
      />
    </a>
  );
}

type JobEntryProps = {
  job: JobFacts;
  isLast: boolean;
  locale: Locale;
  copy: SiteCopy["experience"];
};

function JobEntry({ job, isLast, locale, copy }: JobEntryProps) {
  const text = copy.jobs[job.id];
  const separator = locale === "fa" ? "، " : ", ";

  return (
    <li className="grid gap-x-12 gap-y-3 md:grid-cols-[11rem_minmax(0,1fr)]">
      <p className="flex flex-col gap-1 pt-1 text-sm md:items-end md:text-end">
        <span data-period className="font-semibold text-contour-strong">
          {formatPeriod(locale, job.start, job.end)}
        </span>
        <span className="text-ink-soft">{copy.employment[job.employment]}</span>
      </p>
      {/* The route: a line along the inline-start edge with a waypoint per role. */}
      <article
        className={`relative border-s-2 border-dashed border-rule ps-8 ${isLast ? "pb-2" : "pb-14"}`}
      >
        <span
          aria-hidden="true"
          className={`absolute -start-[9px] top-2 size-4 rounded-full border-2 border-ink ${job.end === null ? "bg-signal" : job.employment === "part-time" ? "bg-hydro" : "bg-paper-raised"}`}
        />
        <h3 className="text-2xl font-bold text-ink">
          <Rich text={text.role} />
        </h3>
        <p className="mt-1 text-base text-ink-soft">
          <Company job={job} onLinkedIn={copy.onLinkedIn} />
          {separator}
          {text.location}
        </p>
        {job.steps && text.steps ? (
          <div className="mt-5 border-s-2 border-contour/40 ps-4">
            <h4 className="text-sm font-semibold text-contour-strong">
              <Rich text={copy.stepsLabel} />
            </h4>
            <ol className="mt-2 flex flex-col gap-1.5 text-sm">
              {job.steps.map((step, i) => (
                <li
                  key={`${step.start}-${i}`}
                  className="flex flex-wrap gap-x-3"
                >
                  <span className="font-semibold text-ink">
                    <Rich text={text.steps?.[i] ?? ""} />
                  </span>
                  <span data-period className="text-ink-soft">
                    {formatPeriod(locale, step.start, step.end)}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        ) : null}
        <ul className="measure mt-5 flex list-disc flex-col gap-2.5 ps-5 marker:text-contour">
          {text.highlights.map((highlight, i) => (
            <li key={i}>
              <Rich text={highlight} />
            </li>
          ))}
        </ul>
        <div className="mt-5">
          <StackLine
            label={copy.stackLabel}
            stack={job.stack}
            separator={separator}
          />
        </div>
      </article>
    </li>
  );
}

export function Experience({ locale, copy }: Props) {
  const { experience } = copy;

  return (
    <section
      id="experience"
      aria-labelledby="experience-title"
      className="border-t border-ink py-20 lg:py-28"
    >
      <SectionHeading id="experience-title" intro={experience.intro}>
        {experience.title}
      </SectionHeading>
      <ol className="mt-14 flex flex-col">
        {jobs.map((job, index) => (
          <JobEntry
            key={job.id}
            job={job}
            isLast={index === jobs.length - 1}
            locale={locale}
            copy={experience}
          />
        ))}
      </ol>
    </section>
  );
}
