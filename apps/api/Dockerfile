# ─── Stage 1: Build (deps + compile) ──────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

# Copy all source files
COPY package.json ./
COPY packages/ packages/
COPY apps/api/ apps/api/
COPY tsconfig.base.json ./

# Install all dependencies fresh (no lockfile — VPS lockfile may be stale)
ENV ELECTRON_SKIP_BINARY_DOWNLOAD=1
RUN npm install --include=dev

# Build shared package
RUN cd packages/shared && npx tsc --incremental false -p tsconfig.json

# Generate Prisma client
RUN cd apps/api && npx prisma generate

# Build API
RUN cd apps/api && npx tsc --incremental false -p tsconfig.build.json

# ─── Stage 2: Production ─────────────────────────────────────
FROM node:22-alpine AS production

RUN apk add --no-cache wget

WORKDIR /app

RUN mkdir -p /app/uploads && chown -R node:node /app/uploads

# Install only production dependencies (prisma CLI is devDep, not installed)
COPY package.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY tsconfig.base.json ./
RUN npm install --omit=dev --ignore-scripts && npm cache clean --force

# Copy built artifacts from builder
COPY --from=builder /app/apps/api/dist apps/api/dist
COPY --from=builder /app/packages/shared/dist packages/shared/dist
COPY --from=builder /app/apps/api/prisma apps/api/prisma
# Copy entire Prisma toolchain from builder (generated client + CLI engine binaries)
COPY --from=builder /app/node_modules/.prisma node_modules/.prisma
COPY --from=builder /app/node_modules/prisma node_modules/prisma
COPY --from=builder /app/node_modules/@prisma node_modules/@prisma

# Fix ownership so node user can run prisma migrate deploy
RUN chown -R node:node /app/node_modules/.prisma /app/node_modules/prisma /app/node_modules/@prisma

ENV NODE_ENV=production
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/health || exit 1

USER node
WORKDIR /app/apps/api
CMD ["node", "dist/main.js"]
