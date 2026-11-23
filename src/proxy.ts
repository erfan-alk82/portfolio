import { NextResponse, type NextRequest } from "next/server";
import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE, isLocale } from "@/i18n/config";
import { pickLocale } from "@/i18n/negotiate";
import { isUnknownCaseStudy } from "@/i18n/routes";

/**
 * Locale routing:
 * - /fa/... and /en/... render as-is and remember the language in a cookie,
 *   so the choice survives refreshes and later visits to "/".
 * - Any other path is redirected to the remembered or negotiated locale.
 */
export function proxy(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;
  const firstSegment = pathname.split("/")[1];
  const remembered = request.cookies.get(LOCALE_COOKIE)?.value;

  if (isLocale(firstSegment)) {
    // Streamed pages cannot change their status later; answer unknown slugs with the 404 page now.
    const response = isUnknownCaseStudy(pathname)
      ? NextResponse.rewrite(new URL(`/${firstSegment}/not-found`, request.url))
      : NextResponse.next();
    if (remembered !== firstSegment) {
      response.cookies.set(LOCALE_COOKIE, firstSegment, {
        maxAge: LOCALE_COOKIE_MAX_AGE,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
      });
    }
    return response;
  }

  const locale = pickLocale({
    cookie: remembered,
    acceptLanguage: request.headers.get("accept-language"),
  });
  const target = new URL(`/${locale}${pathname === "/" ? "" : pathname}${search}`, request.url);
  const response = NextResponse.redirect(target, 307);
  response.headers.set("Vary", "Accept-Language, Cookie");
  // Per-visitor answer: shared caches must never replay one visitor's language to another.
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {
  // Skip Next internals, the admin (English-only, outside the locale tree), API routes and
  // any path with a file extension (robots.txt, the CV PDF, icons, feed.xml).
  // "admin(?:/|$)" skips /admin and /admin/... but still localizes e.g. /administrator.
  matcher: ["/((?!_next/|admin(?:/|$)|api/|.*\\.[\\w]+$).*)"],
};
