import { describe, expect, test } from "vitest";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { config } from "@/proxy";

function runs(url: string): boolean {
  return unstable_doesMiddlewareMatch({ config, nextConfig: {}, url });
}

describe("proxy matcher", () => {
  test.each(["/", "/fa", "/en/blog", "/fa/blog/some-post", "/en/case-studies/geoinsight", "/administrator", "/apis"])(
    "runs for %s",
    (url) => {
      expect(runs(url)).toBe(true);
    },
  );

  test.each([
    "/admin",
    "/admin/",
    "/admin/login",
    "/admin/posts/0b6f4c1e-8a59-4c1b-9a43-3f0d8c1a2b3c",
    "/api/health",
    "/_next/static/chunk.js",
    "/robots.txt",
    "/sitemap.xml",
    "/fa/feed.xml",
    "/cv/Erfan-Alikhani-CV.pdf",
  ])("skips %s", (url) => {
    expect(runs(url)).toBe(false);
  });
});
