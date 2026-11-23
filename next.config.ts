import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

/**
 * The site is statically generated, so a per-request nonce is not available,
 * and the App Router streams its RSC payload through inline <script> tags
 * (self.__next_f.push), which SRI cannot hash. Scripts therefore need
 * 'unsafe-inline'. There is no third-party script, and everything else is
 * locked to this origin. Blog posts are written only by the signed-in admin
 * and rendered without raw HTML (MarkdownBody), with same-origin images only.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  `connect-src 'self'${isDev ? " ws:" : ""}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
];

/** The admin must never be indexed or stored by a shared cache. */
const adminHeaders = [
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
  { key: "Cache-Control", value: "no-store" },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  // Self-contained server (server.js + traced node_modules) for Docker and `npm start`.
  // Vercel builds through its own Next.js adapter (and sets VERCEL=1), so it is skipped there.
  output: process.env.VERCEL ? undefined : "standalone",
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  experimental: {
    serverActions: {
      // A post body may hold up to 200,000 characters (up to ~800 kB of UTF-8 Persian) plus form overhead.
      bodySizeLimit: "2mb",
    },
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/admin/:path*", headers: adminHeaders },
    ];
  },
};

export default nextConfig;
