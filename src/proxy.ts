import { NextResponse, type NextRequest } from "next/server";
import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE, isLocale } from "@/i18n/config";
import { pickLocale } from "@/i18n/negotiate";
import { isMalformedBlogPath, isUnknownCaseStudy } from "@/i18n/routes";

/** Both spellings of the admin session cookie (see server/auth/session.ts). */
const SESSION_COOKIES = ["__Host-admin_session", "admin_session"];

function isAdminPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

/**
 * Defence in depth for /admin: without any session cookie, answer with a
 * real 307 to the login page instead of a streamed page. The Data Access
 * Layer (server/auth/dal.ts) remains the actual gate: the cookie is only
 * required to be present here, not verified. The login page and Server
 * Action POSTs (next-action header) always pass, so actions report their own errors.
 */
function adminGate(request: NextRequest): NextResponse {
  const open = request.nextUrl.pathname === "/admin/login" || request.headers.has("next-action");
  const hasCookie = SESSION_COOKIES.some((name) => request.cookies.has(name));
  if (open || hasCookie) return NextResponse.next();
  return NextResponse.redirect(new URL("/admin/login", request.url), 307);
}

/**
 * Locale routing:
 * - /fa/... and /en/... render as-is and remember the language in a cookie,
 *   so the choice survives refreshes and later visits to "/".
 * - /admin is English-only and outside the locale tree (see adminGate).
 * - Any other path is redirected to the remembered or negotiated locale.
 */
export function proxy(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;
  if (isAdminPath(pathname)) return adminGate(request);

  const firstSegment = pathname.split("/")[1];
  const remembered = request.cookies.get(LOCALE_COOKIE)?.value;

  if (isLocale(firstSegment)) {
    // Streamed pages cannot change their status later; answer impossible URLs with the 404 page now.
    const response =
      isUnknownCaseStudy(pathname) || isMalformedBlogPath(pathname)
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
  // Skip Next internals, API routes and any path with a file extension (robots.txt,
  // the CV PDF, icons, feed.xml). /admin runs, but only for the session-cookie gate.
  matcher: ["/((?!_next/|api/|.*\\.[\\w]+$).*)"],
};
