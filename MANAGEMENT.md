# Управление проектом «Грильяж» — краткая инструкция

> Практическое руководство для администратора: запуск, создание пользователей, деплой, бэкап.

---

## 1. Данные суперадмина (CRM)

После выполнения `npm run db:migrate` (которая запускает и seed) в системе создаётся учётная запись:

| Поле | Значение |
|------|----------|
| **Логин** | `admin` |
| **Пароль** | `admin123` |
| **Роль** | `ADMIN` |
| **URL входа** | `http://localhost:3000/admin/login` (dev) / `https://grillyage.ru/admin/login` (prod) |

⚠️ **Смените пароль сразу после первого входа** через `/admin/staff`.

> В seed-данных создаётся роль `ADMIN`, а не `SUPER_ADMIN`. Если нужен `SUPER_ADMIN`, используйте скрипт создания персонала (см. ниже) с `STAFF_ROLE=SUPER_ADMIN`.

---

## 2. Запуск в dev-режиме

```bash
# 1. Копируем env
cp .env.example .env

# 2. Поднимаем PostgreSQL + Mailpit
docker compose -f infra/docker-compose.yml up -d

# 3. Устанавливаем зависимости
npm install

# 4. Миграции + seed
npm run db:migrate

# 5. Запуск API (:4000) и Web (:3000)
npm run dev
```

| Сервис | URL |
|--------|-----|
| Сайт | http://localhost:3000 |
| CRM | http://localhost:3000/admin |
| API | http://localhost:4000/api/v1 |
| Swagger | http://localhost:4000/api/docs |
| Mailpit | http://localhost:8025 |

---

## 3. Создание пользователей

### 3.1. Персонал CRM (оператор, курьер, админ)

Через лаунчер-скрипт (читает переменные из `.env`):

```bash
# В .env задайте:
# STAFF_LOGIN=operator1
# STAFF_NAME=Иван Операторов
# STAFF_PASSWORD=securePass123
# STAFF_ROLE=OPERATOR   # или ADMIN, COURIER, SUPER_ADMIN

node apps/launcher/scripts/create-staff-user.js
```

**Роли:**
- `SUPER_ADMIN` — все права + управление персоналом
- `ADMIN` — полный доступ к CRM (каталог, заказы, акции, персонал)
- `OPERATOR` — заказы (просмотр, статусы, назначение курьера), чат
- `COURIER` — свои заказы, смена статусов, GPS-координаты

### 3.2. Клиент (demo-аккаунт)

```bash
# В .env задайте:
# CUSTOMER_EMAIL=demo@grilyage.ru
# CUSTOMER_NAME=Демо Пользователь
# CUSTOMER_PHONE=79001234567
# CUSTOMER_PASSWORD=demoPass123

node apps/launcher/scripts/create-customer-user.js
```

### 3.3. Через CRM UI

1. Войдите в CRM как `ADMIN` → `/admin/staff`
2. Создайте нового сотрудника (имя, логин, пароль, роль, active)
3. Для курьера укажите `transportType` (WALKING/CAR) и `deliveryRadius`

---

## 4. Лаунчер (Electron)

Desktop-приложение для локального управления проектом:

```bash
npm run launcher
```

Возможности:
- Запуск/стоп Docker-инфраструктуры, API, Web
- Просмотр логов
- Проверка статусов (Node, npm, Docker, .env, URL)
- `npm install`, Prisma migrate/seed
- Создание/обновление CRM-аккаунтов `ADMIN`/`OPERATOR`
- Создание клиентского demo-аккаунта
- Быстрый доступ к сайту, CRM, Swagger, Mailpit

---

## 5. Деплой на VPS

### 5.1. Автоматический (через CI/CD)

Push в `main` или `master` запускает:
1. **CI** (`.github/workflows/ci.yml`): lint, typecheck, тесты, сборка Docker-образов
2. **Deploy** (`.github/workflows/deploy.yml`): сборка образов → scp на VPS → `docker load` → `prisma migrate deploy` → restart api/web → health check

**Требуемые GitHub Secrets:**
- `VPS_HOST` — `212.119.42.249`
- `VPS_USER` — `root` (или выделенный пользователь)
- `VPS_SSH_KEY` — приватный SSH-ключ

### 5.2. Ручной деплой

```bash
# На VPS:
cd /opt/grilyage
git pull origin master
docker compose -f infra/docker-compose.prod.yml build
docker compose -f infra/docker-compose.prod.yml run --rm --no-deps api npx prisma migrate deploy
docker compose -f infra/docker-compose.prod.yml up -d
curl https://grillyage.ru/health
```

### 5.3. Переменные окружения (production)

`.env.production` на VPS должен содержать **реальные** значения:

| Переменная | Описание |
|-----------|----------|
| `POSTGRES_PASSWORD` | Сильный пароль БД (НЕ `CHANGE_ME`) |
| `JWT_ACCESS_SECRET` | Случайная строка ≥ 64 символов |
| `JWT_REFRESH_SECRET` | Случайная строка ≥ 64 символов |
| `STAFF_JWT_ACCESS_SECRET` | Случайная строка ≥ 64 символов |
| `STAFF_JWT_REFRESH_SECRET` | Случайная строка ≥ 64 символов |
| `SMTP_HOST` / `SMTP_USER` / `SMTP_PASSWORD` | Yandex SMTP |
| `YANDEX_CLIENT_SECRET` | OAuth Yandex |
| `TELEGRAM_BOT_TOKEN` | Telegram Bot |
| `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` | LiveKit |
| `SENTRY_DSN` | Sentry error tracking |
| `WEB_PUBLIC_URL` | `https://grillyage.ru` |

Сгенерировать секреты: `openssl rand -hex 64`

---

## 6. Бэкап PostgreSQL

### 6.1. Ручной бэкап

```bash
# На VPS:
docker exec grilyage-postgres pg_dump -U grilyage -d grilyage > /var/backups/grilyage_$(date +%Y%m%d_%H%M%S).sql
```

### 6.2. Автоматический (cron)

```bash
# /etc/cron.d/grilyage-backup
0 */6 * * * root /opt/grilyage/scripts/backup-postgres.sh >> /var/log/grilyage-backup.log 2>&1
```

### 6.3. Восстановление

```bash
docker compose -f infra/docker-compose.prod.yml stop api
docker exec grilyage-postgres psql -U grilyage -d grilyage -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
docker exec -i grilyage-postgres psql -U grilyage -d grilyage < /var/backups/grilyage_YYYYMMDD.sql
docker compose -f infra/docker-compose.prod.yml start api
curl https://grillyage.ru/health
```

---

## 7. Управление каталогом

Через CRM: `/admin/catalog`

- **Категории** (Новинки, Кулинария, Пекарня, Кондитерская, Бизнес-ланч)
- **Подкатегории** (внутри категорий)
- **Товары** (название, описание, цена, КБЖУ, вес, фото, isNew, active)
- **Акции** (`/admin/promotions`) — title, description, discountPercent, startsAt/endsAt

Загрузка фото товара: через `/staff/uploads/file` (multipart, конвертация в WebP 800×800 + thumbnail 320×320).

---

## 8. Управление заказами

### Жизненный цикл

```
NEW → CONFIRMED → COOKING → DELIVERING → COMPLETED
                         → READY_FOR_PICKUP → COMPLETED
   ↓       ↓        ↓          ↓                  ↓
CANCELLED (на любом этапе)
```

### CRM: `/admin/orders`

- Список с фильтром по статусу
- Детали заказа (товары, доставка, оплата, адрес, комментарий)
- Кнопки перехода статусов
- Назначение курьера (`POST /staff/orders/:id/assign`)

### Назначение курьера

```bash
curl -X POST https://grillyage.ru/api/v1/staff/orders/<order_id>/assign \
  -H "Cookie: staff_token=<token>" \
  -H "Content-Type: application/json" \
  -d '{"courierId":"<staff_user_id>"}'
```

---

## 9. Тесты

```bash
npm test              # unit + e2e API
npm run test:e2e      # Playwright (web)
```

---

## 10. Мониторинг (production)

| Сервис | URL | Назначение |
|--------|-----|------------|
| Grafana | http://localhost:3001 | Дашборды |
| Prometheus | http://localhost:9090 | Метрики |
| Loki | http://localhost:3100 | Логи |
| Sentry | https://sentry.io | Error tracking |

Health check: `GET https://grillyage.ru/health` → `{ "status": "ok", ... }`

---

## 11. Мобильные приложения

### Клиентское (`apps/mobile`)

```bash
cd apps/mobile
flutter pub get
flutter run                    # debug
flutter build apk              # release Android
flutter build ios              # release iOS (нужен macOS + Xcode)
```

Base URL: `https://grillyage.ru/api/v1/mobile` (prod)

### Курьерское (`apps/courier`)

```bash
cd apps/courier
flutter pub get
flutter run
flutter build apk
```

Base URL: настраивается в `packages/mobile_shared`

> ⚠️ Курьерское приложение пока только для Android (нет `ios/` директории).

---

## 12. Частые операции

### Сменить пароль админа

```bash
# Через скрипт (в .env задайте STAFF_LOGIN=admin, STAFF_PASSWORD=новый_пароль):
node apps/launcher/scripts/create-staff-user.js
```

### Пересоздать seed-данные

```bash
npm run db:seed    # удаляет товары/категории/акции и создаёт заново
```

> ⚠️ `db:seed` удаляет все товары, категории и акции, но НЕ затрагивает заказы и пользователей.

### Очистить истёкшие OTP/токены

Вручную (cron-задача не реализована):

```sql
DELETE FROM "OtpCode" WHERE "expiresAt" < NOW();
DELETE FROM "RefreshToken" WHERE "expiresAt" < NOW() OR "revokedAt" IS NOT NULL;
DELETE FROM "EmailToken" WHERE "expiresAt" < NOW();
```

---

## 13. Структура проекта

```
apps/
  api/       — NestJS API + WebSocket + Prisma
  web/       — Next.js: сайт + CRM
  mobile/    — Flutter (клиент)
  courier/   — Flutter (курьер)
  operator/  — Electron (оператор)
  launcher/  — Electron (лаунчер)
packages/
  shared/         — TypeScript типы, DTO, константы
  mobile_shared/  — Dart shared код (ApiClient, модели)
infra/
  docker-compose.yml        — dev
  docker-compose.prod.yml   — prod
  nginx/  smtp/  livekit/  monitoring/  terraform/
```

---

## 14. Контакты и эскалация

| Роль | Время реакции (P0) |
|------|---------------------|
| DevOps | 15 мин |
| Backend | 30 мин |
| Product Owner | 1 час |

**При падении production:**
1. Проверить `curl https://grillyage.ru/health`
2. `docker compose -f infra/docker-compose.prod.yml ps`
3. `docker logs grilyage-api --tail 50`
4. При необходимости — rollback: `git checkout <previous-tag> && docker compose build && docker compose up -d`

---

*Инструкция актуальна на июнь 2026. Обновляйте при изменении архитектуры.*
