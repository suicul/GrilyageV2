#!/usr/bin/env bash
set -euo pipefail

# ─── First-time SSL setup via Let's Encrypt ──────────────────────
# Run once on a fresh VPS before the first deploy.
# Requires domain DNS to already point to your server.
# ─────────────────────────────────────────────────────────────────

DOMAIN="${1:-grillyage.ru}"
EMAIL="${2:-admin@grillyage.ru}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "→ Initializing SSL for $DOMAIN with email $EMAIL"

# Start nginx without SSL first (certbot standalone won't work with our nginx config)
# Instead we use the http-01 challenge via webroot
docker compose -f "${SCRIPT_DIR}/docker-compose.yml" up -d nginx --no-deps 2>/dev/null || true

# Obtain certificate
docker compose -f "${SCRIPT_DIR}/docker-compose.yml" run --rm certbot certonly --webroot \
  --webroot-path /var/www/certbot \
  --email "$EMAIL" \
  --agree-tos \
  --no-eff-email \
  -d "$DOMAIN" \
  -d "www.$DOMAIN"

echo ""
echo "✓ SSL certificates obtained for $DOMAIN"
echo "  Renewal is automatic via certbot service in docker-compose"
echo ""
echo "  Now run: ./infra/deploy.sh"
