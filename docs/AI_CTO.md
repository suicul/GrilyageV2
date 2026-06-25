# AI CTO — Главный источник знаний о проекте «Грильяж»

> **Статус:** ACTIVE  
> **Версия:** 1.0  
> **Дата:** июнь 2026  
> **Автор:** CTO проекта  
> **Аудитория:** все AI-агенты, работающие над проектом  
> **Приоритет:** этот документ имеет высший приоритет при принятии архитектурных и продуктовых решений

---

## Как использовать этот документ

Этот документ — **единый источник истины** о проекте для всех AI-агентов. При любом решении сверяйтесь с ним в первую очередь.

**Иерархия документов:**

1. **`AI_CTO.md`** (этот документ) — стратегия, принципы, требования. **Высший приоритет.**
2. **`project-map.md`** — фактическая карта кодовой базы, модулей, API, БД.
3. **`current-state.md`** — аудит зрелости, техдолг, риски.
4. **`AGENTS.md`** — правила работы агентов (совместимость, безопасность, простота).

**При конфликте:** `AI_CTO.md` > `AGENTS.md` > `project-map.md` > `current-state.md`.

**Ключевые слова:**

- **MUST** — обязательное требование. Нарушение = блокирующий дефект.
- **SHOULD** — сильная рекомендация. Отклонение требует явного обоснования.
- **MAY** — опционально. Применяется по ситуации.
- **NEVER** — категорический запрет. Нарушение = откат изменений.

---

## 1. Назначение проекта

**«Грильяж»** — цифровая платформа гастрохауса «Грильяж» (Омск), объединяющая 4 канала взаимодействия с клиентами и внутреннюю CRM:

| Канал | Приложение | Аудитория |
|-------|-----------|-----------|
| Публичный сайт | `apps/web` (Next.js) | Гости и зарегистрированные клиенты |
| Мобильное приложение | `apps/mobile` (Flutter) | Постоянные клиенты |
| Курьерское приложение | `apps/courier` (Flutter) | Курьеры на доставке |
| Операторское ПО | `apps/operator` (Electron) + `apps/web/admin` (CRM) | Операторы, администраторы |
| API | `apps/api` (NestJS) | Все клиенты + интеграции |

**Бизнес-модель:** доставка еды и самовывоз из гастрохауса. Выручка — через продажу блюд и напитков. Доставка — дополнительная услуга (199₽ базовая, бесплатно от 1500₽).

**География:** Омск и пригород. Радиус доставки — до 5 км от кафе (координаты `54.9893, 73.3682`).

**Часы работы:** Пн-Пт 08:00–21:00, Сб-Вс 09:00–21:00 (`WORKING_HOURS` в `packages/shared`).

**Целевая аудитория:**
- Жители Омска 25–55 лет
- Средний чек: 800–1500₽
- Повторные заказы: целевой показатель 40%

---

## 2. Архитектурные принципы

### 2.1. Фундаментальные принципы

**P1. Монорепо с npm workspaces**

Все TypeScript-приложения в одном репозитории. Общие типы, DTO и константы — в `packages/shared`. Flutter-приложения — отдельные пакеты без общего Dart-кода (текущий техдолг, см. `current-state.md#6`).

**P2. Копейки как валютная инварианта**

Все денежные суммы в БД и API хранятся в **копейках** (Int). Отображение — через `formatPrice()` / `formatProductPrice()` из `packages/shared`. Товары: `priceRubles` + `priceKopecks` (для UI). Итоги заказов: `itemsTotal`, `deliveryCost`, `total` — всегда в копейках.

**NEVER:** не используйте `float` / `decimal` для денег. Только `Int`.

**P3. Prisma как single source of truth для схемы БД**

Все изменения схемы — через `prisma/schema.prisma` + миграции. Ручные SQL-запросы запрещены. Seed-данные — в `prisma/seed.ts`.

**P4. Модульность NestJS**

Каждый домен — отдельный модуль (`AuthModule`, `OrdersModule`, `CatalogModule` и т.д.). Глобальные модули (`PrismaModule`, `EmailModule`) — только для действительно глобальных сервисов.

**P5. Dual JWT для разделения доменов**

Клиенты и персонал — два независимых JWT-домена с отдельными секретами, стратегиями и guards. Никогда не смешивайте.

**P6. WebSocket для realtime**

Все события, требующие мгновенной доставки (новые заказы, статусы, чат, GPS-трекинг) — через Socket.IO. 5 gateway'ев: `/staff`, `/orders`, `/mobile`, `/chat`, `/calls`.

**P7. Offline-first для мобильных**

Flutter-приложения должны работать при потере связи. Hive-кэш для меню и корзины. Dio interceptor: GET-запросы кэшируются, при offline — fallback на кэш. `OfflineIndicator` — обязательный UI-элемент.

**P8. Event-driven, не cron-driven**

Все операции — event-driven (создание заказа → push, смена статуса → WebSocket). Cron-задачи — только для действительно периодических операций (очистка истёкших токенов, деактивация акций).

**P9. Простота важнее совершенства**

Из `AGENTS.md`: «Простота поддержки важнее сложных архитектурных решений». Не вводите новые слои, абстракции, библиотеки без явной необходимости. Дублирование > преждевременная абстракция.

**P10. Безопасность важнее скорости**

Из `AGENTS.md`: «Безопасность важнее скорости разработки». Никаких `as any`, `@ts-ignore`, хардкод-паролей, `unsafe-inline` без плана миграции.

### 2.2. Анти-паттерны (NEVER)

- **NEVER:** `as any`, `@ts-ignore`, `@ts-expect-error`
- **NEVER:** пустые `catch(e) {}` блоки
- **NEVER:** хардкод-пароли, секреты, API-ключи в коде
- **NEVER:** `float` / `decimal` для денег
- **NEVER:** ручные SQL-запросы в обход Prisma
- **NEVER:** смешивание client и staff JWT-доменов
- **NEVER:** синхронные операции в async-контексте (блокируют event loop)
- **NEVER:** удаление failing-тестов для «зелёного» билда
- **NEVER:** коммит без явного запроса пользователя
- **NEVER:** `background_cancel(all=true)` — только по taskId

---

## 3. Бизнес-цели

### 3.1. Ключевые метрики (KPI)

| Метрика | Целевое значение | Измерение |
|---------|------------------|-----------|
| **Конверсия** (гость → заказ) | ≥ 3.5% | Google Analytics / Yandex.Metrica |
| **Retention** (повторные заказы) | ≥ 40% | Когортный анализ в БД |
| **AOV** (средний чек) | ≥ 1000₽ | `AVG(total)` из `Order` |
| **Время доставки** | ≤ 45 мин | `completedAt - createdAt` для DELIVERY |
| **NPS** (лояльность) | ≥ 50 | Опросы (не реализовано) |
| **Uptime** | ≥ 99.5% | Внешний мониторинг (не реализовано) |
| **Error rate** | ≤ 0.5% | Sentry |
| **Mobile crash rate** | ≤ 0.1% | Firebase Crashlytics (не реализовано) |

### 3.2. Продуктовые приоритеты

**P0 — Критические (блокеры production):**

1. Онлайн-оплата (YooKassa / CloudPayments / Stripe)
2. Реальные OAuth-ключи (VK, Yandex)
3. SMS-интеграция (SMS.ru)
4. iOS-сборка мобильного приложения
5. Курьерская навигация (`url_launcher`)

**P1 — Высокий приоритет:**

6. Push-уведомления для курьера
7. Гекодинг адресов (Yandex Geocoder API)
8. Cron-задачи (очистка OTP, refresh-токенов, деактивация акций)
9. E2E-тесты для CRM
10. Monitoring alerts (Prometheus Alertmanager)

**P2 — Средний приоритет:**

11. Nonce-based CSP (вместо `'unsafe-inline'`)
12. 2FA для персонала
13. Backup PostgreSQL (автоматический)
14. APM (Jaeger / Zipkin)
15. Операторское ПО: замена `alert()` на реальный LiveKit

### 3.3. Ограничения

- **Бюджет:** VPS Timeweb (212.119.42.249), ограниченные ресурсы
- **Команда:** 1 разработчик + AI-агенты
- **Сроки:** production-ready к Q3 2026
- **Compliance:** 152-ФЗ (персональные данные), GDPR (если EU-клиенты)

---

## 4. Роли пользователей

### 4.1. Типы пользователей

| Роль | Модель | Возможности | Ограничения |
|------|--------|-------------|-------------|
| **Guest** | — | Просмотр каталога, корзина, оформление заказа (без привязки к аккаунту) | Нет истории заказов, нет профиля |
| **Registered User** | `User` (isActive=false) | Всё выше + верификация email/телефона | Нет доступа к кабинету до верификации |
| **Verified User** | `User` (isActive=true) | Всё выше + личный кабинет, история заказов, адреса, чат, звонки | — |
| **Loyal Customer** | `User` + `UserConsent` | Всё выше + согласие на маркетинг | — |

### 4.2. Жизненный цикл пользователя

```
Guest → Registered (email+password / OAuth / OTP)
  → Verified (emailVerifiedAt / phoneVerifiedAt)
    → Active (isActive=true)
      → Loyal (UserConsent.marketingAcceptedAt)
```

### 4.3. Требования к пользовательскому опыту

**MUST:**

- Регистрация ≤ 30 секунд (OTP — 1 клик)
- Оформление заказа ≤ 2 минут
- Время загрузки главной страницы ≤ 2 секунды (LCP)
- Offline-режим для мобильных (просмотр кэшированного меню)
- Push-уведомления о статусе заказа

**SHOULD:**

- Повтор заказа в 1 клик
- Избранные адреса
- История заказов за 12 месяцев
- Чат с оператором в реальном времени

**MAY:**

- Программа лояльности (бонусы, скидки)
- Отзывы и рейтинги блюд
- Push-уведомления об акциях (только с `marketingAcceptedAt`)

---

## 5. Роли операторов

### 5.1. Типы операторов

| Роль | Enum | Возможности | Ограничения |
|------|------|-------------|-------------|
| **SUPER_ADMIN** | `SUPER_ADMIN` | Все права ADMIN + управление персоналом (создание/удаление) | — |
| **ADMIN** | `ADMIN` | Полный доступ к CRM: каталог, заказы, акции, персонал, загрузки | Не может создавать SUPER_ADMIN |
| **OPERATOR** | `OPERATOR` | Заказы (просмотр, смена статусов, назначение курьера), чат с клиентами | Нет доступа к каталогу, акциям, персоналу |

### 5.2. Матрица прав доступа

| Действие | SUPER_ADMIN | ADMIN | OPERATOR |
|----------|-------------|-------|----------|
| Просмотр заказов | ✅ | ✅ | ✅ |
| Смена статуса заказа | ✅ | ✅ | ✅ |
| Назначение курьера | ✅ | ✅ | ✅ |
| Чат с клиентами | ✅ | ✅ | ✅ |
| Управление каталогом | ✅ | ✅ | ❌ |
| Управление акциями | ✅ | ✅ | ❌ |
| Управление персоналом | ✅ | ✅ | ❌ |
| Создание SUPER_ADMIN | ✅ | ❌ | ❌ |
| Загрузка файлов | ✅ | ✅ | ❌ |

### 5.3. Требования к операторскому опыту

**MUST:**

- Время отклика CRM ≤ 500ms
- Realtime-обновления заказов (WebSocket)
- Звуковой алерт при новом заказе (не реализовано)
- Авторизация через httpOnly cookie (не localStorage)
- Автоматический logout при неактивности 30 минут (не реализовано)

**SHOULD:**

- Фильтрация заказов по дате, статусу, клиенту
- Поиск по номеру заказа, телефону, имени
- Экспорт заказов в CSV/Excel
- Массовые операции (смена статусов)
- Дашборд с метриками (выручка, заказы, популярные блюда)

**MAY:**

- 2FA для входа
- История действий (audit log)
- Уведомления в Telegram/Slack

---

## 6. Роли курьеров

### 6.1. Курьер

| Роль | Enum | Возможности | Ограничения |
|------|------|-------------|-------------|
| **COURIER** | `COURIER` | Просмотр назначенных заказов, смена статусов, GPS-трекинг | Нет доступа к другим заказам, каталогу, акциям |

### 6.2. Атрибуты курьера

- `transportType`: `WALKING` / `CAR`
- `deliveryRadius`: радиус доставки в км (default 5)
- `lastLatitude`, `lastLongitude`, `lastLocationAt`: последние GPS-координаты

### 6.3. Жизненный цикл доставки

```
ORDER ASSIGNED → COURIER PICKS UP (READY_FOR_PICKUP → DELIVERING)
  → GPS TRACKING STARTS (PATCH /staff/location every 10s)
    → COURIER DELIVERS (DELIVERING → COMPLETED)
      → GPS TRACKING STOPS
```

### 6.4. Требования к курьерскому опыту

**MUST:**

- Push-уведомления о новых заказах (не реализовано)
- GPS-трекинг в фоне (foreground service)
- Навигация к адресу заказа (через `url_launcher`, не реализовано)
- Offline-режим (кэш назначенных заказов, не реализовано)
- Время отклика приложения ≤ 300ms

**SHOULD:**

- История доставок
- Статистика заработка
- Кнопка «Позвонить клиенту»
- Кнопка «Открыть чат с оператором»

**MAY:**

- Gamification (бонусы за скорость, рейтинг)
- Интеграция с Яндекс.Навигатором / 2ГИС

---

## 7. Требования к безопасности

### 7.1. Аутентификация и авторизация

**MUST:**

- **Пароли:** bcrypt, rounds=12 (не меньше)
- **JWT access-токен:** TTL ≤ 15 минут
- **JWT refresh-токен:** TTL ≤ 30 дней, ротация при refresh (старый отзывается)
- **Staff access-токен:** httpOnly cookie, `Secure` flag в production, `SameSite=Lax`
- **Dual JWT:** отдельные секреты для client и staff доменов
- **Rate-limiting:** ThrottlerModule (3 tier: 3/20/100 за 1s/10s/60s)
- **ValidationPipe:** `whitelist: true`, `transform: true`, `forbidNonWhitelisted: true`

**SHOULD:**

- **2FA** для персонала (TOTP / SMS)
- **Account lockout** после 5 неудачных попыток (15 минут)
- **Password reset** через email (endpoint не реализован)
- **Session management** (список активных сессий, принудительный отзыв)

**NEVER:**

- Хранение паролей в plaintext
- JWT-секреты в коде / `.env` в git
- `as any`, `@ts-ignore`
- Смешивание client и staff JWT-доменов

### 7.2. Защита данных

**MUST:**

- **HTTPS** везде (Let's Encrypt, auto-renewal)
- **Helmet CSP** с whitelist (Yandex, Sentry, Google Fonts, unpkg)
- **CORS** с whitelist origins + Tailscale
- **CSRF-проверка** Content-Type для state-changing запросов
- **152-ФЗ:** `UserConsent` с IP + UserAgent при регистрации
- **PII scrubbing** в логах (email, телефон, пароль — маскировать)

**SHOULD:**

- **Nonce-based CSP** вместо `'unsafe-inline'` (TODO P2)
- **`__Host-` prefix** для cookie
- **MX-record check** при валидации email
- **WAF** (Web Application Firewall)

**NEVER:**

- Логи с plaintext-паролями
- PII в URL-параметрах
- `unsafe-inline` без плана миграции

### 7.3. Инфраструктурная безопасность

**MUST:**

- ** Secrets management:** Vault / SOPS (не `.env` в git)
- **Dependency scanning:** `npm audit` в CI
- **Container scanning:** Trivy / Snyk для Docker-образов
- **Firewall:** UFW / iptables на VPS (только 80, 443, 22)
- **SSH key-only** (без password auth)

**SHOULD:**

- **Fail2ban** для SSH / nginx
- **Intrusion detection** (OSSEC / Wazuh)
- **Penetration testing** раз в 6 месяцев

**NEVER:**

- Хардкод-пароли в коде / скриптах (текущий техдолг: 76 Python-скриптов)
- Root-доступ по SSH (использовать sudo-user)
- Открытые порты БД (PostgreSQL только internal network)

---

## 8. Требования к API

### 8.1. Архитектура

**MUST:**

- **REST** для CRUD-операций
- **WebSocket** (Socket.IO) для realtime-событий
- **Versioning:** `/api/v1` (текущая версия)
- **Swagger:** `/api/docs` с двумя bearer-схемами (customer-jwt, staff-jwt)
- **Health-check:** `GET /health` (DB ping, без префикса)
- **Graceful shutdown:** закрытие WS-соединений + DB pool

**SHOULD:**

- **API versioning strategy:** при breaking changes — `/api/v2`, поддержка v1 ≥ 6 месяцев
- **Request ID:** `X-Request-ID` header для трейсинга
- **Pagination:** `?page=1&limit=20` для списков (не реализовано)
- **Filtering:** query-параметры для фильтрации (частично реализовано)
- **Sorting:** `?sort=createdAt&order=desc` (не реализовано)

### 8.2. Контракты

**MUST:**

- **DTO:** все входные данные — через DTO с `class-validator`
- **Response format:** консистентный JSON (унифицированная структура ошибок)
- **Status codes:** 200 (OK), 201 (Created), 204 (No Content), 400 (Bad Request), 401 (Unauthorized), 403 (Forbidden), 404 (Not Found), 429 (Too Many Requests), 500 (Internal Server Error)
- **Error format:** `{ code: string, message: string, details?: any }`

**SHOULD:**

- **OpenAPI 3.0** spec (автогенерация из Swagger)
- **Contract testing** (Pact / Dredd)
- **Backward compatibility** при изменениях

### 8.3. Производительность

**MUST:**

- **Response time:** p95 ≤ 500ms для CRUD, p95 ≤ 200ms для GET
- **Database queries:** N+1 запрещены (использовать `include` / `select`)
- **Connection pooling:** Prisma connection pool (default 10)

**SHOULD:**

- **Caching:** Redis для часто запрашиваемых данных (каталог, акции)
- **Compression:** gzip для JSON-ответов
- **CDN:** для статических файлов (uploads, images)

### 8.4. Тестирование

**MUST:**

- **Unit tests:** ≥ 80% coverage для сервисов
- **Integration tests:** все endpoints
- **E2E tests:** критические user flows (регистрация, заказ, оплата)

**SHOULD:**

- **Load testing:** k6 / Artillery (целевая нагрузка: 100 RPS)
- **Contract testing:** Pact для API-контрактов

---

## 9. Требования к инфраструктуре

### 9.1. Текущая инфраструктура

- **VPS:** Timeweb (212.119.42.249), Ubuntu 24.04
- **Docker:** Compose для оркестрации
- **PostgreSQL:** 17-alpine
- **Nginx:** reverse proxy + Let's Encrypt
- **CI/CD:** GitHub Actions

### 9.2. Требования

**MUST:**

- **Uptime:** ≥ 99.5% (≤ 43 часа простоя в год)
- **Backup:** ежедневный pg_dump, хранение 30 дней, offsite (S3 / другой VPS)
- **Monitoring:** Grafana + Loki + Prometheus + Sentry
- **Alerting:** Prometheus Alertmanager (не реализовано)
- **SSL:** Let's Encrypt, auto-renewal, мониторинг expiry
- **Firewall:** UFW (80, 443, 22 SSH)

**SHOULD:**

- **High availability:** read replica для PostgreSQL, load balancer
- **CDN:** для статических файлов (uploads, images)
- **Container registry:** приватный registry (не build на VPS)
- **Infrastructure as Code:** Terraform / Pulumi
- **Disaster recovery plan:** RTO ≤ 4 часа, RPO ≤ 1 час

**NEVER:**

- Single point of failure (один VPS, один postgres, один api)
- Открытые порты БД / Redis
- `.env` файлы в git
- Build на production-сервере (использовать CI/CD)

### 9.3. Окружения

| Окружение | Назначение | Домен | Особенности |
|-----------|-----------|-------|-------------|
| **Local** | Разработка | `localhost:3000` / `:4000` | Docker Compose dev, Mailpit |
| **Staging** | Тестирование | `staging.grillyage.ru` (не реализовано) | Prod-like инфраструктура |
| **Production** | Боевое | `grillyage.ru` | Monitoring, backup, SSL |

---

## 10. Требования к мобильным приложениям

### 10.1. Платформы

| Приложение | Платформы | Статус |
|-----------|-----------|--------|
| **Mobile** (клиент) | Android (minSdk 26) + iOS | Android ready, iOS permissions отсутствуют |
| **Courier** | Android only | Нет iOS |

### 10.2. Требования

**MUST:**

- **Offline-first:** Hive-кэш для меню и корзины, Dio interceptor для GET-запросов
- **Push-уведомления:** FCM + RuStore Push (для RuStore)
- **GPS-трекинг:** foreground service для курьера, отправка каждые 10с
- **Realtime:** Socket.IO для чата, трекинга заказов, звонков
- **Crash reporting:** Firebase Crashlytics (не реализовано)
- **Analytics:** Firebase Analytics (screen view events)
- **Performance:** время запуска ≤ 2 секунды, время отклика ≤ 300ms

**SHOULD:**

- **Deep linking:** открытие конкретных экранов из push / ссылок
- **Biometric auth:** Face ID / Touch ID для входа
- **App update:** принудительное обновление при критических изменениях API
- **A/B testing:** Firebase Remote Config

**NEVER:**

- Блокировка UI при сетевых запросах (использовать skeleton loaders)
- Хранение токенов в plaintext (использовать `flutter_secure_storage`)
- Хардкод API-ключей (использовать `.env` + build-time injection)

### 10.3. iOS-специфика

**MUST:**

- **Permission usage descriptions** в `Info.plist`:
  - `NSLocationWhenInUseUsageDescription`
  - `NSCameraUsageDescription`
  - `NSMicrophoneUsageDescription`
  - `NSUserNotificationUsageDescription`
- **App Store Review Guidelines:** соблюдение всех требований Apple
- **TestFlight:** бета-тестирование перед релизом

---

## 11. Требования к масштабированию

### 11.1. Текущие ограничения

- **Single-node:** один VPS, один postgres, один api, один web
- **Нет load balancing**
- **Нет read replicas**
- **Нет CDN**
- **Нет horizontal scaling**

### 11.2. План масштабирования

**Этап 1: Vertical scaling (текущий)**

- Увеличение ресурсов VPS (CPU, RAM, disk)
- Оптимизация запросов к БД (N+1, индексы)
- Кэширование в Redis (не реализовано)

**Этап 2: Read replicas (при > 1000 RPS)**

- PostgreSQL read replica для GET-запросов
- Prisma: `reads: ['replica1', 'replica2']`
- Write-запросы — только в primary

**Этап 3: Horizontal scaling (при > 5000 RPS)**

- Load balancer (HAProxy / nginx)
- Несколько инстансов api (stateless, sessions в Redis)
- Несколько инстансов web (Next.js standalone)
- WebSocket sticky sessions (по IP / cookie)

**Этап 4: CDN + Edge (при > 10000 RPS)**

- Cloudflare / Yandex CDN для статики
- Edge caching для каталога (TTL 5 минут)
- Image optimization (Sharp на edge)

### 11.3. Метрики для масштабирования

| Метрика | Порог | Действие |
|---------|-------|----------|
| **CPU usage** | > 70% (5 мин) | Vertical scaling |
| **Memory usage** | > 80% (5 мин) | Vertical scaling |
| **DB connections** | > 80% pool | Read replica |
| **Response time p95** | > 1s (5 мин) | Horizontal scaling |
| **Error rate** | > 1% (5 мин) | Alert + investigation |
| **RPS** | > 1000 | Read replica |
| **RPS** | > 5000 | Horizontal scaling |

---

## 12. Требования к резервному копированию

### 12.1. RPO / RTO

| Метрика | Значение | Описание |
|---------|----------|----------|
| **RPO** (Recovery Point Objective) | ≤ 1 час | Максимальная потеря данных |
| **RTO** (Recovery Time Objective) | ≤ 4 часа | Максимальное время восстановления |

### 12.2. Стратегия backup

**MUST:**

- **PostgreSQL:** `pg_dump` каждые 6 часов, хранение 30 дней
- **Offsite:** S3 / другой VPS (не тот же сервер)
- **Encryption:** AES-256 для backup-файлов
- **Test restore:** раз в месяц (автоматический тест на staging)
- **Monitoring:** алерт при failed backup

**SHOULD:**

- **WAL archiving:** continuous archiving для point-in-time recovery
- **Incremental backup:** для больших БД (> 100 GB)
- **Backup verification:** checksum + test restore

**NEVER:**

- Backup на тот же сервер
- Backup без encryption
- Backup без test restore

### 12.3. Disaster recovery plan

**Сценарий 1: VPS failure**

1. Поднять новый VPS из Terraform / Pulumi
2. Восстановить PostgreSQL из последнего backup
3. Задеплоить api + web из CI/CD
4. Обновить DNS (A record)
5. Verify health-check

**Время:** ≤ 4 часа (RTO)

**Сценарий 2: Database corruption**

1. Остановить api
2. Восстановить PostgreSQL из backup (point-in-time recovery)
3. Verify data integrity
4. Запустить api

**Время:** ≤ 2 часа

**Сценарий 3: Ransomware / data loss**

1. Изолировать VPS (firewall)
2. Восстановить из offsite backup
3. Сменить все секреты (JWT, DB password, API keys)
4. Forensic analysis
5. Запустить api + web

**Время:** ≤ 8 часов

---

## 13. Требования к логированию

### 13.1. Формат логов

**MUST:**

- **Structured JSON** в production (`StructuredLogger`)
- **Обязательные поля:**
  - `timestamp` (ISO 8601)
  - `level` (debug, info, warn, error)
  - `message`
  - `service` (api, web, mobile, courier)
  - `requestId` (correlation ID для трейсинга)
- **Опциональные поля:**
  - `userId` / `staffUserId`
  - `orderId`
  - `method`, `url`, `status`, `duration` (для HTTP)
  - `error.stack` (для ошибок)

**NEVER:**

- Plaintext-логи в production
- PII в логах (email, телефон, пароль — маскировать)
- `console.log` в production (использовать `StructuredLogger`)

### 13.2. Уровни логирования

| Уровень | Назначение | Пример |
|---------|-----------|--------|
| **debug** | Отладочная информация (только в dev) | SQL-запросы, DTO validation |
| **info** | Нормальные операции | HTTP-запросы, создание заказа, смена статуса |
| **warn** | Предупреждения (не критично) | Rate-limit, retry, fallback |
| **error** | Ошибки (требуют внимания) | 500 errors, DB connection failed, payment failed |

### 13.3. Хранение и агрегация

**MUST:**

- **Loki:** агрегация логов (30-day retention)
- **Promtail:** сбор Docker-контейнерных логов
- **Grafana:** визуализация + поиск
- **Sentry:** error tracking (10% traces)

**SHOULD:**

- **Log rotation:** автоматическая ротация (max 100 MB per file, 7 days)
- **PII scrubbing:** автоматическая маскировка email, телефона, пароля
- **Alerting:** алерт при spike error-логов (> 100 / мин)

### 13.4. Correlation ID

**MUST:**

- **Request ID:** генерируется на nginx (`$request_id`) или api (UUID)
- **Пробрасывается** через все слои: nginx → api → prisma → external services
- **Логируется** во всех записях, связанных с запросом
- **Возвращается** клиенту в `X-Request-ID` header

**Пример:**

```json
{
  "timestamp": "2026-06-24T10:30:45.123Z",
  "level": "info",
  "message": "Order created",
  "service": "api",
  "requestId": "abc-123-def-456",
  "userId": "user_123",
  "orderId": 42,
  "method": "POST",
  "url": "/api/v1/orders",
  "status": 201,
  "duration": 145
}
```

---

## Quick Reference для агентов

### При работе с кодом

| Задача | Документ | Раздел |
|--------|----------|--------|
| Понять структуру проекта | `project-map.md` | §1-2 |
| Найти API-endpoint | `project-map.md` | §7 |
| Понять схему БД | `project-map.md` | §6 |
| Узнать текущее состояние | `current-state.md` | §1-11 |
| Найти техдолг | `current-state.md` | Критический путь |
| Проверить требования | `AI_CTO.md` (этот) | §7-13 |

### При принятии решений

| Вопрос | Принцип |
|--------|---------|
| Как хранить деньги? | §2.1 P2: копейки (Int) |
| Как аутентифицировать? | §2.1 P5: dual JWT |
| Как обрабатывать realtime? | §2.1 P6: WebSocket |
| Как работать offline? | §2.1 P7: Hive-кэш |
| Что важнее — безопасность или скорость? | §2.1 P10: безопасность |
| Что важнее — простота или архитектура? | §2.1 P9: простота |

### Приоритеты

| Приоритет | Описание | Примеры |
|-----------|----------|---------|
| **P0** | Блокеры production | Онлайн-оплата, OAuth-ключи, SMS |
| **P1** | Высокий приоритет | Push для курьера, гекодинг, cron |
| **P2** | Средний приоритет | Nonce CSP, 2FA, backup |
| **P3** | Nice-to-have | Программа лояльности, отзывы |

---

## Контакты и эскалация

**CTO:** (автор этого документа)  
**Владелец продукта:** Гастрохаус «Грильяж» (Омск)  
**Команда:** 1 разработчик + AI-агенты

**Эскалация:**

- **P0 (блокер):** немедленная эскалация CTO
- **P1 (высокий):** эскалация в течение 24 часов
- **P2 (средний):** эскалация в течение недели
- **P3 (низкий):** обсуждение на планировании

---

**Документ живой.** Обновляется при изменении стратегии, архитектуры или бизнес-целей. При обнаружении противоречий — сообщите CTO для актуализации.

*Последнее обновление: июнь 2026*
