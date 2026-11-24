# syntax=docker/dockerfile:1

# Production image for the portfolio: Next.js standalone server on Node 26 (Alpine).
# Build:  docker build --build-arg SITE_URL=https://example.com -t erfan-portfolio .
# Run:    docker run --rm -p 3000:3000 erfan-portfolio
# The blog needs PostgreSQL at runtime (DATABASE_URL); the build does not.
# Migrations run from the separate "migrate" target (see compose.yaml).

ARG NODE_IMAGE=node:26.7.0-alpine3.23

# ---- deps: install exactly what the lockfile pins ---------------------------------
FROM ${NODE_IMAGE} AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund

# ---- migrate: applies drizzle/ to DATABASE_URL, then exits ------------------------
# A one-shot job, run before the web container starts. Only production dependencies
# (postgres.js, drizzle-orm) are kept, and it runs as the unprivileged node user.
FROM ${NODE_IMAGE} AS migrate
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY --from=deps /app/node_modules ./node_modules
RUN npm prune --omit=dev --no-audit --no-fund
COPY drizzle ./drizzle
COPY scripts/migrate.mjs scripts/unlock-admin.mjs scripts/db-connect.mjs ./scripts/
USER node
CMD ["node", "scripts/migrate.mjs"]

# ---- build: compile the static pages and the standalone server --------------------
FROM ${NODE_IMAGE} AS build
WORKDIR /app
# Canonical URLs, hreflang, the sitemap and social images are baked into the static
# pages at build time, so the public origin must be known here (not at runtime).
ARG SITE_URL
RUN test -n "$SITE_URL" || (echo "Build argument SITE_URL is required, e.g. --build-arg SITE_URL=https://example.com" >&2 && exit 1)
ENV SITE_URL=$SITE_URL \
    NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---- runtime: only the standalone output, as an unprivileged user -----------------
FROM ${NODE_IMAGE} AS runtime
WORKDIR /app
# Pages rendered on request (e.g. the 404) resolve the same origin as the static ones.
ARG SITE_URL
ENV SITE_URL=$SITE_URL \
    NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# The official image ships a "node" user (uid 1000); nothing below runs as root.
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
USER node

EXPOSE 3000

# robots.txt is served without the locale proxy, so it is a cheap liveness probe.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/robots.txt').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
