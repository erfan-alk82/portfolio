import { ArrowUpRight } from "lucide-react";
import { projects, type ProjectFacts, type SiteCopy } from "@/content";
import type { Locale } from "@/i18n/config";
import { formatPeriod } from "@/lib/dates";
import { NdviRaster } from "@/components/map/NdviRaster";
import { Rich } from "@/components/ui/Rich";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { StackLine } from "@/components/ui/StackLine";

type Props = {
  locale: Locale;
  copy: SiteCopy;
};

type ProjectCopyBlock = SiteCopy["projects"];

function ProjectName({
  project,
  copy,
}: {
  project: ProjectFacts;
  copy: ProjectCopyBlock;
}) {
  if (project.name) {
    return (
      <bdi dir="ltr" lang="en">
        {project.name}
      </bdi>
    );
  }
  return <Rich text={copy.items[project.id].name ?? ""} />;
}

/** Company, plus the period when the owner has given one. */
function ProjectMeta({
  project,
  locale,
  alignEnd = true,
}: {
  project: ProjectFacts;
  locale: Locale;
  alignEnd?: boolean;
}) {
  return (
    <p
      className={`flex flex-col gap-0.5 text-sm ${alignEnd ? "md:items-end md:text-end" : ""}`}
    >
      <bdi dir="ltr" lang="en" className="text-ink-soft">
        {project.company}
      </bdi>
      {project.period ? (
        <span data-period className="font-semibold text-contour-strong">
          {formatPeriod(locale, project.period.start, project.period.end)}
        </span>
      ) : null}
    </p>
  );
}

function ProjectLinks({
  project,
  copy,
}: {
  project: ProjectFacts;
  copy: ProjectCopyBlock;
}) {
  if (!project.links?.length) return null;
  return (
    <ul className="flex flex-wrap gap-x-6 gap-y-2">
      {project.links.map((link) => (
        <li key={link.kind}>
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="link-signal inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold"
          >
            <Rich text={copy.links[link.kind]} />
            <span className="sr-only"> ({copy.opensInNewTab})</span>
            <ArrowUpRight
              aria-hidden="true"
              className="size-4 rtl:-scale-x-100"
              strokeWidth={1.75}
            />
          </a>
        </li>
      ))}
    </ul>
  );
}

function ProjectRow({
  project,
  locale,
  copy,
}: {
  project: ProjectFacts;
  locale: Locale;
  copy: ProjectCopyBlock;
}) {
  const item = copy.items[project.id];
  const separator = locale === "fa" ? "، " : ", ";
  return (
    <li className="grid gap-x-12 gap-y-3 border-t border-rule py-8 md:grid-cols-[minmax(0,4fr)_minmax(0,6fr)_minmax(0,2fr)]">
      <div>
        <h3 className="text-2xl font-bold text-ink">
          <ProjectName project={project} copy={copy} />
        </h3>
        <p className="mt-1 text-sm text-hydro">
          <Rich text={item.kind} />
        </p>
      </div>
      <div className="flex flex-col gap-3">
        <p className="measure">
          <Rich text={item.description} />
        </p>
        <StackLine
          label={copy.stackLabel}
          stack={project.stack}
          separator={separator}
        />
        <ProjectLinks project={project} copy={copy} />
      </div>
      <ProjectMeta project={project} locale={locale} />
    </li>
  );
}

export function Projects({ locale, copy }: Props) {
  const { projects: text } = copy;
  const separator = locale === "fa" ? "، " : ", ";
  const [featured, ...others] = projects as readonly [
    ProjectFacts,
    ...ProjectFacts[],
  ];
  const featuredCopy = text.items[featured.id];

  return (
    <section
      id="projects"
      aria-labelledby="projects-title"
      className="border-t border-ink py-20 lg:py-28"
    >
      <SectionHeading id="projects-title">{text.title}</SectionHeading>

      <article
        className="mt-14 grid gap-10 lg:grid-cols-12 lg:gap-12"
        aria-labelledby="project-featured"
      >
        <div className="flex flex-col gap-4 lg:col-span-5">
          <p className="text-sm font-semibold text-hydro">
            <Rich text={featuredCopy.kind} />
          </p>
          <h3
            id="project-featured"
            className="display text-5xl font-extrabold text-ink sm:text-6xl"
          >
            <ProjectName project={featured} copy={text} />
          </h3>
          <ProjectMeta project={featured} locale={locale} alignEnd={false} />
          <p className="measure text-lg">
            <Rich text={featuredCopy.description} />
          </p>
          <StackLine
            label={text.stackLabel}
            stack={featured.stack}
            separator={separator}
          />
        </div>
        <div className="lg:col-span-7">
          <NdviRaster
            caption={text.rasterCaption}
            classes={text.rasterClasses}
          />
        </div>
      </article>

      <ul className="mt-20 border-b border-rule">
        {others.map((project) => (
          <ProjectRow
            key={project.id}
            project={project}
            locale={locale}
            copy={text}
          />
        ))}
      </ul>

      <p className="measure mt-8 border-s-2 border-contour ps-4 text-base text-ink-soft">
        <Rich text={text.confidential} />
      </p>
    </section>
  );
}
