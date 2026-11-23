import type { Metadata, Viewport } from "next";
import { getCopy } from "@/content";
import {
  defaultLocale,
  directionOf,
  isLocale,
  locales,
  type Locale,
} from "@/i18n/config";
import { siteUrl } from "@/lib/site";
import { themeBootScript } from "@/lib/theme";
import { fontVariables } from "../fonts";
import "../globals.css";

export function generateStaticParams(): { locale: Locale }[] {
  return locales.map((locale) => ({ locale }));
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#e8ece6" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1824" },
  ],
  colorScheme: "light dark",
};

const OPEN_GRAPH_LOCALE: Record<Locale, string> = { fa: "fa_IR", en: "en_US" };

export async function generateMetadata({
  params,
}: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const { meta, hero } = getCopy(locale);
  const other: Locale = locale === "fa" ? "en" : "fa";
  // Rendered in Chromium by scripts/generate-og.mts (next/og cannot order Persian text).
  const image = {
    url: `/og/${locale}.png`,
    width: 1200,
    height: 630,
    alt: meta.title,
  };

  return {
    metadataBase: siteUrl,
    title: meta.title,
    description: meta.description,
    applicationName: meta.siteName,
    authors: [{ name: hero.name }],
    creator: hero.name,
    openGraph: {
      type: "profile",
      url: `/${locale}`,
      siteName: meta.siteName,
      title: meta.title,
      description: meta.description,
      locale: OPEN_GRAPH_LOCALE[locale],
      alternateLocale: [OPEN_GRAPH_LOCALE[other]],
      firstName: locale === "fa" ? "عرفان" : "Erfan",
      lastName: locale === "fa" ? "علیخانی" : "Alikhani",
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: meta.title,
      description: meta.description,
      images: [image],
    },
    formatDetection: { telephone: false, email: false, address: false },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  const requested = (await params).locale;
  // An unknown first segment (e.g. /wp-login.php, which the proxy skips) still gets a
  // proper document shell; the page then calls notFound() so the styled 404 renders.
  const locale = isLocale(requested) ? requested : defaultLocale;

  return (
    // The boot script may set data-theme before React hydrates, hence suppressHydrationWarning.
    <html
      lang={locale}
      dir={directionOf(locale)}
      className={fontVariables}
      suppressHydrationWarning
    >
      <head>
        {/* Applies a saved Night map choice before first paint (no white flash). */}
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body id="top" className="antialiased">
        {children}
      </body>
    </html>
  );
}
