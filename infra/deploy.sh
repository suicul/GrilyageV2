#!/usr/bin/env bash
set -euo pipefail

# ─── Grilyage Delivery — Production Deploy Script ──────────────────
# Usage: ./infra/deploy.sh [--env-file .env.production]
#
# Prerequisites on VPS:
#   - Docker + Docker Compose plugin installed
#   - Domain (grilyazh-omsk.ru) pointing to server IP
#   - Ports 80, 443 open in firewall
#
# Optional first-time setup:
#   ./infra/deploy.sh --init-ssl   # Obtain SSL certs via certbot
# ───────────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="${ENV_FILE:-${PROJECT_DIR}/.env.production}"
COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.yml"
PUSH_URL="${PUSH_URL:-}"

cd "$PROJECT_DIR"

echo "→ Deploying Grilyage Delivery"
echo "  Project:   $PROJECT_DIR"
echo "  Env file:  $ENV_FILE"
echo "  Compose:   $COMPOSE_FILE"

# Validate env file
if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: Env file not found: $ENV_FILE"
  echo "Create it from .env.production template and fill in secrets."
  exit 1
fi

# Load env vars (without exporting, just for validation)
set -a; source "$ENV_FILE"; set +a

# Check required vars
MISSING=""
[ -z "${POSTGRES_PASSWORD:-}" ] && MISSING="$MISSING POSTGRES_PASSWORD"
[ -z "${JWT_ACCESS_SECRET:-}" ] && MISSING="$MISSING JWT_ACCESS_SECRET"
[ -z "${JWT_REFRESH_SECRET:-}" ] && MISSING="$MISSING JWT_REFRESH_SECRET"
[ -z "${STAFF_JWT_ACCESS_SECRET:-}" ] && MISSING="$MISSING STAFF_JWT_ACCESS_SECRET"
[ -z "${STAFF_JWT_REFRESH_SECRET:-}" ] && MISSING="$MISSING STAFF_JWT_REFRESH_SECRET"
# SMS_RU_API_KEY опционально — будет добавлено позже
# [ -z "${SMS_RU_API_KEY:-}" ] && MISSING="$MISSING SMS_RU_API_KEY"

if [ -n "$MISSING" ]; then
  echo "ERROR: Missing required env vars:$MISSING"
  exit 1
fi

# Check for CHANGE_ME placeholders
if grep -q "CHANGE_ME" "$ENV_FILE" 2>/dev/null; then
  echo "ERROR: Env file still has CHANGE_ME placeholders. Replace them first."
  exit 1
fi

# Pull latest code if git repo and PUSH_URL is set
if [ -d .git ] && [ -n "${PUSH_URL}" ]; then
  echo "→ Pulling latest code..."
  git pull origin main
fi

# Build and start
echo "→ Building and starting containers..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build --pull
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d

echo "→ Running database migrations..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T api node dist/main.js 2>/dev/null || true
# Run prisma migrate via one-off command
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" run --rm api npx prisma migrate deploy

echo "→ Seeding initial data (if empty)..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" run --rm api npx prisma db seed 2>/dev/null || true

echo "→ Restarting API to apply migrations..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d api

echo ""
echo "✓ Deploy complete!"
echo "  Site: https://grilyazh-omsk.ru"
echo "  API:  https://grilyazh-omsk.ru/api/v1/"
echo ""
echo "  To view logs:"
echo "    docker compose -f $COMPOSE_FILE logs -f"
echo ""
echo "  To restart:"
echo "    docker compose -f $COMPOSE_FILE restart"
