# Project Map — Платформа «Грильяж»

> Полная карта проекта: сайт, доставка, CRM, мобильные приложения и инфраструктура гастрохауса «Грильяж» (Омск).

---

## Содержание

1. [Полная структура проекта](#1-полная-структура-проекта)
2. [Назначение каждой директории](#2-назначение-каждой-директории)
3. [Архитектура Frontend](#3-архитектура-frontend)
4. [Архитектура Backend](#4-архитектура-backend)
5. [Архитектура мобильных приложений](#5-архитектура-мобильных-приложений)
6. [База данных](#6-база-данных)
7. [API](#7-api)
8. [Авторизация](#8-авторизация)
9. [Роли пользователей](#9-роли-пользователей)
10. [Система заказов](#10-система-заказов)
11. [Система меню](#11-система-меню)
12. [Интеграции](#12-интеграции)
13. [Сервисы](#13-сервисы)
14. [Незавершённые модули](#14-незавершённые-модули)
15. [Потенциально проблемные места](#15-потенциально-проблемные-места)

---

## 1. Полная структура проекта

```
GrilyageV2-main/
├── apps/
│   ├── api/                  # NestJS REST API + WebSocket + Prisma
│   ├── web/                  # Next.js 16: публичный сайт + CRM
│   ├── mobile/               # Flutter-приложение (клиент)
│   ├── courier/              # Flutter-приложение (курьер)
│   ├── operator/             # Electron-приложение (оператор)
│   └── launcher/             # Electron-лаунчер для локального запуска
├── packages/
│   └── shared/               # Общие TypeScript типы, DTO, константы
├── infra/
│   ├── docker-compose.yml    # Dev-окружение
│   ├── docker-compose.prod.yml  # Production-окружение
│   ├── nginx/                # Конфигурация обратного прокси
│   ├── smtp/                 # Postfix (relay через Yandex SMTP)
│   ├── livekit/              # WebRTC-сервер для звонков
│   ├── livekit-agent/        # IVR-агент (DTMF-меню, очередь звонков)
│   ├── monitoring/           # Grafana + Loki + Prometheus
│   ├── deploy.sh             # Скрипт деплоя
│   └── init-ssl.sh           # Инициализация Let's Encrypt
├── Site/Design/              # Дизайн-макеты (референс)
├── docs/                     # Документация
├── .github/workflows/        # CI/CD (ci.yml, deploy.yml)
├── .env.example              # Шаблон переменных окружения (dev)
├── .env.production           # Шаблон переменных окружения (prod)
├── package.json              # Monorepo root (npm workspaces)
├── tsconfig.base.json        # Базовый TypeScript-конфиг
└── *.py                      # ~76 Python-скриптов для управления VPS
```

**Монорепо на npm workspaces:**
- `apps/api` — NestJS backend
- `apps/web` — Next.js frontend
- `apps/launcher` — Electron-лаунчер
- `packages/shared` — общие типы и утилиты

---

## 2. Назначение каждой директории

### `apps/api/` — Backend (NestJS)

| Путь | Назначение |
|------|-----------|
| `src/main.ts` | Bootstrap: Sentry, Helmet CSP, CORS, ValidationPipe, graceful shutdown |
| `src/app.module.ts` | Корневой модуль, ThrottlerModule (3 tier), ConfigModule |
| `src/env-validation.ts` | Валидация 12 обязательных переменных окружения |
| `src/swagger.setup.ts` | Swagger UI на `/api/docs` (два bearer-схемы) |
| `src/auth/` | Клиентская авторизация (email+password, JWT, refresh) |
| `src/staff-auth/` | Авторизация персонала (JWT + httpOnly cookie, роли) |
| `src/catalog/` | Публичный каталог (категории, товары, подкатегории, акции) |
| `src/orders/` | Заказы (создание, история, WebSocket realtime) |
| `src/admin/` | CRM-функционал (CRUD каталога, заказы, персонал, загрузки) |
| `src/profile/` | Профиль клиента (адреса, согласие на обработку данных) |
| `src/mobile/` | API для Flutter-приложений (18 DTO) |
| `src/social-auth/` | OAuth: VK, Yandex, Telegram, Email OTP, Phone OTP |
| `src/call/` | Звонки через LiveKit (очередь, принятие, завершение) |
| `src/chat/` | Чат клиент-оператор (комнаты, сообщения, назначение) |
| `src/email/` | `@Global()` Nodemailer (верификация, OTP, подтверждение заказа) |
| `src/push/` | Firebase Admin FCM (push-уведомления) |
| `src/prisma/` | Глобальный Prisma-модуль |
| `src/health/` | Health-check `GET /health` |
| `src/logger/` | StructuredLogger (JSON в production) |
| `prisma/schema.prisma` | Схема БД (19 моделей, 8 enum'ов) |
| `prisma/seed.ts` | Seed: admin + 5 категорий + 30+ товаров + 2 акции |
| `prisma/migrations/` | 4 миграции |

### `apps/web/` — Frontend (Next.js 16)

| Путь | Назначение |
|------|-----------|
| `app/layout.tsx` | Корневой layout (Inter, AuthProvider, CartProvider, виджеты) |
| `app/page.tsx` | Главная: hero-слайдер, категории, товары, карта, футер |
| `app/menu/page.tsx` | Расширенное меню (категории + подкатегории) |
| `app/about/page.tsx` | О нас, производство, вакансии, юридическая информация |
| `app/preorder/page.tsx` | Предзаказ (**placeholder**) |
| `app/cabinet/page.tsx` | Личный кабинет (профиль, адреса, история заказов) |
| `app/privacy/page.tsx` | Политика конфиденциальности (152-ФЗ) |
| `app/terms/page.tsx` | Условия использования |
| `app/verify-email/page.tsx` | Верификация email |
| `app/auth/vk/callback/` | VK OAuth callback |
| `app/auth/yandex/callback/` | Yandex OAuth callback |
| `app/social/[network]/` | Заглушки соцсетей (vk, tg, max) |
| `app/admin/layout.tsx` | CRM-layout (сайдбар, аутентификация, ролевая навигация) |
| `app/admin/page.tsx` | Дашборд (заказы за день, выручка, статусы, популярные блюда) |
| `app/admin/orders/page.tsx` | Управление заказами (список, статусы, переходы) |
| `app/admin/chat/page.tsx` | Чат оператора (Socket.IO, комнаты, сообщения) |
| `app/admin/catalog/page.tsx` | Управление каталогом (товары + категории + подкатегории) |
| `app/admin/promotions/page.tsx` | Управление акциями |
| `app/admin/staff/page.tsx` | Управление персоналом |
| `app/admin/login/page.tsx` | Вход для персонала |
| `components/` | UI-компоненты (header, auth-modal, cart-drawer, chat-widget и др.) |
| `lib/` | React Context: auth, cart, staff-auth, статический каталог |
| `proxy.ts` | Next.js 16 proxy для `/admin/*` |
| `next.config.mjs` | standalone output, rewrites `/api/v1/*` → API |

### `apps/mobile/` — Flutter (клиент)

| Путь | Назначение |
|------|-----------|
| `lib/main.dart` | Firebase, Hive, ProviderScope |
| `lib/app.dart` | GoRouter (21 маршрут), 4-tab ShellRoute, push-tap routing |
| `lib/core/api/` | Dio-клиент (token, offline-cache, 401-refresh) |
| `lib/core/models/` | Category, Product, Order, Address, UserProfile |
| `lib/core/services/` | PushService (FCM + RuStore), ConnectivityService |
| `lib/core/storage/` | Hive (menu_cache, cart) |
| `lib/core/theme/` | GrilyageTheme (gold #D6B06A, Material 3) |
| `lib/features/auth/` | 4 метода входа (VK, Yandex, Email OTP, Phone OTP) |
| `lib/features/home/` | Hero-баннер, категории, популярные товары |
| `lib/features/catalog/` | Каталог, карточка товара, КБЖУ |
| `lib/features/cart/` | Корзина, оформление заказа |
| `lib/features/orders/` | История заказов, трекинг курьера (Socket.IO + YandexMap) |
| `lib/features/chat/` | Чат с оператором (Socket.IO) |
| `lib/features/call/` | Звонок через LiveKit (voice only) |
| `lib/features/profile/` | Профиль, адреса, о приложении |
| `lib/features/promotions/` | Список акций |
| `lib/features/map/` | Карта с меткой кафе |
| `lib/widgets/` | GrilyageButton, GrilyageCard, OfflineIndicator |

### `apps/courier/` — Flutter (курьер)

| Путь | Назначение |
|------|-----------|
| `lib/main.dart` | AutoLoginGate |
| `lib/app.dart` | AuthStatus-based screen switching |
| `lib/core/api/` | Dio-клиент (минимальный, без кэша/refresh) |
| `lib/core/models/` | Order (статусы отличаются от mobile), Address (подъезд, этаж, домофон) |
| `lib/core/providers/` | AuthNotifier (Riverpod 3), OrdersNotifier (Socket.IO /staff) |
| `lib/core/services/` | CourierLocationService (GPS каждые 10с) |
| `lib/screens/` | Login, Orders list, Order detail, Map |
| `lib/widgets/` | OrderCard |

### `apps/operator/` — Electron (рабочее место оператора)

Не Flutter. Настольное приложение на Electron 34 + HTML/JS/CSS.

| Путь | Назначение |
|------|-----------|
| `main.js` | Main process: окно 1280×860, Tray, окно звонка, нативные уведомления |
| `preload.js` | contextBridge IPC |
| `renderer/index.html` | Single-file UI: заказы (WebSocket), статусы, кнопка звонка (stub) |

### `apps/launcher/` — Electron-лаунчер

| Путь | Назначение |
|------|-----------|
| `main.js` | Управление 3 сервисами (Docker, API, Web), IPC, health checks |
| `renderer/index.html` | GUI: старт/стоп, логи, создание пользователей, quick-start |
| `scripts/` | create-staff-user.js, create-customer-user.js, repair-electron.js |

### `packages/shared/` — Общие TypeScript-модули

| Файл | Содержимое |
|------|-----------|
| `src/constants.ts` | `DeliveryMode`, `PaymentMethod`, `OrderStatus`, `ORDER_STATUS_TRANSITIONS`, `canTransition()`, `StaffRole`, `FREE_DELIVERY_THRESHOLD_KOPECKS` (1500₽), `BASE_DELIVERY_COST_KOPECKS` (199₽), `getDeliveryCost()`, `WORKING_HOURS` |
| `src/format.ts` | `formatPrice()`, `formatProductPrice()`, `toKopecks()`, `normalizeSearchText()`, `maskPhone()`, `normalizePhone()` |
| `src/types.ts` | `ProductPrice`, `PriceInKopecks` |
| `src/index.ts` | Реэкспорт |

### `infra/` — Инфраструктура

| Путь | Назначение |
|------|-----------|
| `docker-compose.yml` | Dev: postgres, api, web, nginx (HTTPS), smtp, livekit, livekit-agent, certbot |
| `docker-compose.prod.yml` | Prod: api, web, nginx (HTTP), redis, monitoring (Grafana+Loki+Prometheus) |
| `nginx/default.conf` | HTTPS reverse proxy (Let's Encrypt, maintenance mode) |
| `nginx/nginx.conf` | HTTP-only с rate-limiting (5r/s на auth) |
| `nginx/maintenance.html` | Страница «Ведутся технические работы» |
| `smtp/` | Postfix null-client → relay через smtp.yandex.ru:465 |
| `livekit/livekit.yaml` | LiveKit-сервер (7880 TCP, 7881-7882 UDP, TURN) |
| `livekit-agent/agent.mjs` | IVR-бот: DTMF-меню, очередь звонков, перевод на оператора |
| `monitoring/` | Prometheus, Loki, Promtail, Grafana (datasources) |
| `deploy.sh` | Bash-деплой: env-валидация, docker build, prisma migrate, seed |
| `init-ssl.sh` | Первичная настройка Let's Encrypt |

---

## 3. Архитектура Frontend

### Стек

- **Next.js 16.2.9** (App Router, `output: 'standalone'`)
- **React 19.2.0** (все страницы `'use client'`)
- **TypeScript** strict (`noUncheckedIndexedAccess`)
- **Sentry** (client + server, 10% traces)
- **Socket.io-client** (чат в реальном времени)
- **Нет UI-библиотеки** (ни Tailwind, ни MUI, ни shadcn) — глобальный CSS (`globals.css`, 522 строки)
- **Нет state-библиотеки** (ни Redux, ни Zustand) — React Context
- **Русский язык** (`<html lang="ru">`), без i18n

### Маршруты

**Публичный сайт:**

| Маршрут | Описание |
|---------|----------|
| `/` | Главная (hero-слайдер, категории, товары, карта, футер) |
| `/menu` | Расширенное меню (использует **локальные данные**, не API) |
| `/about` | О нас, производство, вакансии, юридический блок |
| `/preorder` | Предзаказ (**placeholder**) |
| `/cabinet` | Личный кабинет (профиль, адреса, история заказов, «повторить заказ») |
| `/privacy` | Политика конфиденциальности |
| `/terms` | Условия использования |
| `/verify-email` | Результат верификации email |
| `/auth/vk/callback` | VK OAuth callback |
| `/auth/yandex/callback` | Yandex OAuth callback |
| `/social/[network]` | Заглушки соцсетей |

**CRM (`/admin/*`):**

| Маршрут | Описание |
|---------|----------|
| `/admin` | Дашборд (заказы, выручка, статусы, топ-5 блюд) |
| `/admin/login` | Вход для персонала |
| `/admin/orders` | Управление заказами (фильтр, модалка, переходы статусов) |
| `/admin/chat` | Чат оператора (Socket.IO, комнаты, назначение, закрытие) |
| `/admin/catalog` | Товары + категории + подкатегории (CRUD + загрузка фото) |
| `/admin/promotions` | Акции (CRUD) |
| `/admin/staff` | Персонал (CRUD, роли, транспорт, радиус) |

### Управление состоянием

Три React Context в `lib/`:

1. **AuthProvider** (`auth-context.tsx`) — клиентский пользователь. Токены в `localStorage`. 401 → refresh → retry. Методы: `login`, `register`, `phoneLogin`, `socialLogin`, `sendEmailOtp`, `verifyEmailOtp`, `logout`.

2. **CartProvider** (`cart-context.tsx`) — корзина. Персистентность в `localStorage` (`grilyazh-cart`). Вычисляет `cartQty`, `subtotal`. Использует `getDeliveryCost()` из shared.

3. **StaffAuthProvider** (`staff-auth-context.tsx`) — персонал. Access-токен = httpOnly cookie `staff_token`. Refresh-токен в `localStorage`. 401 → refresh → retry.

### API-клиент

Нативный `fetch` без обёртки. Все запросы на `/api/v1/*` → Next.js rewrite → `API_INTERNAL_URL` (по умолчанию `http://localhost:4000`).

### Стилизация

- Один глобальный `globals.css` (~49 КБ)
- CSS-переменные: `--cream`, `--gold`, `--wood`, `--text`, `--border`, `--footer`, `--dark`
- Тёмная тема CRM: `.admin-theme` с собственными переменными
- Inline `style={{}}` для разовых случаев
- Inline SVG-иконки (без библиотеки иконок)
- Адаптив: `@media (max-width: 1100px)` — bottom-nav; `@media (max-width: 480px)` — compact

### WebSocket

Socket.IO подключение к `https://grillyage.ru/chat` (path `/socket.io`):
- Клиентский виджет: `auth: { token: accessToken }`, события `chat.join`, `chat.message`
- Админ-чат: cookie-based auth, события `chat.message`, `chat.room.assigned`, `chat.room.closed` + 5s polling fallback

---

## 4. Архитектура Backend

### Стек

- **NestJS 11** (модульная архитектура)
- **Prisma 6** (ORM, PostgreSQL)
- **Passport.js** (JWT-стратегии)
- **Socket.IO** (5 gateway'ев)
- **Nodemailer** (SMTP)
- **Firebase Admin** (FCM push)
- **LiveKit Server SDK** (WebRTC-звонки)
- **Sharp** (обработка изображений → WebP)
- **Multer** (загрузка файлов)
- **Helmet** (CSP)
- **@nestjs/throttler** (rate-limiting)

### Модули (15)

| Модуль | Маршрут | Доступ |
|--------|---------|--------|
| **PrismaModule** | `@Global()` | DB |
| **HealthModule** | `/health` | public |
| **AuthModule** | `/api/v1/auth/*` | mixed (client JWT) |
| **StaffAuthModule** | `/api/v1/staff/auth/*` | staff JWT + cookie |
| **CatalogModule** | `/api/v1/categories`, `/products`, `/subcategories`, `/promotions` | public |
| **OrdersModule** | `/api/v1/orders/*` | mixed (public create, JWT history) |
| **AdminModule** | `/api/v1/staff/*` | staff JWT + Roles |
| **EmailModule** | `@Global()` | service only |
| **ProfileModule** | `/api/v1/profile/*` | JWT |
| **SocialAuthModule** | `/api/v1/auth/social/*` | mostly public |
| **MobileModule** | `/api/v1/mobile/*` | mixed |
| **CallModule** | `/api/v1/calls/*` | user JWT + staff JWT |
| **ChatModule** | `/api/v1/mobile/chat/*` + `/api/v1/admin/chat/*` | user JWT + staff JWT |
| **PushModule** | service only | internal |
| **LoggerModule** | — | internal |

### WebSocket (5 Gateway'ев)

| Gateway | Namespace | События |
|---------|-----------|---------|
| **OrdersGateway** | `/staff` | `order.created`, `order.updated`, `courier.location` |
| **UserOrdersGateway** | `/orders` | `courier.location` (room `order:<id>`), `order.updated` |
| **MobileGateway** | `/mobile` | `order.created`, `order.updated` |
| **ChatGateway** | `/chat` | `chat.message`, `chat.typing`, `chat.room.assigned`, `chat.room.closed` |
| **CallGateway** | `/calls` | `call.enqueued`, `call.dequeued`, `call.accepted`, `call.connected`, `call.ended` |

### Middleware и глобальная конфигурация

- `ValidationPipe` (global): `whitelist`, `transform`, `forbidNonWhitelisted`
- `cookieParser()` — для staff httpOnly JWT
- `helmet()` с CSP (whitelist: Yandex, Sentry, Google Fonts, unpkg)
- `express.static('/uploads')` — загрузка файлов
- CSRF-проверка Content-Type (415 для state-changing без JSON/multipart)
- `ThrottlerGuard` (3 tier: 3/20/100 за 1s/10s/60s)
- CORS: `credentials: true`, whitelist `WEB_PUBLIC_URL` + Tailscale
- StructuredLogger (JSON в production)
- Graceful shutdown (WS + DB pool)

### Загрузка файлов

- **URL-based**: `POST /staff/uploads/image` — fetch → save → `/uploads/<uuid>.<ext>`
- **Multipart**: `POST /staff/uploads/file` — multer → Sharp (resize 800×800 + WebP quality 82) → thumbnail 320×320 → `/uploads/<filename>`

### Cron-задачи

**Отсутствуют.** Нет `@nestjs/schedule`, нет `node-cron`. Все операции event-driven. Нет автоочистки OTP, refresh-токенов, деактивации акций.

---

## 5. Архитектура мобильных приложений

### `apps/mobile/` — Клиент (Flutter)

**Стек:**
- Flutter SDK `^3.5.0`
- Riverpod 2 (StateNotifier)
- GoRouter (21 маршрут)
- Dio (HTTP + offline cache + 401-refresh)
- Hive (локальное хранилище: меню, корзина)
- Yandex MapKit (карты, трекинг курьера)
- Firebase Messaging + RuStore Push (push-уведомления)
- LiveKit Client (голосовые звонки)
- Socket.IO (чат, трекинг заказов)
- WebView (OAuth: VK, Yandex)

**Платформы:** Android (minSdk 26) + iOS (Info.plist без permission descriptions)

**Base URL:** `https://grillyage.ru/api/v1/mobile` (prod)

**Основные экраны:**
- Home (баннер, категории, популярные товары)
- Catalog (сетка категорий с shimmer)
- Product (изображение, КБЖУ, «В корзину»)
- Cart (список, количество, итого)
- Checkout (форма, pickup/delivery, оплата: cash/card/online)
- Orders (история, статусы, кнопка «Отследить»)
- Tracking (YandexMap: кафе + курьер в реальном времени)
- Chat (пузыри, Socket.IO)
- Call (очередь, активный звонок, LiveKit)
- Profile (меню: заказы, корзина, адреса, чат, карта, о нас, выход)
- Promotions (карточки акций)
- Map (метка кафе)

**Push-уведомления:**
- FCM (`firebase_messaging`) + RuStore Push (альтернатива для RuStore)
- Канал `orders` (high importance)
- Background handler (`@pragma('vm:entry-point')`)
- Tap → маршрут `/orders`
- Регистрация: `POST /push/register`

### `apps/courier/` — Курьер (Flutter)

**Стек:**
- Flutter SDK `^3.12.2`
- Riverpod 3 (Notifier API — отличается от mobile)
- Dio (минимальный, без кэша/refresh)
- SharedPreferences (не Hive)
- Socket.IO (`/staff` namespace)
- Yandex MapKit
- `location` + `geolocator` (GPS)

**Платформы:** Только Android (нет `ios/`)

**Base URL:** `http://10.0.2.2:4000/api` (Android emulator → localhost)

**Основные экраны:**
- Login (email + password → `/staff/auth/login`)
- Orders list (Socket.IO: `order.created`, `order.updated`)
- Order detail (статус, клиент, адрес, товары, кнопки действий)
- Map (метки кафе + курьер, кнопка «Проложить» — **stub**)

**GPS-трекинг:**
- Старт при «Забрать заказ» (READY_FOR_PICKUP)
- Отправка каждые 10 секунд: `PATCH /staff/location`
- Стоп при «Доставлен» (COMPLETED)

### `apps/operator/` — Оператор (Electron)

Не Flutter. Desktop-приложение на Electron 34.

- Окно 1280×860 + системный Tray
- Отдельное окно 400×500 для LiveKit-звонка
- Нативные OS-уведомления
- WebSocket-подписка на заказы
- Кнопка «Позвонить клиенту» — **stub** (alert)

### Отсутствие общего кода

**Между mobile и courier нет общего Dart-кода.** Дублируются:
- `ApiClient` (разные реализации)
- Модель `Order` (разные enum'ы статусов)
- `AuthNotifier` (разные API Riverpod)
- Темы, строки статусов

`packages/shared/` — только TypeScript, используется `apps/api/` и `apps/web/`, **не импортируется Flutter-приложениями**.

---

## 6. База данных

**СУБД:** PostgreSQL 17 (Alpine)
**ORM:** Prisma 6
**Файл схемы:** `apps/api/prisma/schema.prisma`

### Enum'ы (8)

| Enum | Значения |
|------|----------|
| `DeliveryMode` | `DELIVERY`, `PICKUP` |
| `PaymentMethod` | `CASH`, `CARD_ON_DELIVERY` |
| `OrderStatus` | `NEW`, `CONFIRMED`, `COOKING`, `DELIVERING`, `READY_FOR_PICKUP`, `COMPLETED`, `CANCELLED` |
| `StaffRole` | `SUPER_ADMIN`, `ADMIN`, `OPERATOR`, `COURIER` |
| `TransportType` | `WALKING`, `CAR` |
| `EmailTokenType` | `VERIFY`, `RESET` |
| `ChatRoomStatus` | `OPEN`, `ASSIGNED`, `CLOSED` |
| `CallStatus` | `QUEUED`, `CONNECTING`, `ACTIVE`, `ENDED` |

### Модели (19)

#### Пользователи и идентификация (6)

**User** (клиенты)
- `id` (cuid), `email?` (unique), `phone?`, `name`, `passwordHash?`
- `emailVerifiedAt?`, `phoneVerifiedAt?`, `isActive` (default false)
- `activationToken?` (unique), `activationTokenExpiresAt?`
- Связи: addresses, pushTokens, orders, emailTokens, refreshTokens, consent, socialAccounts, calls, chatRooms

**SocialAccount**
- `provider` (VK | YANDEX | TELEGRAM | MAX | WHATSAPP | EMAIL | PHONE)
- `providerId`, `email?`, `name?`, `avatarUrl?`
- `@@unique([provider, providerId])`

**UserConsent** (152-ФЗ)
- `userId` (unique), `privacyAcceptedAt`, `termsAcceptedAt`
- `marketingAcceptedAt?`, `dataProcessingAt`, `ip?`, `userAgent?`

**EmailToken**
- `token` (unique), `type` (EmailTokenType), `expiresAt`

**OtpCode**
- `identifier` (телефон или email), `code`, `type` (PHONE | EMAIL)
- `purpose` (AUTH | VERIFY_EMAIL | RESET), `expiresAt`, `usedAt?`, `attempts` (default 0)
- `@@unique([identifier, purpose])`

**RefreshToken** (полиморфная — User ИЛИ StaffUser)
- `userId?`, `staffUserId?`, `tokenHash` (unique), `expiresAt`, `revokedAt?`

**Address**
- `userId`, `label?`, `street`, `house`, `apartment?`, `comment?`

#### Персонал (1)

**StaffUser**
- `login` (unique), `name`, `passwordHash`, `role` (StaffRole), `active`
- `transportType` (default WALKING), `deliveryRadius` (default 5)
- `lastLatitude?`, `lastLongitude?`, `lastLocationAt?`
- Связи: assignedOrders, refreshTokens, statusLogs

#### Каталог (4)

**Category**
- `name`, `slug` (unique), `sortOrder`, `imageUrl?`, `active`
- Связь: subcategories

**Subcategory**
- `categoryId`, `name`, `slug`, `sortOrder`, `active`
- `@@unique([categoryId, slug])`
- Связь: products

**Product**
- `subcategoryId`, `name`, `slug` (unique), `description`
- `priceRubles`, `priceKopecks` (цена в копейках = rubles×100 + kopecks)
- `weightGrams`, `kcal`, `protein`, `fat`, `carbs`
- `imageUrl?`, `isNew`, `active`, `sortOrder`

**Promotion**
- `title`, `description`, `imageUrl?`, `discountPercent?`
- `startsAt`, `endsAt`, `active`, `productIds` (String[])

#### Realtime (4)

**ChatRoom**
- `userId`, `staffId?`, `status` (ChatRoomStatus)
- Связь: messages

**ChatMessage**
- `roomId`, `senderType` (USER | OPERATOR), `senderId`, `text`, `readAt?`

**CallQueue** (LiveKit)
- `userId`, `roomName` (unique), `status` (CallStatus), `position?`, `endedAt?`

**PushToken**
- `userId`, `token`, `platform` (android | ios), `active`
- `@@unique([userId, token])`

#### Заказы (3)

**Order**
- `number` (Int, unique, autoincrement)
- `userId?` (onDelete: SetNull), `status` (OrderStatus, default NEW)
- `deliveryMode`, `paymentMethod`
- `customerName`, `customerPhone`, `customerEmail?`, `address?`
- `desiredTime?`, `comment?`
- `itemsTotal` (Int, копейки), `deliveryCost` (Int, копейки), `total` (Int, копейки)
- `courierId?` (StaffUser, onDelete: SetNull), `assignedAt?`
- Индексы: userId, status, courierId

**OrderItem**
- `orderId`, `productId`
- `nameSnapshot`, `priceSnapshot` (Int, копейки на момент заказа), `qty`

**OrderStatusLog**
- `orderId`, `status`, `staffUserId?` (onDelete: SetNull), `createdAt`

### Миграции

4 миграции:
1. `20260612073733_init` — начальная схема
2. `20260615060130_split_prices_add_consent` — разделение цены на rubles/kopecks + UserConsent
3. `20260615151153_add_phone_verified_at` — `phoneVerifiedAt` для User
4. `20260616180513_add_push_tokens` — модель PushToken

### Seed-данные

- **Staff admin**: `login: 'admin'`, password `admin123`, role `ADMIN`
- **5 категорий**: Новинки, Кулинария, Пекарня, Кондитерская, Бизнес-ланч
- **16 подкатегорий**, **30+ товаров**
- **2 акции**: «Скидка на первый заказ» (10%), «Бесплатная доставка» (от 1500₽)

### Валютная инварианта

Все денежные суммы хранятся в **копейках** (Int). Цены товаров: `priceRubles` + `priceKopecks` (отображение). Итоги заказов: `itemsTotal`, `deliveryCost`, `total` — всегда в копейках.

---

## 7. API

**Базовый URL:** `/api/v1` (префикс), `/health` (без префикса)
**Swagger:** `/api/docs`
**Порт:** 4000

### Контроллеры и маршруты

#### AuthController — `/auth/*`

| Метод | Маршрут | Throttle | Описание |
|-------|---------|----------|----------|
| POST | `/auth/register` | 3/min | Регистрация (email + password) |
| POST | `/auth/login` | 5/min | Вход (email + password) |
| POST | `/auth/refresh` | — | Обновление токенов |
| POST | `/auth/logout` | — | Выход (204) |
| GET | `/auth/verify-email` | — | Верификация email |
| POST | `/auth/resend-verification` | 2/min | Повторная отправка |
| GET | `/auth/me` | — | Текущий пользователь (JWT) |

#### StaffAuthController — `/staff/auth/*`

| Метод | Маршрут | Throttle | Описание |
|-------|---------|----------|----------|
| POST | `/staff/auth/login` | 5/min | Вход персонала |
| POST | `/staff/auth/refresh` | — | Обновление токенов |
| POST | `/staff/auth/logout` | — | Выход (clears cookie) |
| GET | `/staff/auth/me` | — | Текущий сотрудник (StaffJwt) |

#### CatalogController — public, prefix `''`

| Метод | Маршрут | Описание |
|-------|---------|----------|
| GET | `/categories` | Все категории |
| GET | `/products` | Товары (query: subcategory, category, search, isNew) |
| GET | `/products/:slug` | Товар по slug |
| GET | `/subcategories` | Все подкатегории |
| GET | `/promotions` | Активные акции |

#### OrdersController — prefix `''`

| Метод | Маршрут | Доступ | Описание |
|-------|---------|--------|----------|
| POST | `/orders` | public | Создание заказа |
| GET | `/orders/my` | JWT | История заказов |
| GET | `/orders/my/:id` | JWT | Детали заказа |

#### ProfileController — `/profile/*` (JWT)

| Метод | Маршрут | Описание |
|-------|---------|----------|
| PATCH | `/profile` | Обновление профиля |
| GET | `/profile/addresses` | Список адресов |
| POST | `/profile/addresses` | Добавить адрес |
| PATCH | `/profile/addresses/:id` | Обновить адрес |
| DELETE | `/profile/addresses/:id` | Удалить адрес (204) |
| GET | `/profile/consent` | Согласие (152-ФЗ) |
| POST | `/profile/consent` | Записать согласие (IP + UA) |

#### AdminController — `/staff/*` (StaffJwt + Roles)

| Метод | Маршрут | Роли | Описание |
|-------|---------|------|----------|
| GET/POST | `/staff/categories` | ADMIN | Категории |
| PATCH/DELETE | `/staff/categories/:id` | ADMIN | Категория |
| POST | `/staff/categories/:id/subcategories` | ADMIN | Подкатегория |
| PATCH/DELETE | `/staff/subcategories/:id` | ADMIN | Подкатегория |
| GET/POST | `/staff/products` | ADMIN | Товары |
| PATCH/DELETE | `/staff/products/:id` | ADMIN | Товар |
| GET/POST/PATCH/DELETE | `/staff/promotions` | ADMIN | Акции |
| GET/POST | `/staff/users` | SUPER_ADMIN, ADMIN | Персонал |
| PATCH | `/staff/users/:id` | SUPER_ADMIN, ADMIN | Персонал |
| POST | `/staff/uploads/image` | ADMIN | Загрузка по URL |
| POST | `/staff/uploads/file` | ADMIN | Загрузка файла (multipart) |
| GET | `/staff/orders` | ADMIN, OPERATOR | Заказы (query: status, date) |
| GET | `/staff/orders/:id` | ADMIN, OPERATOR | Детали заказа |
| PATCH | `/staff/orders/:id/status` | ADMIN, OPERATOR, COURIER | Смена статуса |
| POST | `/staff/orders/:id/assign` | ADMIN, OPERATOR | Назначить курьера |
| GET | `/staff/orders/:id/nearest-courier` | ADMIN, OPERATOR | Ближайший курьер |
| GET | `/staff/orders/courier` | ADMIN, OPERATOR, COURIER | Заказы курьера |
| PATCH | `/staff/location` | COURIER | GPS-координаты курьера |

#### SocialAuthController — `/auth/social/*`

| Метод | Маршрут | Throttle | Описание |
|-------|---------|----------|----------|
| POST | `/auth/social/vk` | 5/min | VK OAuth |
| POST | `/auth/social/yandex` | 5/min | Yandex OAuth (access_token) |
| POST | `/auth/social/yandex/code` | 5/min | Yandex OAuth (code exchange) |
| POST | `/auth/social/telegram` | 5/min | Telegram Login Widget |
| POST | `/auth/social/email-otp` | 10/min | Вход по email OTP |
| POST | `/auth/social/send-email-otp` | 3/min | Отправить email OTP |
| POST | `/auth/social/send-phone-otp` | 3/min | Отправить phone OTP |
| POST | `/auth/social/phone-otp` | 10/min | Вход по phone OTP |
| GET | `/auth/social/accounts` | JWT | Привязанные соц. аккаунты |
| DELETE | `/auth/social/accounts/:provider/:providerId` | JWT | Отвязать (нельзя последний) |

#### ChatController

| Метод | Маршрут | Доступ |
|-------|---------|--------|
| POST | `/mobile/chat/rooms` | JWT |
| GET | `/mobile/chat/rooms/my` | JWT |
| GET/POST | `/mobile/chat/rooms/:id/messages` | JWT |
| POST | `/mobile/chat/rooms/:id/typing` | JWT |
| GET | `/admin/chat/rooms` | StaffJwt |
| POST | `/admin/chat/rooms/:id/assign` | StaffJwt |
| POST | `/admin/chat/rooms/:id/messages` | StaffJwt |
| POST | `/admin/chat/rooms/:id/close` | StaffJwt |
| POST | `/admin/chat/rooms/:id/typing` | StaffJwt |

#### CallController

| Метод | Маршрут | Доступ | Описание |
|-------|---------|--------|----------|
| POST | `/calls/enqueue` | JWT | Встать в очередь |
| POST | `/calls/dequeue` | JWT | Покинуть очередь |
| POST | `/calls/:id/accept` | StaffJwt | Оператор принимает |
| POST | `/calls/:id/connect` | StaffJwt | Отметить ACTIVE |
| POST | `/calls/:id/end` | JWT | Завершить |
| GET | `/calls/queue` | StaffJwt | Текущая очередь |

#### MobileController — `/mobile/*`

Публичные (без auth): `/mobile/menu`, `/mobile/product/:slug`, `/mobile/auth/*` (login, register, refresh, send-code, complete, result, social/*, email/phone OTP)

JWT (`AuthGuard('jwt')`): `/mobile/profile`, `/mobile/addresses`, `/mobile/orders`, `/mobile/orders/:id/courier`, `/mobile/push/register|unregister`

#### HealthController

| Метод | Маршрут | Описание |
|-------|---------|----------|
| GET | `/health` | `SELECT 1` (DB ping) |

---

## 8. Авторизация

### Двойная JWT-система

Два независимых JWT-домена с отдельными секретами, стратегиями и guards.

#### Клиентская авторизация (`auth/`)

- **Access-токен:** `JWT_ACCESS_SECRET`, TTL `JWT_ACCESS_TTL` (default 15m)
- **Refresh-токен:** 64 random bytes → SHA-256 → `RefreshToken.tokenHash`; ротация при `/refresh` (старый отзывается)
- **TTL refresh:** `JWT_REFRESH_TTL` (default 30d)
- **Пароль:** bcrypt, rounds=12
- **Activation token:** 32 bytes hex, SHA-256, 24h TTL
- **Стратегия:** `passport-jwt`, Bearer header
- **Guard:** `JwtAuthGuard`

#### Авторизация персонала (`staff-auth/`)

- **Access-токен:** `STAFF_JWT_ACCESS_SECRET`, отдельный `JwtModule`
- **Cookie:** `staffAccessToken` (httpOnly, `secure` в production, sameSite lax, path `/`)
- **Dual extractor:** cookie + Bearer header
- **Стратегия:** `staff-jwt` (Passport)
- **Guard:** `StaffJwtGuard`
- **Roles guard:** `StaffRolesGuard` — читает `@Roles()` через `Reflector`
- **SUPER_ADMIN наследует все права ADMIN**

### Декораторы

- `@Roles(...StaffRole[])` — определён в `staff-auth/staff-roles.guard.ts`
- `ROLES_KEY = 'staff_roles'`

### Социальная авторизация

| Провайдер | Механизм |
|-----------|----------|
| **VK** | VK ID SDK → access_token → `POST /auth/social/vk` → `users.get` API |
| **Yandex** | OAuth popup → code → `POST /auth/social/yandex/code` → exchange at `oauth.yandex.ru/token` → `login.yandex.ru/info` |
| **Telegram** | Login Widget → HMAC-SHA256 verification (bot token) → reject if `auth_date > 24h` |
| **Email OTP** | 6-digit code → email → `POST /auth/social/email-otp` |
| **Phone OTP** | 6-digit code → **отправляется на email** (не SMS) → `POST /auth/social/phone-otp` |

### Frontend auth-flow

**Клиент:**
- email+password → `POST /auth/login` → localStorage (accessToken + refreshToken) → `GET /auth/me`
- Phone OTP → `POST /auth/social/send-phone-otp` → code → `POST /auth/social/phone-otp` (автосоздание аккаунта)
- VK → VKID SDK → callback → `POST /auth/social/vk`
- Yandex → popup → callback → `POST /auth/social/yandex/code`
- 401 → `POST /auth/refresh` → retry

**Персонал:**
- login+password → `POST /staff/auth/login` → httpOnly cookie + refreshToken в localStorage
- Последующие запросы: cookie (без Authorization header)
- 401 → `POST /staff/auth/refresh` → новая cookie + новый refreshToken

---

## 9. Роли пользователей

### Клиент (User)

- Модель `User` в БД
- Регистрация через email+password или социальные сети
- Возможности: просмотр каталога, корзина, оформление заказа, история заказов, профиль, адреса, чат с оператором, звонки
- Согласие на обработку данных (152-ФЗ) при регистрации

### Персонал (StaffUser)

| Роль | Enum | Возможности |
|------|------|-------------|
| **SUPER_ADMIN** | `SUPER_ADMIN` | Все права ADMIN + управление персоналом |
| **ADMIN** | `ADMIN` | Полный доступ к CRM: каталог, заказы, акции, персонал, загрузки |
| **OPERATOR** | `OPERATOR` | Заказы (просмотр, смена статусов, назначение курьера), чат с клиентами |
| **COURIER** | `COURIER` | Свои заказы, смена статусов, GPS-координаты |

### Ролевая модель доступа

- `StaffRolesGuard` проверяет `@Roles()` метаданные
- **SUPER_ADMIN автоматически наследует все права ADMIN** (`effectiveRole = SUPER_ADMIN ? ADMIN : role`)
- Сайдбар CRM: только ADMIN видит ссылки на Каталог, Акции, Персонал
- Управление персоналом (`/staff/users`): только SUPER_ADMIN и ADMIN

---

## 10. Система заказов

### Жизненный цикл заказа

```
NEW → CONFIRMED → COOKING → DELIVERING → COMPLETED
                            → READY_FOR_PICKUP → COMPLETED
  ↓       ↓        ↓          ↓                    ↓
CANCELLED CANCELLED CANCELLED  CANCELLED            CANCELLED
```

**Переходы** (определены в `packages/shared/src/constants.ts`):

| Из | В |
|----|---|
| NEW | CONFIRMED, CANCELLED |
| CONFIRMED | COOKING, CANCELLED |
| COOKING | DELIVERING, READY_FOR_PICKUP, CANCELLED |
| DELIVERING | COMPLETED, CANCELLED |
| READY_FOR_PICKUP | COMPLETED, CANCELLED |

### Создание заказа

1. Клиент (web или mobile) заполняет форму: имя, телефон, email, адрес, режим (PICKUP/DELIVERY), оплата, комментарий
2. `POST /orders` (или `POST /mobile/orders`) — публичный endpoint
3. Сервер: создаёт Order + OrderItems (с nameSnapshot/priceSnapshot), логирует статус NEW
4. WebSocket: `order.created` на `/staff` и `/mobile`
5. Push: `sendToAllStaff` (FCM)

### Доставка

- **Стоимость:** `getDeliveryCost(subtotal)` из shared — 199₽ базовая, бесплатно от 1500₽
- **Назначение курьера:** `POST /staff/orders/:id/assign` (ADMIN/OPERATOR)
- **GPS-трекинг:** курьер отправляет координаты каждые 10с → `PATCH /staff/location` → WebSocket `courier.location` в комнату `order:<id>`
- **Ближайший курьер:** `GET /staff/orders/:id/nearest-courier` (harcoded координаты кафе, не гекодирует адрес заказа)

### Самовывоз

- Статус `READY_FOR_PICKUP` вместо `DELIVERING`
- Переход: COOKING → READY_FOR_PICKUP → COMPLETED

### Оплата

- `CASH` — наличные
- `CARD_ON_DELIVERY` — картой курьеру
- **Онлайн-оплата не реализована** (enum `PaymentMethod` не содержит ONLINE)

### История и повтор

- `GET /orders/my` — список заказов клиента
- `GET /orders/my/:id` — детали
- Кнопка «Повторить заказ» в cabinet → записывает товары в localStorage-корзину

---

## 11. Система меню

### Структура

```
Category (сортировка, изображение, active)
  └── Subcategory (сортировка, active)
        └── Product (цена, КБЖУ, вес, фото, isNew, active, сортировка)
```

### Публичный API

- `GET /categories` — все активные категории (sortOrder)
- `GET /subcategories` — все подкатегории
- `GET /products` — все товары (фильтры: `category`, `subcategory`, `search`, `isNew`)
- `GET /products/:slug` — товар по slug
- `GET /promotions` — активные акции

### CRM-управление

- Категории: CRUD через `/staff/categories` (ADMIN)
- Подкатегории: создание через `/staff/categories/:id/subcategories`, удаление через `/staff/subcategories/:id`
- Товары: CRUD через `/staff/products` (ADMIN), загрузка фото через `/staff/uploads/file`
- Акции: CRUD через `/staff/promotions` (ADMIN)

### Цены

- Хранение: `priceRubles` (Int) + `priceKopecks` (Int)
- Итоговая цена в копейках: `rubles × 100 + kopecks`
- Отображение: `formatProductPrice(rubles, kopecks)` из shared
- В заказах: `priceSnapshot` (копейки на момент заказа, не пересчитывается)

### КБЖУ

Каждый товар содержит: `kcal`, `protein`, `fat`, `carbs` (отображается на карточке товара).

### Поиск

- `normalizeSearchText()` из shared (lowercase + ё→е)
- Frontend: `SearchPanel` с клавиатурной навигацией (↑/↓/Enter/Esc), подсветка `<mark>`

---

## 12. Интеграции

### Реализованные

| Интеграция | Назначение | Файл |
|-----------|-----------|------|
| **Nodemailer (SMTP)** | Верификация email, OTP, подтверждение заказа | `email/email.service.ts` |
| **LiveKit (WebRTC)** | Голосовые звонки клиент↔оператор | `call/call.service.ts` |
| **Firebase Admin (FCM)** | Push-уведомления (multicast, auto-deactivate invalid) | `push/push.service.ts` |
| **VK ID** | OAuth авторизация | `social-auth/social-auth.service.ts` |
| **Yandex OAuth** | OAuth авторизация (access_token + code exchange) | `social-auth/social-auth.service.ts` |
| **Telegram Login Widget** | OAuth авторизация (HMAC-SHA256 verification) | `social-auth/social-auth.service.ts` |
| **Sentry** | Error tracking (10% traces) | `main.ts` |
| **Helmet (CSP)** | Content Security Policy | `main.ts` |
| **Yandex Maps** | Карта на сайте и в мобильных приложениях | Frontend + Flutter |
| **Yandex.Metrica** | Веб-аналитика | `yandex-metrica.tsx` |
| **RuStore Push** | Push для RuStore (мобильное приложение) | `push_service.dart` |

### Заглушки / не реализовано

| Интеграция | Статус | Примечание |
|-----------|--------|-----------|
| **SMS.ru** | Env scaffolded, не используется | `SMS_RU_API_KEY` в `.env`, Phone OTP отправляется на email |
| **Онлайн-оплата** | Не реализована | Нет YooKassa/Stripe/CloudPayments. `PaymentMethod.ONLINE` зарезервирован для v2 |
| **MAX, WHATSAPP** | В enum, нет auth-flow | `SocialAccount.provider` содержит, но код не реализован |
| **Гекодинг адресов** | TODO | `findNearestCourier` использует хардкод координат кафе |

### SMTP-инфраструктура

- **Dev:** Mailpit (localhost:1025, web UI на :8025)
- **Prod:** Postfix null-client → relay через `smtp.yandex.ru:465` (TLS wrapper, SASL)
- Шаблоны: verification email, email OTP, phone OTP (via email), order confirmation

### LiveKit Call Center

- IVR-бот (`agent.mjs`): приветствие → DTMF-меню (Goertzel-детектор)
- Клавиша 0 → перевод на оператора, 1-3 → информация, # → завершение
- Очередь звонков с hold-музыкой
- `monitorParticipants` (polling 5с) определяет оператора (`operator-*`)
- TURN на `grillyage.ru:5349` (TLS), STUN Google

---

## 13. Сервисы

### Внутренние сервисы (NestJS)

| Сервис | Модуль | Назначение |
|--------|--------|-----------|
| `PrismaService` | PrismaModule | Глобальный DB-клиент, connect/disconnect |
| `EmailService` | EmailModule (`@Global`) | Nodemailer: 4 шаблона писем |
| `PushService` | PushModule | FCM multicast, auto-deactivate, sendToUser/sendToAllStaff |
| `StructuredLogger` | — | JSON-логирование в production |

### WebSocket Gateway'и

| Gateway | Namespace | Описание |
|---------|-----------|----------|
| `OrdersGateway` | `/staff` | Уведомления для CRM (order.created/updated, courier.location) |
| `UserOrdersGateway` | `/orders` | Трекинг для клиентов (courier.location в room order:<id>) |
| `MobileGateway` | `/mobile` | Уведомления для Flutter-приложений |
| `ChatGateway` | `/chat` | Чат в реальном времени (message, typing, room events) |
| `CallGateway` | `/calls` | Звонки (enqueued, accepted, connected, ended) |

### Инфраструктурные сервисы (Docker)

| Сервис | Образ | Порт | Назначение |
|--------|-------|------|-----------|
| `postgres` | postgres:17-alpine | 5432 | База данных |
| `api` | Custom (Node 22) | 4000 | NestJS backend |
| `web` | Custom (Node 22) | 3000 | Next.js frontend |
| `nginx` | nginx:stable-alpine | 80, 443 | Reverse proxy |
| `smtp` | Custom (Postfix) | 25 | Email relay |
| `livekit` | livekit/livekit-server | 7880, 7881-7882 | WebRTC |
| `livekit-agent` | Custom (Node 22) | — | IVR-бот |
| `certbot` | certbot/certbot | — | Let's Encrypt renewal |
| `redis` | redis:7-alpine | 6379 | Кэш (prod only) |
| `loki` | grafana/loki:3.4 | 3100 | Log aggregation (prod) |
| `promtail` | grafana/promtail:3.4 | — | Log shipping (prod) |
| `prometheus` | prom/prometheus | 9090 | Metrics (prod) |
| `node-exporter` | prom/node-exporter | 9100 | Host metrics (prod) |
| `grafana` | grafana/grafana | 3001 | Dashboards (prod) |

### Desktop-сервисы (Electron)

| Приложение | Назначение |
|-----------|-----------|
| `apps/launcher/` | Локальный запуск проекта (Docker + API + Web), health checks, создание пользователей |
| `apps/operator/` | Рабочее место оператора (заказы, чат, звонки) |

---

## 14. Незавершённые модули

### Frontend (apps/web)

| Страница/Компонент | Статус | Примечание |
|-------------------|--------|-----------|
| `/preorder` | Placeholder | «Форма предзаказа для больших заказов и праздников подключается следующим этапом» |
| `/menu` | Локальные данные | Использует `lib/catalog.ts`, **не** API |
| `/about` (юридический блок) | Placeholder | «Нужно заполнить фактическими реквизитами» |
| `/social/tg`, `/social/max` | Заглушки | «СКОРО ЗДЕСЬ БУДЕТ ССЫЛКА» |
| Auth modal (SMS) | В разработке | «Введите код из SMS (в разработке — код показан ниже)» |
| `proxy.ts` | Не завершён | Проверяет cookie, но не редиректит — auth-gating на клиенте |

### Backend (apps/api)

| Модуль | TODO | Файл |
|--------|------|------|
| Гекодинг адресов | `findNearestCourier` хардкодит координаты кафе (54.9893, 73.3682) | `admin.service.ts:332` |
| CSP nonce | `'unsafe-inline'` для скриптов (Next.js) | `main.ts:78` |
| Mobile DTO | `qty` без `@IsInt() @Min(1)` | `mobile/dto/create-order.dto.ts:8` |
| SMS.ru | Env scaffolded, не используется | Phone OTP → email |
| MAX, WHATSAPP | В enum, нет реализации | `SocialAccount.provider` |
| `@sentry/nestjs` | В package.json, не подключён | Используется `@sentry/node` |

### Mobile (apps/mobile)

| Фича | Статус | Файл |
|------|--------|------|
| VK OAuth | `client_id=PLACEHOLDER` | `login_screen.dart:303` |
| Yandex OAuth | `client_id=PLACEHOLDER` | `login_screen.dart:304` |
| Telegram login | Snackbar «скоро будет доступен» | `login_screen.dart:68` |
| «Моё местоположение» | Пустой `onPressed` | `map_screen.dart:48` |
| Тесты | Placeholder (`expect(true, isTrue)`) | `widget_test.dart` |
| Codegen | `freezed`/`json_serializable` объявлены, не используются | `pubspec.yaml` |

### Courier (apps/courier)

| Фича | Статус | Файл |
|------|--------|------|
| Навигация «Проложить» | Snackbar «Функция откроется во внешнем навигаторе» | `courier_map_screen.dart:301` |
| Тесты | Отсутствуют (нет `test/` директории) | — |
| iOS | Отсутствует (нет `ios/` директории) | — |
| Codegen | Объявлен, не используется | `pubspec.yaml` |
| `go_router` | Объявлен, используется `Navigator.pushNamed` | `pubspec.yaml` |

### Operator (apps/operator)

| Фича | Статус | Файл |
|------|--------|------|
| Звонок клиенту | `alert("Интеграция с LiveKit/SIP")` | `renderer/index.html:337` |

---

## 15. Потенциально проблемные места

### Безопасность

| Проблема | Серьёзность | Описание |
|----------|-------------|----------|
| **CSP `'unsafe-inline'`** | Средняя | Next.js требует inline-скиты. TODO P2: nonce-based CSP |
| **CSRF-проверка** | Низкая | Проверяет только Content-Type, не origin/referer |
| **Корневые Python-скрипты** | Высокая | ~76 файлов с хардкод-паролем VPS (`paramiko` → `212.119.42.249` root) |
| **`.env.production`** | Средняя | Может содержать реальные секреты (YANDEX_CLIENT_SECRET) в git |
| **`proxy.ts` не редиректит** | Средняя | `/admin/*` без cookie не перенаправляет на login — только клиентский guard |

### Архитектурные проблемы

| Проблема | Описание |
|----------|----------|
| **Дублирование mobile/courier** | Нет общего Dart-кода. ApiClient, Order, AuthNotifier дублируются с разной реализацией |
| **Разные статусы заказов** | Mobile: `pending/confirmed/preparing/delivering/completed/cancelled`. Courier: `NEW/CONFIRMED/COOKING/READY_FOR_PICKUP/DELIVERING/COMPLETED/CANCELLED`. Backend: 7 enum-значений. Dead labels в `statusLabel` |
| **`/menu` не использует API** | Страница загружает данные из `lib/catalog.ts`, а не из `/api/v1/categories` |
| **Нет cron-задач** | Нет автоочистки OTP, refresh-токенов, деактивации акций по `endsAt` |
| **`findNearestCourier`** | Хардкод координат кафе, не гекодирует адрес заказа |
| **`mobile.service.ts:466`** | Баг: `order.customerName !== userId` (всегда true), должно быть `order.userId !== userId` |
| **`EmailModule` @Global** | Объявлен `@Global()`, но импортируется явно в AuthModule и MobileModule |

### Инфраструктурные проблемы

| Проблема | Описание |
|----------|----------|
| **Dev ≠ Prod compose** | Разные TLS-режимы, rate-limiting, мониторинг, Redis. Dev: HTTPS. Prod: HTTP-only |
| **Postgres без host-port** | В обоих compose — только internal. Усложняет ручную отладку |
| **LiveKit/SMTP вне prod-compose** | Управляются отдельно, не в `docker-compose.prod.yml` |
| **76 Python-скриптов в корне** | Загромождают корень репозитория. Следует перенести в `scripts/vps/` |
| **`docs/demo-tailscale.md`** | Упомянут в README, но файл отсутствует |

### Мобильные приложения

| Проблема | Описание |
|----------|----------|
| **iOS permissions (mobile)** | `Info.plist` без `NSLocationWhenInUseUsageDescription`, `NSCameraUsageDescription`, `NSMicrophoneUsageDescription` — краш/reject при использовании |
| **Courier только Android** | Нет `ios/` директории |
| **Нет онлайн-оплаты** | «Онлайн» — просто строка, нет платёжного SDK |
| **Base URL хардкод** | Mobile: `https://grillyage.ru`. Courier: `http://10.0.2.2:4000`. Нет `.env` |
| **Push только mobile** | Courier не получает push-уведомления о новых заказах |

### Тестирование

| Проблема | Описание |
|----------|----------|
| **Mobile tests** | Placeholder (`expect(true, isTrue)`) |
| **Courier tests** | Отсутствуют |
| **Web e2e** | 3 теста (guest cart, categories, auth modal) — только публичный сайт |
| **Admin e2e** | Нет тестов для CRM-страниц |
| **API tests** | Есть unit + e2e, но покрытие не документировано |

### Данные и консистентность

| Проблема | Описание |
|----------|----------|
| **Seed admin password** | `admin123` — слабый пароль для production seed |
| **Статусы в shared vs backend** | `ORDER_STATUS_TRANSITIONS` в shared может расходиться с `OrdersService.statusLabel` |
| **`OrderStatus` enum** | 7 значений, но `statusLabel` ссылается на 8 (`PREPARING`, `READY`, `DELIVERED` — dead labels) |
| **`SUPER_ADMIN`** | В enum + guard, но нет API для создания SUPER_ADMIN через admin |
| **`RefreshToken` полиморфная** | `userId?` + `staffUserId?` — обе nullable. Нет CHECK-constraint |

---

## Приложение A: Переменные окружения

### Обязательные (12, без них API не стартует)

```
DATABASE_URL
JWT_ACCESS_SECRET
JWT_REFRESH_SECRET
STAFF_JWT_ACCESS_SECRET
STAFF_JWT_REFRESH_SECRET
SMTP_HOST
SMTP_USER
SMTP_PASSWORD
MAIL_FROM
LIVEKIT_API_KEY
LIVEKIT_API_SECRET
LIVEKIT_HOST
```

### Опциональные (с дефолтами)

```
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=30d
STAFF_JWT_ACCESS_TTL=15m
STAFF_JWT_REFRESH_TTL=30d
SMTP_PORT=25
SMTP_SECURE=false
SMTP_IGNORE_TLS=true
LIVEKIT_PORT=7880
API_PORT=4000
UPLOADS_DIR=./uploads
MAX_UPLOAD_SIZE_MB=5
```

### Frontend (NEXT_PUBLIC_*)

```
NEXT_PUBLIC_API_URL
NEXT_PUBLIC_WS_URL
NEXT_PUBLIC_YANDEX_MAPS_API_KEY
NEXT_PUBLIC_VK_CLIENT_ID
NEXT_PUBLIC_YANDEX_CLIENT_ID
NEXT_PUBLIC_SENTRY_DSN
NEXT_PUBLIC_YANDEX_METRICA_ID
```

### OAuth / Social

```
NEXT_PUBLIC_VK_CLIENT_ID
NEXT_PUBLIC_YANDEX_CLIENT_ID
YANDEX_CLIENT_SECRET
TELEGRAM_BOT_TOKEN
```

### Push / Monitoring

```
FCM_CREDENTIALS_PATH
SENTRY_DSN
SMS_RU_API_KEY          # placeholder, не используется
```

---

## Приложение B: CI/CD

### CI (`ci.yml`)

Триггер: push/PR на `main`. 3 параллельных job'а:

1. **lint-typecheck**: `npm ci` → build shared → eslint → `tsc --noEmit` (api + web)
2. **test-api**: PostgreSQL 17 service → `prisma generate` → `migrate deploy` → `npm test` (api)
3. **build**: `npm run build` → Docker buildx (api + web) с GHA cache

### Deploy (`deploy.yml`)

Триггер: `workflow_run` CI (conclusion=success).

1. Build api + web images (GHA cache)
2. Export → tar.gz
3. SCP → VPS `/opt/grilyage/deploy`
4. SSH → `docker load` + `docker compose -f infra/docker-compose.prod.yml up -d --no-deps --build api web`
5. Prune old images
6. Health-check `https://grillyage.ru/`

Секреты: `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`

---

## Приложение C: Команды разработки

```bash
# Dev
cp .env.example .env
docker compose -f infra/docker-compose.yml up -d   # PostgreSQL + Mailpit
npm install
npm run db:migrate                                  # миграции + сид
npm run dev                                         # api: :4000, web: :3000

# URLs
# Сайт: http://localhost:3000
# CRM: http://localhost:3000/admin
# API: http://localhost:4000/api/v1
# Swagger: http://localhost:4000/api/docs
# Mailpit: http://localhost:8025

# Лаунчер
npm run launcher

# Тесты
npm test          # unit + e2e API
npm run test:e2e  # Playwright (web)

# Build
npm run build     # shared → api → web
```

---

*Документ сгенерирован на основе анализа репозитория. Дата: июнь 2026.*
