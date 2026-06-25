#!/bin/bash
set -euo pipefail

# ============================================================
# Uploads backup script — Grilyage
# Frequency: daily at 02:00 (cron)
# ============================================================

BACKUP_DIR="/var/backups/grilyage/uploads"
UPLOADS_DIR="/opt/grilyage/uploads"
TIMESTAMP=$(date +%Y%m%d)
BACKUP_FILE="${BACKUP_DIR}/uploads_${TIMESTAMP}.tar.gz"
RETENTION_DAYS=7

mkdir -p "${BACKUP_DIR}"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting uploads backup..."
tar -czf "${BACKUP_FILE}" -C "${UPLOADS_DIR}" .

# Offsite storage (uncomment when configured)
# echo "Uploading to offsite storage..."
# aws s3 cp "${BACKUP_FILE}" s3://grilyage-backups/uploads/
# rsync -avz "${BACKUP_FILE}" user@backup-server:/backups/grilyage/uploads/

echo "Cleaning up old backups..."
find "${BACKUP_DIR}" -name "uploads_*.tar.gz" -type f -mtime +${RETENTION_DAYS} -delete

echo "Backup completed: ${BACKUP_FILE}"
ls -lh "${BACKUP_FILE}"
logger -t grilyage-backup "Uploads backup completed: ${BACKUP_FILE}"
