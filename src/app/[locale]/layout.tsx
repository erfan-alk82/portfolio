import type { Metadata, Viewport } from "next";
import { Archivo, Vazirmatn } from "next/font/google";
import { getCopy } from "@/content";
import { defaultLocale, directionOf, isLocale, locales, type Locale } from "@/i18n/config";
import { siteUrl } from "@/lib/site";
import "../globals.css";

const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});

const vazirmatn = Vazirmatn({
  subsets: ["arabic", "latin"],
  variable: "--font-vazirmatn",
  display: "swap",
});

export function generateStaticParams(): { locale: Locale }[] {
  return locales.map((locale) => ({ locale }));
}

export const viewport: Viewport = {
  themeColor: "#e8ece6",
  colorScheme: "light",
};

const OPEN_GRAPH_LOCALE: Record<Locale, string> = { fa: "fa_IR", en: "en_US" };

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const { meta, hero } = getCopy(locale);
  const other: Locale = locale === "fa" ? "en" : "fa";
  // Rendered in Chromium by scripts/generate-og.mts (next/og cannot order Persian text).
  const image = { url: `/og/${locale}.png`, width: 1200, height: 630, alt: meta.title };

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
    twitter: { card: "summary_large_image", title: meta.title, description: meta.description, images: [image] },
    formatDetection: { telephone: false, email: false, address: false },
  };
}

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const requested = (await params).locale;
  // An unknown first segment (e.g. /wp-login.php, which the proxy skips) still gets a
  // proper document shell; the page then calls notFound() so the styled 404 renders.
  const locale = isLocale(requested) ? requested : defaultLocale;

  return (
    <html lang={locale} dir={directionOf(locale)} className={`${archivo.variable} ${vazirmatn.variable}`}>
      <body id="top" className="antialiased">
        {children}
      </body>
    </html>
  );
}
