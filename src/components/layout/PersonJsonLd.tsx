import { getCopy, jobs, profile } from "@/content";
import type { Locale } from "@/i18n/config";
import { plainText } from "@/lib/rich";
import { siteUrl } from "@/lib/site";

type Props = {
  locale: Locale;
};

const LOCALITY: Record<Locale, string> = { fa: "تهران", en: "Tehran" };

/**
 * schema.org ProfilePage about one Person. Both language versions share the
 * Person @id so search engines merge them into a single entity.
 */
export function PersonJsonLd({ locale }: Props) {
  const copy = getCopy(locale);
  const other = getCopy(locale === "fa" ? "en" : "fa");
  const current = jobs.find((job) => job.end === null);
  const pageUrl = new URL(`/${locale}`, siteUrl).href;

  const data = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    url: pageUrl,
    inLanguage: locale,
    name: copy.meta.title,
    mainEntity: {
      "@type": "Person",
      "@id": new URL("/#person", siteUrl).href,
      name: copy.hero.name,
      alternateName: other.hero.name,
      jobTitle: plainText(copy.hero.role),
      description: copy.meta.description,
      url: pageUrl,
      image: new URL(`/og/${locale}.png`, siteUrl).href,
      email: profile.email,
      telephone: profile.phone.tel,
      address: {
        "@type": "PostalAddress",
        addressLocality: LOCALITY[locale],
        addressCountry: "IR",
      },
      worksFor: current
        ? { "@type": "Organization", name: current.company }
        : undefined,
      alumniOf: {
        "@type": "CollegeOrUniversity",
        name: copy.education.institution,
        alternateName: other.education.institution,
      },
      knowsAbout: [
        "ASP.NET Core",
        "C#",
        "React",
        "Next.js",
        "Microservices",
        "Kafka",
        "Elasticsearch",
        "GIS",
      ],
      sameAs: Object.values(profile.social).map((s) => s.url),
    },
  };

  // Escaping "<" keeps the JSON from ever closing the script element early.
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
