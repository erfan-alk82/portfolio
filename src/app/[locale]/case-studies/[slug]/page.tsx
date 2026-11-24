import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  allCaseStudies,
  caseStudies,
  getCopy,
  jobs,
  type CaseStudyFacts,
  type SiteCopy,
} from "@/content";
import { isLocale, locales, type Locale } from "@/i18n/config";
import { formatPeriod } from "@/lib/dates";
import { plainText } from "@/lib/rich";
import { languageAlternates, siteUrl } from "@/lib/site";
import { CaseStudyJsonLd } from "@/components/case-study/CaseStudyJsonLd";
import { FactoryDiagram } from "@/components/case-study/FactoryDiagram";
import { GeoDiagram } from "@/components/case-study/GeoDiagram";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Rich } from "@/components/ui/Rich";

type Params = { locale: string; slug: string };

/**
 * Cache Components needs at least one param. While every case study is switched
 * off, the known slugs are still listed: each prerenders straight to the 404 page
 * (resolve() only accepts enabled studies), and the proxy answers them with 404.
 */
export function generateStaticParams(): { slug: string }[] {
  const listed = caseStudies.length > 0 ? caseStudies : allCaseStudies;
  return listed.map((study) => ({ slug: study.slug }));
}

function resolve(
  params: Params,
): { locale: Locale; study: CaseStudyFacts } | null {
  if (!isLocale(params.locale)) return null;
  const study = caseStudies.find((s) => s.slug === params.slug);
  return study ? { locale: params.locale, study } : null;
}

const OPEN_GRAPH_LOCALE: Record<Locale, string> = { fa: "fa_IR", en: "en_US" };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const resolved = resolve(await params);
  if (!resolved) return {};
  const { locale, study } = resolved;
  const copy = getCopy(locale);
  const item = copy.caseStudies.items[study.id];
  const path = `/case-studies/${study.slug}`;
  const title = `${plainText(item.title)} | ${copy.meta.siteName}`;
  const image = {
    url: `/og/${locale}.png`,
    width: 1200,
    height: 630,
    alt: title,
  };

  return {
    title,
    description: item.summary,
    alternates: {
      canonical: `/${locale}${path}`,
      languages: languageAlternates(siteUrl, path),
    },
    openGraph: {
      type: "article",
      url: `/${locale}${path}`,
      siteName: copy.meta.siteName,
      title,
      description: item.summary,
      locale: OPEN_GRAPH_LOCALE[locale],
      alternateLocale: locales
        .filter((l) => l !== locale)
        .map((l) => OPEN_GRAPH_LOCALE[l]),
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: item.summary,
      images: [image],
    },
  };
}

function Facts({
  locale,
  study,
  copy,
}: {
  locale: Locale;
  study: CaseStudyFacts;
  copy: SiteCopy;
}) {
  const job = jobs.find((j) => j.id === study.jobId);
  if (!job) return null;
  const labels = copy.caseStudies.facts;
  const separator = locale === "fa" ? "، " : ", ";
  const rows: { label: string; value: ReactNode }[] = [
    {
      label: labels.company,
      value: (
        <bdi dir="ltr" lang="en">
          {job.company}
        </bdi>
      ),
    },
    { label: labels.period, value: formatPeriod(locale, job.start, job.end) },
    {
      label: labels.role,
      value: <Rich text={copy.experience.jobs[job.id].role} />,
    },
    {
      label: labels.employment,
      value: copy.experience.employment[job.employment],
    },
  ];
  return (
    <dl className="self-start border-t-2 border-ink">
      {rows.map((row) => (
        <div
          key={row.label}
          className="flex flex-col gap-1 border-b border-rule py-4"
        >
          <dt className="text-sm text-contour-strong">{row.label}</dt>
          <dd className="font-semibold text-ink">{row.value}</dd>
        </div>
      ))}
      {job.stack.length > 0 ? (
        <div className="flex flex-col gap-1 border-b border-rule py-4">
          <dt className="text-sm text-contour-strong">{labels.stack}</dt>
          <dd className="text-sm text-ink">
            {job.stack.map((tech, i) => (
              <span key={tech}>
                <bdi dir="ltr" lang="en">
                  {tech}
                </bdi>
                {i < job.stack.length - 1 ? separator : null}
              </span>
            ))}
          </dd>
        </div>
      ) : null}
    </dl>
  );
}

function Sections({
  item,
}: {
  item: SiteCopy["caseStudies"]["items"]["geoinsight" | "factory"];
}) {
  return (
    <>
      {item.sections.map((section, index) => (
        <section key={section.heading} aria-labelledby={`cs-section-${index}`}>
          <h2
            id={`cs-section-${index}`}
            className="text-2xl font-bold text-ink"
          >
            {section.heading}
          </h2>
          {section.paragraphs?.map((paragraph, i) => (
            <p key={i} className="measure mt-4 text-lg">
              <Rich text={paragraph} />
            </p>
          ))}
          {section.bullets ? (
            <ul className="measure mt-4 flex list-disc flex-col gap-2.5 ps-5 marker:text-contour">
              {section.bullets.map((bullet, i) => (
                <li key={i}>
                  <Rich text={bullet} />
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ))}
    </>
  );
}

export default async function CaseStudyPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const resolved = resolve(await params);
  if (!resolved) notFound();
  const { locale, study } = resolved;
  const copy = getCopy(locale);
  const item = copy.caseStudies.items[study.id];
  const other = caseStudies.find((s) => s.id !== study.id);

  return (
    <>
      <SiteHeader
        locale={locale}
        copy={copy}
        path={`/case-studies/${study.slug}`}
      />
      <main id="main" tabIndex={-1} className="outline-none">
        <article className="mx-auto max-w-[90rem] px-5 pt-10 pb-20 sm:px-8 lg:px-12 lg:pt-16 lg:pb-28">
          <Link
            href={`/${locale}#projects`}
            className="link-signal inline-flex min-h-11 items-center gap-2 text-sm font-semibold"
          >
            <ArrowLeft
              aria-hidden="true"
              className="size-4 rtl:rotate-180"
              strokeWidth={1.75}
            />
            {copy.caseStudies.backToProjects}
          </Link>
          <header className="mt-8 grid gap-10 lg:grid-cols-12 lg:gap-12">
            <div className="flex flex-col gap-5 lg:col-span-8">
              <p className="text-sm font-semibold text-hydro">
                <Rich text={item.kind} />
              </p>
              <h1 className="display text-hero font-extrabold text-ink">
                <Rich text={item.title} />
              </h1>
              <p className="measure text-xl text-ink-soft">
                <Rich text={item.intro} />
              </p>
            </div>
            <div className="lg:col-span-4">
              <Facts locale={locale} study={study} copy={copy} />
            </div>
          </header>

          <div className="mt-16 grid gap-12 border-t border-ink pt-12 lg:grid-cols-12">
            <div className="flex flex-col gap-10 lg:col-span-6">
              <Sections item={item} />
              <p className="measure border-s-2 border-contour ps-4 text-base text-ink-soft">
                <Rich text={item.confidentiality} />
              </p>
            </div>
            <div className="lg:col-span-6">
              {study.id === "geoinsight" ? (
                <GeoDiagram copy={copy.caseStudies.items.geoinsight.diagram} />
              ) : (
                <FactoryDiagram copy={copy.caseStudies.items.factory.diagram} />
              )}
            </div>
          </div>

          <nav
            aria-label={copy.caseStudies.label}
            className="mt-20 flex flex-wrap items-center justify-between gap-6 border-t border-ink pt-10"
          >
            {other ? (
              <Link
                href={`/${locale}/case-studies/${other.slug}`}
                className="group flex flex-col gap-1"
              >
                <span className="text-sm text-ink-soft">
                  {copy.caseStudies.other}
                </span>
                <span className="text-2xl font-bold text-ink group-hover:text-signal-deep">
                  <Rich text={copy.caseStudies.items[other.id].title} />
                </span>
              </Link>
            ) : null}
            <Link
              href={`/${locale}#contact`}
              className="inline-flex min-h-12 items-center rounded-sm bg-ink px-6 font-semibold text-paper transition-colors duration-150 hover:bg-signal-deep"
            >
              {copy.hero.primaryAction}
            </Link>
          </nav>
        </article>
      </main>
      <SiteFooter copy={copy} />
      <CaseStudyJsonLd
        locale={locale}
        slug={study.slug}
        title={item.title}
        summary={item.summary}
      />
    </>
  );
}
