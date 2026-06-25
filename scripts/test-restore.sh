#!/bin/bash
set -euo pipefail

# ============================================================
# Monthly restore test — Grilyage
# Frequency: 1st day of each month at 03:00 (cron)
# Verifies backup integrity by restoring to a test database
# ============================================================

BACKUP_DIR="/var/backups/grilyage/postgres"
RESTORE_DB="grilyage_restore_test"
ENCRYPTION_KEY="${BACKUP_ENCRYPTION_KEY:?BACKUP_ENCRYPTION_KEY not set}"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting restore test..."

# Find latest backup
LATEST=$(ls -t "${BACKUP_DIR}"/grilyage_*.sql.gz.enc 2>/dev/null | head -1)
if [[ -z "${LATEST}" ]]; then
  echo "ERROR: No backup found in ${BACKUP_DIR}"
  exit 1
fi

echo "Using backup: ${LATEST}"

# Decrypt
echo "Decrypting..."
openssl enc -d -aes-256-cbc -pbkdf2 \
  -in "${LATEST}" \
  -out /tmp/restore.sql.gz \
  -pass pass:"${ENCRYPTION_KEY}"

# Decompress
gunzip -f /tmp/restore.sql.gz

# Create test database
echo "Creating test database..."
docker exec grilyage-postgres psql -U grilyage -c "DROP DATABASE IF EXISTS ${RESTORE_DB};"
docker exec grilyage-postgres psql -U grilyage -c "CREATE DATABASE ${RESTORE_DB};"

# Restore
echo "Restoring to test database..."
docker exec -i grilyage-postgres psql -U grilyage -d "${RESTORE_DB}" < /tmp/restore.sql

# Verify
echo "Verifying data integrity..."
docker exec grilyage-postgres psql -U grilyage -d "${RESTORE_DB}" -c "SELECT COUNT(*) AS total_orders FROM orders;"
docker exec grilyage-postgres psql -U grilyage -d "${RESTORE_DB}" -c "SELECT COUNT(*) AS total_users FROM users;"
docker exec grilyage-postgres psql -U grilyage -d "${RESTORE_DB}" -c "SELECT COUNT(*) AS total_categories FROM categories;"

# Cleanup
echo "Cleaning up..."
docker exec grilyage-postgres psql -U grilyage -c "DROP DATABASE ${RESTORE_DB};"
rm -f /tmp/restore.sql

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Restore test completed successfully!"
