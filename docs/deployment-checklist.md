# Deployment Checklist — Проект «Грильяж»

> **Дата:** июнь 2026  
> **Целевая платформа:** Ubuntu 24.04 VPS (Timeweb, 212.119.42.249)  
> **Статус:** PRE-PRODUCTION  
> **Ответственный:** DevOps + Backend

---

## Этап 1: Предварительная проверка (Pre-flight)

### 1.1. Код и зависимости

- [ ] Все P0-задачи из `implementation-roadmap.md` выполнены (минимум топ-5)
- [ ] `npm audit` — нет критических уязвимостей (`npm audit --audit-level=critical`)
- [ ] `npm ci` — чистая установка зависимостей (без `node_modules` в git)
- [ ] `packages/shared` собран (`npm run build --workspace packages/shared`)
- [ ] `apps/api` собирается без ошибок (`npm run build --workspace apps/api`)
- [ ] `apps/web` собирается без ошибок (`npm run build --workspace apps/web`)
- [ ] Все unit-тесты проходят (`npm test`)
- [ ] E2E-тесты CRM проходят (если реализованы)

### 1.2. Переменные окружения

- [ ] `.env.production` создан на основе `.env.example`
- [ ] Все REQUIRED_VARS из `env-validation.ts` заполнены реальными значениями
- [ ] `JWT_ACCESS_SECRET` — случайная строка ≥ 64 символа
- [ ] `JWT_REFRESH_SECRET` — случайная строка ≥ 64 символа
- [ ] `STAFF_JWT_ACCESS_SECRET` — случайная строка ≥ 64 символа
- [ ] `STAFF_JWT_REFRESH_SECRET` — случайная строка ≥ 64 символа
- [ ] `DATABASE_URL` — production PostgreSQL (не localhost dev)
- [ ] `SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD` — реальный SMTP (не Mailpit)
- [ ] `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `LIVEKIT_HOST` — реальный LiveKit
- [ ] `SENTRY_DSN` — production Sentry project
- [ ] `WEB_PUBLIC_URL` — `https://grillyage.ru` (или реальный домен)
- [ ] `.env.production` **НЕ** в git (`git check-ignore .env.production`)
- [ ] `.env.production` имеет права `600` (`chmod 600 .env.production`)

### 1.3. Секреты и безопасность

- [ ] Хардкод-пароли удалены из Python-скриптов (P0-1)
- [ ] `.env.production` не в git-истории (P0-8)
- [ ] Если был в git — секреты сменены, история очищена (`git filter-repo`)
- [ ] SSH-ключи настроены (без password-based auth)
- [ ] `fail2ban` установлен и настроен
- [ ] UFW firewall активен (только 22, 80, 443)
- [ ] PostgreSQL не слушает внешние порты (только 127.0.0.1 или Docker network)

---

## Этап 2: Инфраструктура VPS

### 2.1. Система

- [ ] Ubuntu 24.04 LTS установлена
- [ ] `apt update && apt upgrade -y` — система обновлена
- [ ] `unattended-upgrades` настроен (автоматические security updates)
- [ ] Timezone установлен: `timedatectl set-timezone Europe/Moscow` (или UTC)
- [ ] NTP синхронизация активна: `timedatectl status` → `NTP service: active`
- [ ] Swap настроен (если RAM < 4GB): `fallocate -l 2G /swapfile && mkswap /swapfile && swapon /swapfile`
- [ ] `/etc/fstab` обновлён для swap

### 2.2. Docker

- [ ] Docker установлен: `docker --version` (≥ 24.0)
- [ ] Docker Compose установлен: `docker compose version` (≥ 2.20)
- [ ] Docker daemon настроен на автозапуск: `systemctl enable docker`
- [ ] Пользователь добавлен в группу `docker`: `usermod -aG docker $USER`
- [ ] Docker log rotation настроен (`/etc/docker/daemon.json`):
  ```json
  {
    "log-driver": "json-file",
    "log-opts": {
      "max-size": "10m",
      "max-file": "3"
    }
  }
  ```
- [ ] Docker daemon перезапущен: `systemctl restart docker`

### 2.3. Nginx

- [ ] Nginx установлен: `nginx -v`
- [ ] Nginx настроен на автозапуск: `systemctl enable nginx`
- [ ] Конфиг для `grillyage.ru` создан (`/etc/nginx/sites-available/grillyage`)
- [ ] Reverse proxy для API (`/api/v1` → `localhost:4000`)
- [ ] Reverse proxy для Web (`/` → `localhost:3000`)
- [ ] WebSocket proxy настроен (`/socket.io` → `localhost:4000`, `upgrade` headers)
- [ ] Gzip compression включён
- [ ] Security headers добавлены (X-Frame-Options, X-Content-Type-Options, etc.)
- [ ] Rate limiting настроен (опционально, на уровне nginx)

### 2.4. SSL (Let's Encrypt)

- [ ] Certbot установлен: `apt install certbot python3-certbot-nginx`
- [ ] SSL-сертификат получен: `certbot --nginx -d grillyage.ru -d www.grillyage.ru`
- [ ] Auto-renewal настроен: `certbot renew --dry-run`
- [ ] Cron/systemd timer для auto-renewal: `systemctl list-timers | grep certbot`
- [ ] HTTP → HTTPS redirect настроен в Nginx
- [ ] SSL-сертификат валиден: `openssl s_client -connect grillyage.ru:443 -servername grillyage.ru`

### 2.5. Firewall (UFW)

- [ ] UFW установлен: `ufw version`
- [ ] Default policy: `ufw default deny incoming && ufw default allow outgoing`
- [ ] SSH разрешён: `ufw allow 22/tcp`
- [ ] HTTP разрешён: `ufw allow 80/tcp`
- [ ] HTTPS разрешён: `ufw allow 443/tcp`
- [ ] UFW активирован: `ufw enable`
- [ ] Статус проверен: `ufw status verbose`

---

## Этап 3: База данных

### 3.1. PostgreSQL

- [ ] PostgreSQL запущен через Docker Compose (`infra/docker-compose.prod.yml`)
- [ ] Контейнер здоров: `docker compose -f infra/docker-compose.prod.yml ps`
- [ ] База данных создана: `docker exec -it grilyage-postgres psql -U grilyage -d grilyage -c '\l'`
- [ ] Миграции применены: `npm run db:migrate:prod`
- [ ] Seed-данные загружены (если нужно): `npm run db:seed`
- [ ] Индексы созданы (проверить через `\di` в psql)
- [ ] Connection pool настроен (Prisma default: 10 connections)

### 3.2. Backup (критично!)

- [ ] Backup-скрипт создан (`scripts/backup-postgres.sh`)
- [ ] Backup работает: `./scripts/backup-postgres.sh`
- [ ] Backup-файл создан и валиден: `pg_restore --list backup.sql`
- [ ] Offsite storage настроен (S3 / другой VPS / rsync)
- [ ] Cron job для backup каждые 6 часов: `crontab -e`
- [ ] Test restore выполнен на staging: `pg_restore -d grilyage_test backup.sql`
- [ ] Encryption настроен (AES-256 для backup-файлов)
- [ ] Monitoring backup (алерт при failed backup)

---

## Этап 4: Приложения

### 4.1. API (NestJS)

- [ ] Docker image собран: `docker compose -f infra/docker-compose.prod.yml build api`
- [ ] Контейнер запущен: `docker compose -f infra/docker-compose.prod.yml up -d api`
- [ ] Health check проходит: `curl http://localhost:4000/health`
- [ ] API отвечает: `curl http://localhost:4000/api/v1/categories`
- [ ] Swagger доступен (только в dev, не в prod): `http://localhost:4000/api/docs`
- [ ] WebSocket gateway'и работают: проверить через `wscat` или браузер
- [ ] Логи пишутся: `docker logs grilyage-api --tail 50`
- [ ] StructuredLogger активен в production (JSON-формат)

### 4.2. Web (Next.js)

- [ ] Docker image собран: `docker compose -f infra/docker-compose.prod.yml build web`
- [ ] Контейнер запущен: `docker compose -f infra/docker-compose.prod.yml up -d web`
- [ ] Главная страница загружается: `curl http://localhost:3000`
- [ ] CRM доступна: `curl http://localhost:3000/admin/login`
- [ ] Статические файлы отдаются: `curl http://localhost:3000/favicon.ico`
- [ ] SSR работает (проверить `View Source` — HTML должен содержать контент)
- [ ] Логи пишутся: `docker logs grilyage-web --tail 50`

### 4.3. Redis (если используется)

- [ ] Redis запущен: `docker compose -f infra/docker-compose.prod.yml ps redis`
- [ ] Redis доступен: `docker exec -it grilyage-redis redis-cli ping`
- [ ] Persistence настроен (RDB + AOF)
- [ ] Memory limit настроен (`maxmemory 256mb`, `maxmemory-policy allkeys-lru`)

---

## Этап 5: Мониторинг и логирование

### 5.1. Sentry

- [ ] Sentry DSN настроен в `.env.production`
- [ ] Sentry инициализирован в `main.ts` (проверить логи)
- [ ] Test error отправлен: создать endpoint `/test-error` и вызвать его
- [ ] Error появился в Sentry dashboard
- [ ] Source maps загружены (если настроено)
- [ ] Alert rules настроены (email/Slack при spike errors)

### 5.2. Grafana + Loki + Prometheus

- [ ] Grafana запущен: `docker compose -f infra/docker-compose.prod.yml ps grafana`
- [ ] Loki запущен: `docker compose -f infra/docker-compose.prod.yml ps loki`
- [ ] Prometheus запущен: `docker compose -f infra/docker-compose.prod.yml ps prometheus`
- [ ] Grafana доступен: `http://localhost:3001` (или через nginx)
- [ ] Data sources настроены (Loki, Prometheus)
- [ ] Dashboards импортированы (Node.js, PostgreSQL, Docker)
- [ ] Promtail собирает логи из Docker containers
- [ ] Логи видны в Grafana Explore (Loki)

### 5.3. Alerting

- [ ] Prometheus Alertmanager настроен (если реализован)
- [ ] Alert rules созданы:
  - High CPU usage (> 70% за 5 мин)
  - High memory usage (> 80% за 5 мин)
  - High error rate (> 1% за 5 мин)
  - API down (health check failed)
  - PostgreSQL down
  - Disk space low (< 10%)
- [ ] Notifications настроены (email / Telegram / Slack)
- [ ] Test alert отправлен и получен

---

## Этап 6: Финальная проверка

### 6.1. Функциональное тестирование

- [ ] Регистрация нового пользователя работает
- [ ] Email verification приходит (реальный SMTP, не Mailpit)
- [ ] Login работает, JWT-токены выдаются
- [ ] Создание заказа работает
- [ ] WebSocket-уведомления о новом заказе приходят
- [ ] CRM login работает (staff JWT)
- [ ] Оператор может менять статусы заказов
- [ ] Курьер может обновлять GPS-локацию
- [ ] Чат между клиентом и оператором работает
- [ ] Загрузка изображений работает (admin only)

### 6.2. Производительность

- [ ] Lighthouse audit: Performance ≥ 80, Accessibility ≥ 90, SEO ≥ 90
- [ ] LCP (Largest Contentful Paint) < 2.5s
- [ ] API response time p95 < 500ms (проверить через Prometheus)
- [ ] Database query time < 100ms (проверить через Prisma logs)
- [ ] WebSocket latency < 100ms

### 6.3. Безопасность

- [ ] SSL Labs test: A+ rating (`https://www.ssllabs.com/ssltest/`)
- [ ] Security headers проверены (`https://securityheaders.com/`)
- [ ] CSP работает (нет violations в консоли браузера)
- [ ] CORS настроен корректно (только разрешённые origins)
- [ ] Rate limiting работает (проверить через `curl` с циклом)
- [ ] Penetration test выполнен (минимум OWASP Top 10)

### 6.4. Disaster Recovery

- [ ] Backup restore test выполнен (восстановить БД из backup)
- [ ] RTO (Recovery Time Objective) измерен: ≤ 4 часа
- [ ] RPO (Recovery Point Objective) проверен: ≤ 1 час
- [ ] Disaster recovery plan задокументирован
- [ ] Контакты для экстренных случаев записаны

---

## Этап 7: Go-Live

### 7.1. Pre-launch

- [ ] DNS записи настроены (A record → VPS IP)
- [ ] DNS propagation проверен: `dig grillyage.ru`
- [ ] SSL-сертификат валиден для домена
- [ ] Nginx reload: `systemctl reload nginx`
- [ ] Все контейнеры перезапущены: `docker compose -f infra/docker-compose.prod.yml restart`
- [ ] Health check проходит: `curl https://grillyage.ru/health`

### 7.2. Launch

- [ ] Smoke test выполнен (регистрация, заказ, оплата)
- [ ] Monitoring dashboards открыты (Grafana)
- [ ] Sentry errors monitored
- [ ] Logs monitored (Loki)
- [ ] Team on standby (разработчик, DevOps, product owner)

### 7.3. Post-launch

- [ ] Первые 24 часа: мониторинг каждые 2 часа
- [ ] Первые 7 дней: мониторинг каждые 8 часов
- [ ] Error rate < 0.5%
- [ ] Uptime ≥ 99.5%
- [ ] Performance metrics в норме
- [ ] User feedback собран и проанализирован

---

## Контакты и эскалация

| Роль | Имя | Контакт | Время реакции |
|------|-----|---------|---------------|
| **DevOps** | — | Telegram / Phone | 15 мин (P0) |
| **Backend** | — | Telegram / Phone | 30 мин (P0) |
| **Product Owner** | — | Telegram / Phone | 1 час (P1) |
| **CTO** | — | Email / Phone | 24 часа (P2) |

---

## Rollback plan

Если что-то пошло не так:

1. **Откатить код:** `git checkout previous-release-tag`
2. **Пересобрать образы:** `docker compose -f infra/docker-compose.prod.yml build`
3. **Перезапустить:** `docker compose -f infra/docker-compose.prod.yml up -d`
4. **Восстановить БД** (если нужно): `pg_restore -d grilyage backup.sql`
5. **Проверить health:** `curl https://grillyage.ru/health`
6. **Уведомить команду**

---

*Deployment checklist создан на основе AI_CTO.md, implementation-roadmap.md, audit.md. Дата: июнь 2026.*
