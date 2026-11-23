# Erfan Alikhani — portfolio

Bilingual personal site: Persian (`/fa`, right-to-left, default) and English (`/en`, left-to-right).
Built with Next.js 16 (App Router, Cache Components), React 19, TypeScript and Tailwind CSS 4.
Both pages are statically generated.

## Commands

```bash
npm run dev            # local development at http://localhost:3000
npm run build          # production build (needs SITE_URL, see below)
npm run start          # serve the production build
npm run lint
npm run typecheck
npm test               # unit tests (Vitest)
npm run test:coverage  # unit tests with an 80% coverage gate
npm run test:e2e       # Playwright, desktop + mobile, against a production build
npm run og             # regenerate public/og/{fa,en}.png
npm run cv:public      # regenerate the public CV PDF from ../erfan.yaml
```

Run `npm run build` before `npm run test:e2e`; Playwright starts `next start` on port 3100.
Review screenshots: `CAPTURE=1 npx playwright test screenshots --project=desktop` writes
`test-results/screens/`.

## Configuration

| Variable   | Required                   | Purpose                                                                                                                          |
| ---------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `SITE_URL` | Yes, for production builds | Public origin for canonical URLs, hreflang, the sitemap and social images. On Vercel, the production host is used if it is unset. |

Copy `.env.example` to `.env.local` for local builds. A production build without a public
URL fails on purpose, so localhost URLs can never be indexed.

## Where things live

```
src/
  app/[locale]/        layout (lang/dir, fonts, metadata), page, localized 404
  app/sitemap.ts       both languages with hreflang alternates
  proxy.ts             "/" → /fa or /en (cookie, then Accept-Language, then Persian)
  content/
    profile.ts         language-independent CV facts: dates, links, stacks
    fa.ts, en.ts       all copy, written separately per language
    types.ts           the SiteCopy shape both languages must satisfy
  components/          sections, the survey map, layout pieces
  lib/                 dates (Solar Hijri / Gregorian), contours, bidi markers, site URL
scripts/               social image and public CV generators
```

## Editing content

- The CV source of truth is `../erfan.yaml`. Change it first, then mirror the change in
  `src/content/profile.ts` (facts) and `fa.ts` / `en.ts` (wording).
- In copy, wrap Latin-script terms as `[[ASP.NET Core]]`. They render inside
  `<bdi dir="ltr" lang="en">`, so punctuation such as `.NET` or `C#` stays in order inside
  Persian text. A unit test fails if a Persian string has an unwrapped Latin term.
- Persian dates are Solar Hijri years. The CV records only months, so a month that spans
  Nowruz has no single year. `jalaliYear` throws instead of guessing, and a test checks
  every CV date.
- After editing the hero copy, run `npm run og` so the social images match.

## Language behaviour

- The URL decides the language. Visiting `/fa` or `/en` stores it in the `NEXT_LOCALE`
  cookie, so later visits to `/` return to the same language.
- The language switch is a plain link, so it also works without JavaScript. With JavaScript,
  it keeps the section you are reading (`/en#experience` → `/fa#experience`).
- Layout uses logical CSS properties (`ps-*`, `border-s`, `text-end`). On the hero map,
  time runs in reading direction: left to right in English, right to left in Persian.
  The decorative contours stay the same.

## Contact details

Email, phone (+98 936 583 3763), LinkedIn, GitHub and Telegram are published at the
owner's request. The phone appears in the contact section as a `tel:` link and in the
CV PDF. `npm run cv:public` renders `../erfan.yaml` as written into
`public/cv/Erfan-Alikhani-CV.pdf`.

## Career data

Employers, titles and dates follow the owner's LinkedIn timeline. Both `../erfan.yaml`
and `src/content/profile.ts` were updated to match on 2026-11-23. The hero map draws
each role from its start to its end on a time axis. Full-time roles form the main
route, and part-time roles held in parallel get their own trails. `profile.asOf` is
the month that open-ended roles are drawn up to, so bump it when updating content.
