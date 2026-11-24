import { describe, expect, test } from "vitest";
import { NextRequest } from "next/server";
import { getRedirectUrl, getRewrittenUrl, isRewrite, unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { config, proxy } from "@/proxy";

function runs(url: string): boolean {
  return unstable_doesMiddlewareMatch({ config, nextConfig: {}, url });
}

function request(path: string, init: { cookie?: string; headers?: Record<string, string>; method?: string } = {}) {
  const headers = new Headers(init.headers);
  if (init.cookie) headers.set("cookie", init.cookie);
  return new NextRequest(new URL(path, "https://example.com"), { headers, method: init.method ?? "GET" });
}

describe("proxy matcher", () => {
  test.each([
    "/",
    "/fa",
    "/en/blog",
    "/fa/blog/some-post",
    "/en/case-studies/geoinsight",
    "/administrator",
    "/apis",
    "/admin",
    "/admin/posts/new",
  ])("runs for %s", (url) => {
    expect(runs(url)).toBe(true);
  });

  test.each(["/api/health", "/_next/static/chunk.js", "/robots.txt", "/sitemap.xml", "/fa/feed.xml", "/cv/Erfan-Alikhani-CV.pdf"])(
    "skips %s",
    (url) => {
      expect(runs(url)).toBe(false);
    },
  );
});

describe("proxy: admin", () => {
  test.each(["/admin", "/admin/", "/admin/posts/new", "/admin/posts/0b6f4c1e-8a59-4c1b-9a43-3f0d8c1a2b3c"])(
    "signed out, %s answers a real 307 to the login page",
    (path) => {
      const response = proxy(request(path));
      expect(response.status).toBe(307);
      expect(getRedirectUrl(response)).toBe("https://example.com/admin/login");
    },
  );

  test.each(["admin_session=abc.def", "__Host-admin_session=abc.def"])("with a session cookie (%s) it passes through", (cookie) => {
    const response = proxy(request("/admin", { cookie }));
    expect(getRedirectUrl(response)).toBeNull();
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  test("the login page and Server Action posts always pass through", () => {
    expect(getRedirectUrl(proxy(request("/admin/login")))).toBeNull();
    expect(getRedirectUrl(proxy(request("/admin", { method: "POST", headers: { "next-action": "abc" } })))).toBeNull();
  });

  test("never sets the locale cookie on admin responses", () => {
    expect(proxy(request("/admin/login")).cookies.get("NEXT_LOCALE")).toBeUndefined();
  });
});

describe("proxy: locales", () => {
  test("a path without a locale is redirected to one", () => {
    expect(getRedirectUrl(proxy(request("/administrator", { headers: { "accept-language": "en" } })))).toBe(
      "https://example.com/en/administrator",
    );
  });

  test("a malformed blog slug is rewritten to the 404 page", () => {
    const response = proxy(request("/en/blog/Not_A_Slug"));
    expect(isRewrite(response)).toBe(true);
    expect(getRewrittenUrl(response)).toBe("https://example.com/en/not-found");
  });

  test("a well-formed blog slug renders normally", () => {
    expect(isRewrite(proxy(request("/fa/blog/event-driven-notes")))).toBe(false);
  });
});
