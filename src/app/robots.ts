import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    // The admin also sends X-Robots-Tag: noindex (next.config.ts) in case a crawler ignores this.
    // Both forms, explicitly: the admin root and everything below it.
    rules: { userAgent: "*", allow: "/", disallow: ["/admin/", "/admin"] },
    sitemap: new URL("/sitemap.xml", siteUrl).href,
  };
}
