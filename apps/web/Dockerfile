# ─── Stage 1: Dependencies ──────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app

COPY apps/web/package.json apps/web/
COPY package.json pnpm-lock.yaml* ./
RUN npm ci

# ─── Stage 2: Builder ────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY apps/web/ apps/web/
COPY packages/shared/ packages/shared/
COPY package.json ./

ENV NEXT_TELEMETRY_DISABLED=1
RUN cd apps/web && npm run build

# ─── Stage 3: Production Runner ──────────────────────────────────
FROM node:22-alpine-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Security: non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone output from builder
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

WORKDIR /app/apps/web
CMD ["node", "server.js"]
