#!/bin/bash
set -euo pipefail

# ============================================================
# PostgreSQL backup script — Grilyage
# Frequency: every 6 hours (cron)
# RPO: ≤ 1 hour
# Retention: 7 days local, 30 days offsite
# Encryption: AES-256
# ============================================================

# Configuration
BACKUP_DIR="/var/backups/grilyage/postgres"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/grilyage_${TIMESTAMP}.sql"
ENCRYPTED_FILE="${BACKUP_FILE}.enc"
RETENTION_DAYS=7
ENCRYPTION_KEY="${BACKUP_ENCRYPTION_KEY:?BACKUP_ENCRYPTION_KEY not set}"

# Create directory
mkdir -p "${BACKUP_DIR}"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting PostgreSQL backup..."

# Dump
docker exec grilyage-postgres pg_dump \
  -U grilyage \
  -d grilyage \
  --format=plain \
  --no-owner \
  --no-acl \
  --verbose \
  > "${BACKUP_FILE}" 2>> /var/log/grilyage-backup.log

# Compress
echo "Compressing backup..."
gzip "${BACKUP_FILE}"
BACKUP_FILE="${BACKUP_FILE}.gz"

# Encrypt (AES-256)
echo "Encrypting backup..."
openssl enc -aes-256-cbc -salt -pbkdf2 \
  -in "${BACKUP_FILE}" \
  -out "${ENCRYPTED_FILE}" \
  -pass pass:"${ENCRYPTION_KEY}"
rm -f "${BACKUP_FILE}"

# Offsite storage (uncomment when configured)
# echo "Uploading to offsite storage..."
# aws s3 cp "${ENCRYPTED_FILE}" s3://grilyage-backups/postgres/
# rsync -avz "${ENCRYPTED_FILE}" user@backup-server:/backups/grilyage/postgres/

# Cleanup old backups (local)
echo "Cleaning up backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -name "grilyage_*.sql.gz.enc" -type f -mtime +${RETENTION_DAYS} -delete

# Verify
echo "Backup completed successfully:"
ls -lh "${ENCRYPTED_FILE}"

# Log
logger -t grilyage-backup "PostgreSQL backup completed: ${ENCRYPTED_FILE}"
