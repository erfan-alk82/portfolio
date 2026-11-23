import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCopy } from "@/content";
import { isLocale } from "@/i18n/config";
import { languageAlternates, siteUrl } from "@/lib/site";
import { PersonJsonLd } from "@/components/layout/PersonJsonLd";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { About } from "@/components/sections/About";
import { Contact } from "@/components/sections/Contact";
import { Education } from "@/components/sections/Education";
import { Experience } from "@/components/sections/Experience";
import { Hero } from "@/components/sections/Hero";
import { Projects } from "@/components/sections/Projects";
import { Skills } from "@/components/sections/Skills";

/** Canonical and hreflang belong to this page, so other routes never inherit them. */
export async function generateMetadata({ params }: PageProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  return {
    alternates: { canonical: `/${locale}`, languages: languageAlternates(siteUrl) },
  };
}

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const copy = getCopy(locale);

  return (
    <>
      <SiteHeader locale={locale} copy={copy} />
      <main id="main" tabIndex={-1} className="outline-none">
        <div className="mx-auto max-w-[90rem] px-5 sm:px-8 lg:px-12">
          <Hero locale={locale} copy={copy} />
          <About copy={copy} />
          <Experience locale={locale} copy={copy} />
          <Skills locale={locale} copy={copy} />
          <Projects locale={locale} copy={copy} />
          <Education locale={locale} copy={copy} />
        </div>
        <Contact locale={locale} copy={copy} />
      </main>
      <SiteFooter copy={copy} />
      <PersonJsonLd locale={locale} />
    </>
  );
}
