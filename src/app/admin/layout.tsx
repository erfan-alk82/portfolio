import type { Metadata, Viewport } from "next";
import { themeBootScript } from "@/lib/theme";
import { fontVariables } from "../fonts";
import "../globals.css";

/**
 * Second root layout: the admin is English-only and left-to-right, and lives
 * outside the localized site (the proxy skips /admin). It shares the design
 * tokens, fonts and Night map theme with the public site.
 */
export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | Admin" },
  robots: { index: false, follow: false, nocache: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#e8ece6" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1824" },
  ],
  colorScheme: "light dark",
};

export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  return (
    <html lang="en" dir="ltr" className={fontVariables} suppressHydrationWarning>
      <head>
        {/* Applies a saved Night map choice before first paint, as on the public site. */}
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
