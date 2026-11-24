# Erfan Alikhani — portfolio

Bilingual personal site: Persian (`/fa`, right-to-left, default) and English (`/en`, left-to-right).
Built with Next.js 16 (App Router, Cache Components), React 19, TypeScript and Tailwind CSS 4.
The home page and case studies are statically generated. The blog (`/fa/blog`, `/en/blog`) reads
posts from PostgreSQL at request time, and a private admin at `/admin` publishes them.

## Commands

```bash
npm run dev            # local development at http://localhost:3000
npm run build          # production build (needs SITE_URL, see below)
npm start              # serve the production build (standalone server, like Docker)
npm run lint
npm run typecheck
npm test               # unit tests (Vitest)
npm run test:coverage  # unit tests with an 80% coverage gate
npm run test:e2e       # Playwright, desktop + mobile, against a production build
npm run test:integration  # blog database tests (needs TEST_DATABASE_URL, see below)
npm run db:migrate     # apply drizzle/ migrations to DATABASE_URL
npm run db:generate    # write a new SQL migration after editing src/server/db/schema.ts
npm run admin:hash-password  # print an ADMIN_PASSWORD_HASH
npm run admin:unlock   # break-glass: clear all login throttling (uses DATABASE_URL)
npm run og             # regenerate public/og/{fa,en}.png
npm run cv:public      # regenerate the public CV PDF from ../erfan.yaml
```

Run `npm run build` before `npm run test:e2e`; Playwright starts `next start` on port 3100.
Review screenshots: `CAPTURE=1 npx playwright test screenshots --project=desktop` writes
`test-results/screens/`.

## Blog and admin

Posts are stored in PostgreSQL behind a single `DATABASE_URL` (no Vercel- or Neon-specific
code), so the same build runs on Vercel with Neon today and in Docker with its own Postgres later.

- **One slug, two languages.** A post has one ASCII slug (`/fa/blog/<slug>` and
  `/en/blog/<slug>`) and a Persian and/or English version. Each version is published on its own;
  a post may exist in one language only.
- **Admin.** `/admin` (English, never indexed): sign in, write in Markdown (Persian fields are
  right-to-left; wrap Latin terms as `[[term]]`), preview live, then publish or unpublish each
  language. Raw HTML in Markdown is dropped, and images must be same-origin files (e.g. under
  `public/`). Deleting asks you to type the slug.
- **SEO on publish.** The editor shows a checklist (title 30–60 characters, description 70–160,
  slug format, empty body, missing or draft translation). Errors block publishing (checked again
  on the server); warnings are advice. Publishing makes these live on the next request: the post
  page with its title, description, canonical URL, `hreflang` only for published languages
  (`x-default` is Persian when it exists), Open Graph article dates and `BlogPosting` JSON-LD;
  the blog index; `/sitemap.xml`; and the feeds `/fa/feed.xml` and `/en/feed.xml`. Drafts,
  unpublished languages and the admin are never indexed.
- **Caching.** Public reads are cached (`use cache: remote`, tags `posts` and
  `post:<slug>`), and every admin action expires exactly the affected tags with `updateTag`.
- **Without a database** the site still builds and runs: the blog shows a "not available" message,
  the sitemap lists the other pages and `/admin/login` names the missing variables.

### Admin password

```bash
npm run admin:hash-password     # type the password twice; it prints scrypt:17:8:1:...
```

Put the printed value in `ADMIN_PASSWORD_HASH` (never the password itself), choose
`ADMIN_USERNAME`, and set `SESSION_SECRET` to at least 32 random bytes
(`openssl rand -base64 48`). Sessions last 8 hours.

**Sign-in protection.** Every attempt is counted before the password is checked, so
parallel requests cannot slip past the limit, and at most two password checks run at once.
- Five attempts from one IP within 15 minutes lock that IP for 15 minutes.
- Across all IPs there is no lockout, only a soft brake: after 10 failures in an hour each sign-in waits a
  little longer (250 ms per extra failure, at most 5 s), so nobody can lock the owner out.
- The IP comes from `x-vercel-forwarded-for` on Vercel, and from the right-most `X-Forwarded-For` entry
  behind your own proxy when `TRUST_PROXY=1`. Without either, only the soft brake applies.
- Locked out anyway? Run `npm run admin:unlock` with the production `DATABASE_URL` (or, in Docker,
  `docker compose run --rm migrate node scripts/unlock-admin.mjs`). It clears the counters only.
- `/admin` without a session cookie answers a real 307 to the login page (the server-side session check
  is still what protects every page and action). The login page names missing variables only outside
  production; in production they go to the server log.

### Database on Vercel (Neon)

1. Vercel → Project → Storage (or neon.tech): create a Postgres database and copy its
   **pooled** connection string (it ends in `?sslmode=require`).
2. Vercel → Project → Settings → Environment Variables, for **Production**: `DATABASE_URL`,
   `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, `SESSION_SECRET`. For **Preview**, never reuse production
   values: give previews their own Neon branch as `DATABASE_URL`, their own `SESSION_SECRET` and a different
   admin password (hash), or leave them unset (the preview blog then shows its unavailable message).
3. GitHub → Settings → Secrets → Actions: `DATABASE_URL` (the same production URL; the pipeline
   migrates it before each production deploy) and optionally `PREVIEW_DATABASE_URL`. Without
   these secrets deploys still succeed and only skip migrations, with a notice in the run.
4. To migrate by hand: `DATABASE_URL=... npm run db:migrate`.

In production the app and the scripts require TLS for any database host other than `localhost` and
the Compose `db` service: without an `sslmode` in the URL they enforce `require`, and they refuse
`sslmode=disable`.

### Database in Docker

`docker compose up` starts `db` (PostgreSQL, data in the `db-data` volume, not exposed),
then a one-shot `migrate` service, then `web`. Set `POSTGRES_PASSWORD` (use `openssl rand -hex 32`:
base64 output can contain `/` and `+`, which break the connection URL), `ADMIN_USERNAME`,
`ADMIN_PASSWORD_HASH` and `SESSION_SECRET` in `.env` (see `.env.example`). Behind a reverse
proxy on the same host, set `TRUST_PROXY=1` so login throttling counts per IP, and publish the app on
loopback only (`127.0.0.1:${PORT:-3000}:3000` in `compose.yaml`, as its comment shows), so nobody can
bypass the proxy and forge `X-Forwarded-For`. Back up with `docker compose exec db pg_dump -U portfolio portfolio > backup.sql`.
To move from Neon, `pg_dump` the Neon database and restore it into the `db` service.

### Tests that need PostgreSQL

```bash
docker run -d --name blog-test-db -e POSTGRES_PASSWORD=test -p 55432:5432 postgres:18.7-alpine3.23
TEST_DATABASE_URL=postgres://postgres:test@localhost:55432/postgres npm run test:integration
```

The integration tests empty the blog tables, so they only read `TEST_DATABASE_URL`, never
`DATABASE_URL`. The admin e2e flow (`tests/e2e/blog-admin.spec.ts`) runs when `DATABASE_URL`,
`E2E_ADMIN_USERNAME` and `E2E_ADMIN_PASSWORD` are set and the server under test has the
matching `ADMIN_*` values; otherwise it is skipped and the rest of the suite runs without a
database. CI sets all of this up for each run.

## Deployment (Vercel, via GitHub Actions)

`.github/workflows/pipeline.yml` is the only way code reaches Vercel. Vercel's own Git
auto-deploy is switched off in `vercel.json`, so an untested commit can never go live.

| Event                     | What runs                                                                    |
| ------------------------- | ---------------------------------------------------------------------------- |
| Pull request → `master` | lint, types, unit tests → integration + e2e against a throwaway PostgreSQL (fa/en, desktop/mobile) + Docker build → preview DB migration (if `PREVIEW_DATABASE_URL`) → **preview** deploy |
| Push to `master`        | the same checks → production DB migration (if `DATABASE_URL`) → **production** deploy → smoke test of the live site |
| Monday (Dependabot)       | grouped update PRs for npm, Actions and the Docker base image, each with the full pipeline and a preview |

### One-time setup

1. **Create the Vercel project.** In `portfolio/`, run `npx vercel@66.6.0 link`. It
   writes `.vercel/project.json` (git-ignored) with `orgId` and `projectId`.
   Importing the repo in the Vercel dashboard also works.
2. **Vercel → Project → Settings → Environment Variables:** add
   `SITE_URL=https://your-domain` for **Production** and **Preview**. Previews use the
   production origin in their canonical links, which is what search engines should see.
3. **Vercel → Project → Settings → Domains:** add your domain.
4. **Create a token** at vercel.com/account/tokens.
5. **GitHub → repo → Settings → Secrets and variables → Actions:**
   - Secrets: `VERCEL_TOKEN`, `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` (the last two
     come from `.vercel/project.json`).
   - Variable: `PRODUCTION_URL=https://your-domain`. This turns on the post-deploy
     smoke test.
6. *(Recommended)* **Protect `master`:** require the checks *Lint, types, unit tests*,
   *End-to-end* and *Docker image builds* before merging.

After that, `git push origin master` deploys automatically. Each run's summary shows
the deployed URL.

## Docker

The image runs the Next.js standalone server on `node:26.7.0-alpine3.23` as the
unprivileged `node` user, with a healthcheck on `/robots.txt`.

`SITE_URL` is a **build argument**. Canonical URLs, hreflang, the sitemap and social
images are baked into the static pages, so build one image per public origin.

```bash
cp .env.example .env            # set SITE_URL, POSTGRES_PASSWORD and the admin values; compose reads .env
docker compose up --build -d    # db → migrate → web at http://localhost:3000 (override with PORT=8080)
docker compose logs -f
docker compose down
```

Without compose:

```bash
docker build --build-arg SITE_URL=https://your-domain -t erfan-portfolio .
docker run --rm -p 3000:3000 --read-only --tmpfs /tmp   --tmpfs /app/.next/cache:uid=1000,gid=1000   --tmpfs /app/.next/server/route-cache:uid=1000,gid=1000   --cap-drop ALL --security-opt no-new-privileges:true erfan-portfolio
```

`compose.yaml` runs the container with a read-only root filesystem, no Linux
capabilities, `no-new-privileges`, and CPU, memory and process limits. Next.js
writes only its caches, which live in size-capped tmpfs mounts. Put a reverse proxy
(nginx, Caddy, Traefik) in front for TLS, as the Next.js self-hosting guide
recommends; the app already sends HSTS and the other security headers.

## Configuration

| Variable   | Required                   | Purpose                                                                                                                          |
| ---------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `SITE_URL` | Yes, for production builds | Public origin for canonical URLs, hreflang, the sitemap and social images. On Vercel, the production host is used if it is unset. |
| `DATABASE_URL` | For the blog (runtime) | PostgreSQL connection string. Unset: the blog shows a "not available" message and the admin is off. |
| `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, `SESSION_SECRET` | For the admin (runtime) | Sign-in; see “Admin password”. |
| `TRUST_PROXY` | Self-hosted, optional | `1` behind a reverse proxy that overwrites `X-Forwarded-For`. |
| `POSTGRES_PASSWORD` | Docker Compose | Password of the bundled database. |
| `DATABASE_POOL_MAX`, `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` | Optional | Pool size per instance (default 5); stable Server Action keys across self-hosted instances. |

Copy `.env.example` to `.env.local` for local builds. A production build without a public
URL fails on purpose, so localhost URLs can never be indexed.

## Where things live

```
src/
  app/[locale]/        layout (lang/dir, fonts, metadata), page, localized 404
  app/sitemap.ts       both languages with hreflang alternates, plus published posts
  app/[locale]/blog/   blog index and post pages; app/[locale]/feed.xml: RSS per language
  app/admin/           admin (second root layout): login, posts, editor, Server Actions
  server/              database (db/), auth (auth/) and blog data access (blog/); server-only
  lib/blog/            validation, SEO checklist, metadata and JSON-LD, RSS, [[term]] Markdown plugin
  proxy.ts             "/" → /fa or /en (cookie, then Accept-Language, then Persian)
  content/
    profile.ts         language-independent CV facts: dates, links, stacks
    fa.ts, en.ts       all copy, written separately per language
    types.ts           the SiteCopy shape both languages must satisfy
  components/          sections, the survey map, layout pieces
  lib/                 dates (Solar Hijri / Gregorian), contours, bidi markers, site URL
scripts/               social image and CV generators, migrate.mjs, hash-password.mjs
drizzle/               committed SQL migrations (generated from src/server/db/schema.ts)
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
