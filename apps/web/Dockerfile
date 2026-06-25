# ─── Stage 1: Builder (deps + build) ─────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

ARG NEXT_PUBLIC_VK_CLIENT_ID
ARG NEXT_PUBLIC_YANDEX_CLIENT_ID
ARG NEXT_PUBLIC_YANDEX_MAPS_API_KEY
ARG NEXT_PUBLIC_SENTRY_DSN
ENV NEXT_PUBLIC_VK_CLIENT_ID=$NEXT_PUBLIC_VK_CLIENT_ID
ENV NEXT_PUBLIC_YANDEX_CLIENT_ID=$NEXT_PUBLIC_YANDEX_CLIENT_ID
ENV NEXT_PUBLIC_YANDEX_MAPS_API_KEY=$NEXT_PUBLIC_YANDEX_MAPS_API_KEY
ENV NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN

# Copy all source files
COPY package.json ./
COPY packages/ packages/
COPY apps/web/ apps/web/
COPY tsconfig.base.json ./

# Install all dependencies fresh (no lockfile — VPS lockfile may be stale)
RUN npm install --include=dev

# Build shared first, then web
RUN npm run build --workspace packages/shared
RUN cd apps/web && npx next build

# ─── Stage 2: Runner ─────────────────────────────────────────────
FROM node:22-alpine AS runner

RUN apk add --no-cache wget && \
    addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install only production deps
COPY package.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/web/package.json apps/web/
COPY tsconfig.base.json ./
RUN npm install --omit=dev --ignore-scripts && npm cache clean --force

# Copy built artifacts from builder
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

# Ensure .next is writable by nextjs user
RUN mkdir -p /app/apps/web/.next/cache && chown -R 1001:1001 /app/apps/web/.next

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

WORKDIR /app
CMD ["node", "apps/web/server.js"]
