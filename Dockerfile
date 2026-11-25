# syntax=docker/dockerfile:1
# Readyline production image: the Next.js standalone server on Node 26 (Alpine), running as a
# non-root user with its SQLite database on the /data volume.
#
#   docker build --build-arg APP_URL=https://app.example.com -t readyline .
#
# deploy/compose.yaml passes the build arguments for you (see README, "Run in production").
# The base image is pinned by tag and digest; update both together when moving to a newer Node.

ARG NODE_IMAGE=node:26.13.1-alpine3.24@sha256:6bd9ab43c0ec0190ca7b2d193906cb8b7edf6e7f4afa43ddeccd6452710bffb5

# ---- Dependencies -------------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS deps
WORKDIR /app
COPY package.json package-lock.json* pnpm-lock.yaml* ./
# npm ci when the repository has a package-lock.json. It is currently locked with pnpm, so install
# the pnpm version named in package.json ("packageManager") and refuse to change the lockfile.
RUN if [ -f package-lock.json ]; then \
      npm ci; \
    elif [ -f pnpm-lock.yaml ]; then \
      npm install --global pnpm@10.28.0 && pnpm install --frozen-lockfile; \
    else \
      echo "No lockfile found" >&2 && exit 1; \
    fi

# ---- Build --------------------------------------------------------------------------------------
FROM deps AS build
WORKDIR /app
COPY . .
# Read at build time: next.config.ts sends HSTS and upgrade-insecure-requests on prerendered pages
# only when APP_URL is https, and NEXT_PUBLIC_* values are compiled into the client bundle.
# Set APP_URL to the same value again at runtime (.env.production).
ARG APP_URL
ARG NEXT_PUBLIC_SITE_URL=${APP_URL}
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    APP_URL=${APP_URL} \
    NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}
# The repository has no public/ directory yet; create it so the runtime COPY below always works.
RUN case "$APP_URL" in \
      https://*) ;; \
      *) echo "Set --build-arg APP_URL=https://your-domain (got '${APP_URL}')" >&2; exit 1 ;; \
    esac \
 && mkdir -p public \
 && npx next build

# ---- Runtime ------------------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000 \
    DATA_DIR=/data

# Dedicated unprivileged user. The package managers are not needed at runtime, so remove them to
# shrink the image and its vulnerability surface.
RUN addgroup -S -g 10001 readyline \
 && adduser -S -D -H -u 10001 -G readyline -s /sbin/nologin readyline \
 && mkdir -p /data \
 && chown readyline:readyline /data \
 && chmod 0700 /data \
 && rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
           /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack \
           /usr/local/bin/yarn /usr/local/bin/yarnpkg /opt/yarn-*

# Application files stay owned by root, so the running process cannot modify its own code.
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
# Next.js may write its cache here; it is the only writable path under /app.
RUN mkdir -p .next/cache && chown readyline:readyline .next/cache && chmod 0700 .next/cache

USER readyline
VOLUME ["/data"]
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/api/health/',{signal:AbortSignal.timeout(4000)}).then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"]

CMD ["node", "server.js"]
