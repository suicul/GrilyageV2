# Backup Strategy — Проект «Грильяж»

> **Дата:** июнь 2026  
> **Целевая платформа:** Ubuntu 24.04 VPS (Timeweb)  
> **RPO:** ≤ 1 час  
> **RTO:** ≤ 4 часа  
> **Статус:** ACTIVE

---

## 1. Обзор стратегии

### 1.1. Цели

| Метрика | Значение | Описание |
|---------|----------|----------|
| **RPO** (Recovery Point Objective) | ≤ 1 час | Максимальная потеря данных при сбое |
| **RTO** (Recovery Time Objective) | ≤ 4 часа | Максимальное время восстановления |
| **Retention** | 30 дней | Хранение backup-файлов |
| **Frequency** | Каждые 6 часов | 4 backup в день |
| **Encryption** | AES-256 | Шифрование backup-файлов |

### 1.2. Что备份ируется

| Компонент | Тип данных | Частота | Метод |
|-----------|------------|---------|-------|
| **PostgreSQL** | Реляционная БД (заказы, пользователи, каталог) | Каждые 6 часов | `pg_dump` |
| **Uploads** | Изображения, файлы (директория `uploads/`) | Ежедневно | `rsync` / `tar` |
| **Конфигурация** | `.env.production`, nginx configs, docker-compose | При изменении | Git + manual backup |
| **Redis** | Кэш, сессии (если используется) | Не требуется | Эфемерные данные, восстанавливаются из БД |

### 1.3. Где хранится

| Локация | Тип | Retention | Назначение |
|---------|-----|-----------|------------|
| **Локально на VPS** | `/var/backups/grilyage/` | 7 дней | Быстрое восстановление |
| **Offsite (S3 / другой VPS)** | AWS S3 / Yandex Object Storage / rsync | 30 дней | Disaster recovery |
| **Git repository** | GitHub | Permanent | Конфигурация, код |

---

## 2. PostgreSQL Backup

### 2.1. Скрипт backup

**Файл:** `scripts/backup-postgres.sh`

```bash
#!/bin/bash
set -euo pipefail

# Конфигурация
BACKUP_DIR="/var/backups/grilyage/postgres"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/grilyage_${TIMESTAMP}.sql"
ENCRYPTED_FILE="${BACKUP_FILE}.enc"
RETENTION_DAYS=7
ENCRYPTION_KEY="${BACKUP_ENCRYPTION_KEY}" # из .env или secrets manager

# Создание директории
mkdir -p "${BACKUP_DIR}"

# Backup
echo "Starting PostgreSQL backup..."
docker exec grilyage-postgres pg_dump -U grilyage -d grilyage --format=plain --verbose > "${BACKUP_FILE}"

# Сжатие
echo "Compressing backup..."
gzip "${BACKUP_FILE}"
BACKUP_FILE="${BACKUP_FILE}.gz"

# Шифрование (AES-256)
echo "Encrypting backup..."
openssl enc -aes-256-cbc -salt -pbkdf2 -in "${BACKUP_FILE}" -out "${ENCRYPTED_FILE}" -pass pass:"${ENCRYPTION_KEY}"
rm "${BACKUP_FILE}"

# Offsite storage (S3 / rsync)
echo "Uploading to offsite storage..."
# AWS S3:
# aws s3 cp "${ENCRYPTED_FILE}" s3://grilyage-backups/postgres/
# Yandex Object Storage:
# aws s3 --endpoint-url=https://storage.yandexcloud.net cp "${ENCRYPTED_FILE}" s3://grilyage-backups/postgres/
# rsync:
# rsync -avz "${ENCRYPTED_FILE}" user@backup-server:/backups/grilyage/postgres/

# Удаление старых backup (локально)
echo "Cleaning up old backups (>${RETENTION_DAYS} days)..."
find "${BACKUP_DIR}" -name "grilyage_*.sql.gz.enc" -type f -mtime +${RETENTION_DAYS} -delete

# Verification
echo "Backup completed: ${ENCRYPTED_FILE}"
ls -lh "${ENCRYPTED_FILE}"

# Логирование
logger -t grilyage-backup "PostgreSQL backup completed: ${ENCRYPTED_FILE}"
```

### 2.2. Cron job

**Файл:** `/etc/cron.d/grilyage-backup`

```cron
# PostgreSQL backup каждые 6 часов
0 */6 * * * root /opt/grilyage/scripts/backup-postgres.sh >> /var/log/grilyage-backup.log 2>&1
```

### 2.3. Verification

**Ежемесячный test restore:**

```bash
#!/bin/bash
set -euo pipefail

BACKUP_FILE="/var/backups/grilyage/postgres/grilyage_$(date -d 'yesterday' +%Y%m%d)_*.sql.gz.enc"
RESTORE_DB="grilyage_restore_test"
ENCRYPTION_KEY="${BACKUP_ENCRYPTION_KEY}"

# Расшифровка
openssl enc -d -aes-256-cbc -pbkdf2 -in "${BACKUP_FILE}" -out /tmp/restore.sql.gz -pass pass:"${ENCRYPTION_KEY}"
gunzip /tmp/restore.sql.gz

# Создание test DB
docker exec grilyage-postgres psql -U grilyage -c "DROP DATABASE IF EXISTS ${RESTORE_DB};"
docker exec grilyage-postgres psql -U grilyage -c "CREATE DATABASE ${RESTORE_DB};"

# Restore
docker exec -i grilyage-postgres psql -U grilyage -d "${RESTORE_DB}" < /tmp/restore.sql

# Verification
docker exec grilyage-postgres psql -U grilyage -d "${RESTORE_DB}" -c "SELECT COUNT(*) FROM orders;"
docker exec grilyage-postgres psql -U grilyage -d "${RESTORE_DB}" -c "SELECT COUNT(*) FROM users;"

# Cleanup
docker exec grilyage-postgres psql -U grilyage -c "DROP DATABASE ${RESTORE_DB};"
rm /tmp/restore.sql

echo "Restore test completed successfully"
```

**Cron для test restore (1-е число каждого месяца):**

```cron
0 3 1 * * root /opt/grilyage/scripts/test-restore.sh >> /var/log/grilyage-restore-test.log 2>&1
```

---

## 3. Uploads Backup

### 3.1. Скрипт backup

**Файл:** `scripts/backup-uploads.sh`

```bash
#!/bin/bash
set -euo pipefail

BACKUP_DIR="/var/backups/grilyage/uploads"
UPLOADS_DIR="/opt/grilyage/uploads"
TIMESTAMP=$(date +%Y%m%d)
BACKUP_FILE="${BACKUP_DIR}/uploads_${TIMESTAMP}.tar.gz"
RETENTION_DAYS=7

mkdir -p "${BACKUP_DIR}"

echo "Starting uploads backup..."
tar -czf "${BACKUP_FILE}" -C "${UPLOADS_DIR}" .

echo "Uploading to offsite storage..."
# aws s3 cp "${BACKUP_FILE}" s3://grilyage-backups/uploads/
# rsync -avz "${BACKUP_FILE}" user@backup-server:/backups/grilyage/uploads/

echo "Cleaning up old backups..."
find "${BACKUP_DIR}" -name "uploads_*.tar.gz" -type f -mtime +${RETENTION_DAYS} -delete

echo "Backup completed: ${BACKUP_FILE}"
logger -t grilyage-backup "Uploads backup completed: ${BACKUP_FILE}"
```

### 3.2. Cron job

```cron
# Uploads backup ежедневно в 2:00
0 2 * * * root /opt/grilyage/scripts/backup-uploads.sh >> /var/log/grilyage-backup.log 2>&1
```

---

## 4. Offsite Storage

### 4.1. Варианты

| Провайдер | Стоимость | Latency | Рекомендация |
|-----------|-----------|---------|--------------|
| **AWS S3** | ~$0.023/GB/месяц | Низкая | ✅ Рекомендуется |
| **Yandex Object Storage** | ~1.5₽/GB/месяц | Низкая (Россия) | ✅ Рекомендуется для РФ |
| **Другой VPS (rsync)** | Фиксированная | Средняя | ⚠️ Если нет S3 |
| **Backblaze B2** | ~$0.005/GB/месяц | Средняя | ✅ Бюджетный вариант |

### 4.2. AWS S3 настройка

**IAM Policy:**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::grilyage-backups",
        "arn:aws:s3:::grilyage-backups/*"
      ]
    }
  ]
}
```

**AWS CLI настройка:**

```bash
aws configure
# AWS Access Key ID: [YOUR_KEY]
# AWS Secret Access Key: [YOUR_SECRET]
# Default region name: eu-central-1
# Default output format: json
```

**S3 Lifecycle Policy (автоматическое удаление через 30 дней):**

```json
{
  "Rules": [
    {
      "ID": "DeleteOldBackups",
      "Status": "Enabled",
      "Filter": {
        "Prefix": ""
      },
      "Expiration": {
        "Days": 30
      }
    }
  ]
}
```

---

## 5. Monitoring

### 5.1. Метрики

| Метрика | Порог | Действие |
|---------|-------|----------|
| **Backup status** | Failed | Алерт немедленно |
| **Backup size** | < 10MB (аномалия) | Алерт |
| **Backup duration** | > 10 мин | Warning |
| **Disk space** | < 10% free | Алерт |
| **Offsite upload** | Failed | Алерт |

### 5.2. Алерты

**Prometheus Alertmanager rules:**

```yaml
groups:
  - name: backup_alerts
    rules:
      - alert: BackupFailed
        expr: grilyage_backup_success == 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Backup failed"
          description: "PostgreSQL backup failed at {{ $labels.instance }}"

      - alert: BackupTooOld
        expr: time() - grilyage_backup_last_success_timestamp > 7200
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Backup is older than 2 hours"
          description: "Last successful backup was {{ $value }}s ago"

      - alert: DiskSpaceLow
        expr: node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"} < 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Disk space low"
          description: "Less than 10% disk space remaining on {{ $labels.instance }}"
```

### 5.3. Dashboard (Grafana)

**Panels:**

1. **Backup Status** (Stat panel)
   - Query: `grilyage_backup_success`
   - Thresholds: 0 = red, 1 = green

2. **Last Backup Time** (Stat panel)
   - Query: `time() - grilyage_backup_last_success_timestamp`
   - Unit: seconds
   - Thresholds: 7200s (2h) = yellow, 14400s (4h) = red

3. **Backup Size** (Time series)
   - Query: `grilyage_backup_size_bytes`
   - Unit: bytes

4. **Disk Usage** (Gauge)
   - Query: `1 - (node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"})`
   - Unit: percent
   - Thresholds: 80% = yellow, 90% = red

---

## 6. Disaster Recovery Plan

### 6.1. Сценарий 1: Database Corruption

**Время:** ≤ 2 часа

**Шаги:**

1. **Остановить API:**
   ```bash
   docker compose -f infra/docker-compose.prod.yml stop api
   ```

2. **Найти последний backup:**
   ```bash
   ls -lt /var/backups/grilyage/postgres/ | head -5
   ```

3. **Расшифровать backup:**
   ```bash
   openssl enc -d -aes-256-cbc -pbkdf2 -in /var/backups/grilyage/postgres/grilyage_YYYYMMDD_HHMMSS.sql.gz.enc -out /tmp/restore.sql.gz -pass pass:"${BACKUP_ENCRYPTION_KEY}"
   gunzip /tmp/restore.sql.gz
   ```

4. **Восстановить БД:**
   ```bash
   docker exec grilyage-postgres psql -U grilyage -d grilyage -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
   docker exec -i grilyage-postgres psql -U grilyage -d grilyage < /tmp/restore.sql
   ```

5. **Запустить API:**
   ```bash
   docker compose -f infra/docker-compose.prod.yml start api
   ```

6. **Проверить health:**
   ```bash
   curl https://grillyage.ru/health
   ```

### 6.2. Сценарий 2: VPS Failure

**Время:** ≤ 4 часа

**Шаги:**

1. **Поднять новый VPS** (Terraform / manual)
   - Ubuntu 24.04
   - Docker + Docker Compose
   - Nginx + SSL

2. **Восстановить БД из offsite backup:**
   ```bash
   # Скачать backup из S3
   aws s3 cp s3://grilyage-backups/postgres/grilyage_LATEST.sql.gz.enc /tmp/
   # Расшифровать и восстановить (см. Сценарий 1)
   ```

3. **Восстановить uploads:**
   ```bash
   aws s3 cp s3://grilyage-backups/uploads/uploads_LATEST.tar.gz /tmp/
   tar -xzf /tmp/uploads_LATEST.tar.gz -C /opt/grilyage/uploads/
   ```

4. **Задеплоить приложения:**
   ```bash
   git clone https://github.com/your-org/grilyage.git /opt/grilyage
   cd /opt/grilyage
   docker compose -f infra/docker-compose.prod.yml up -d
   ```

5. **Обновить DNS:**
   - A record: `grillyage.ru` → новый VPS IP
   - TTL: 300 (5 мин) для быстрого propagation

6. **Проверить health:**
   ```bash
   curl https://grillyage.ru/health
   ```

### 6.3. Сценарий 3: Ransomware / Data Loss

**Время:** ≤ 8 часов

**Шаги:**

1. **Изолировать VPS:**
   ```bash
   ufw enable
   ufw default deny incoming
   ufw allow 22/tcp # только для администратора
   ```

2. **Forensic analysis:**
   - Сохранить логи: `/var/log/`
   - Проверить cron jobs: `crontab -l`, `/etc/cron.*`
   - Проверить SSH keys: `~/.ssh/authorized_keys`
   - Проверить процессы: `ps aux`

3. **Восстановить из offsite backup:**
   - См. Сценарий 2

4. **Сменить все секреты:**
   - JWT secrets
   - Database password
   - API keys (Yandex, Telegram, etc.)
   - SSH keys
   - SMTP password

5. **Обновить систему:**
   ```bash
   apt update && apt upgrade -y
   ```

6. **Запустить приложения:**
   ```bash
   docker compose -f infra/docker-compose.prod.yml up -d
   ```

7. **Мониторинг:**
   - Проверить логи на аномалии
   - Monitor Sentry для errors
   - Monitor Grafana для performance issues

---

## 7. Тестирование

### 7.1. Ежемесячные тесты

| Тест | Частота | Ответственный | Время |
|------|---------|---------------|-------|
| **Backup restore** | 1-е число месяца | DevOps | 30 мин |
| **Offsite backup download** | 1-е число месяца | DevOps | 15 мин |
| **Disaster recovery drill** | Ежеквартально | DevOps + Backend | 2 часа |

### 7.2. Checklist для test restore

- [ ] Backup расшифрован
- [ ] Backup разархивирован
- [ ] Test DB создана
- [ ] Данные восстановлены
- [ ] Количество записей проверено (`SELECT COUNT(*) FROM orders;`)
- [ ] Test DB удалена
- [ ] Результат задокументирован

---

## 8. Документация

### 8.1. Логи

**Файлы логов:**

- `/var/log/grilyage-backup.log` — backup operations
- `/var/log/grilyage-restore-test.log` — restore tests

**Ротация логов:**

```bash
# /etc/logrotate.d/grilyage-backup
/var/log/grilyage-backup.log /var/log/grilyage-restore-test.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
}
```

### 8.2. Runbook

**Быстрый reference для on-call инженера:**

```
ПРОБЛЕМА: Backup failed
РЕШЕНИЕ:
1. Проверить логи: tail -50 /var/log/grilyage-backup.log
2. Проверить disk space: df -h
3. Проверить PostgreSQL: docker exec grilyage-postgres psql -U grilyage -c "SELECT 1;"
4. Запустить backup вручную: /opt/grilyage/scripts/backup-postgres.sh
5. Если не работает — эскалация DevOps

ПРОБЛЕМА: Нужно восстановить БД
РЕШЕНИЕ:
1. Найти последний backup: ls -lt /var/backups/grilyage/postgres/
2. Расшифровать: openssl enc -d -aes-256-cbc -pbkdf2 -in <file>.enc -out /tmp/restore.sql.gz
3. Разархивировать: gunzip /tmp/restore.sql.gz
4. Восстановить: docker exec -i grilyage-postgres psql -U grilyage -d grilyage < /tmp/restore.sql
5. Проверить: curl https://grillyage.ru/health
```

---

## 9. Контакты

| Роль | Имя | Контакт | Время реакции |
|------|-----|---------|---------------|
| **DevOps** | — | Telegram / Phone | 15 мин (P0) |
| **Backend** | — | Telegram / Phone | 30 мин (P0) |
| **CTO** | — | Email / Phone | 24 часа (P2) |

---

*Backup strategy создана на основе AI_CTO.md §12, implementation-roadmap.md P0-4. Дата: июнь 2026.*
