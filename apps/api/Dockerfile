# ─── Stage 1: Builder ───────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

# Copy dependency manifests
COPY apps/api/package.json apps/api/
COPY packages/shared/ packages/shared/
COPY package.json pnpm-lock.yaml* ./

# Install dependencies (including devDependencies for build)
RUN npm ci

# Copy Prisma schema and generate client
COPY apps/api/prisma/ apps/api/prisma/
RUN cd apps/api && npx prisma generate

# Copy source code
COPY apps/api/tsconfig*.json apps/api/
COPY apps/api/src/ apps/api/src/

# Build TypeScript
RUN cd apps/api && npm run build

# ─── Stage 2: Production ────────────────────────────────────────
FROM node:22-alpine-slim AS production
WORKDIR /app

# Security: non-root user (already exists in node image)
USER node

# Copy built artifacts
COPY --from=builder /app/apps/api/dist apps/api/dist
COPY --from=builder /app/apps/api/node_modules apps/api/node_modules
COPY --from=builder /app/apps/api/prisma apps/api/prisma
COPY --from=builder /app/apps/api/package.json apps/api/

# Prisma needs the generated client at runtime
COPY --from=builder /app/apps/api/node_modules/.prisma apps/api/node_modules/.prisma

ENV NODE_ENV=production
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/health || exit 1

WORKDIR /app/apps/api
CMD ["node", "dist/main.js"]
