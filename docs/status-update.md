# Status Update — Июнь 2026

> **Обновление к:** `current-state.md`, `audit.md`, `security-review.md`, `implementation-roadmap.md`
> **Дата:** 29 июня 2026
> **Код изменён** — этот документ отражает РЕАЛЬНОЕ состояние после исправлений.

---

## Исправленные задачи (P0-P3)

Следующие задачи из `implementation-roadmap.md` **уже выполнены** в ветке `master`:

### P0 — Блокеры релиза

| # | Задача | Статус | Коммит / Файл |
|---|--------|--------|---------------|
| P0-1 | Хардкод-пароли в Python-скриптах | ✅ Done | `cbc5252` — скрипты в `scripts/vps/`, `*.py` в .gitignore |
| P0-3 | SMS.ru интеграция | ⚠️ Частично | `f43e00d` — провайдер с log-stub fallback |
| P0-5 | IDOR в `getMyOrderById` | ✅ Done | `mobile.service.ts:493` — `order.userId !== userId` |
| P0-6 | WebSocket auth | ✅ Done | Все 5 gateway'ей имеют JWT в `handleConnection` |
| P0-7 | OTP brute-force protection | ✅ Done | `8dfd4d0`+`20c17ef` — OtpThrottleModule |
| P0-9 | Курьерская навигация | ✅ Done | `url_launcher` в `courier_map_screen.dart` |
| P0-10 | Push для курьера | ✅ Done | FCM + local notifications + background handler |
| P0-12 | /menu на API | ✅ Done | `4a3e15a` — `/api/v1/categories?all=true` |
| P0-14 | /social/tg 404 | ✅ Done | case `tg` в `page.tsx` |
| P0-15 | About screen (Москва→Омск) | ✅ Done | "Омск, Лесозаводская, 7" |

### P1 — Критичные проблемы

| # | Задача | Статус | Файл |
|---|--------|--------|------|
| P1-1 | Nonce-based CSP | ✅ Done | `proxy.ts` — nonce + `strict-dynamic` |

### P2 — Важные улучшения

| # | Задача | Статус | Файл |
|---|--------|--------|------|
| P2-3 | proxy.ts redirect | ✅ Done | `proxy.ts` — redirect на `/admin/login` |
| P2-9 | "Моё местоположение" FAB | ✅ Done | `map_screen.dart` — `_goToMyLocation()` с geolocator |

### P3 — Косметика

| # | Задача | Статус | Файл |
|---|--------|--------|------|
| P3-1 | Shared Dart package | ✅ Done | `packages/mobile_shared/` существует и используется |

### Новые исправления (29 июня 2026)

| # | Задача | Файл |
|---|--------|------|
| CI/CD branches | `ci.yml`, `deploy.yml` — добавлен `master` |
| Deploy migrations | `deploy.yml` — `prisma migrate deploy` перед restart |
| Deploy health check | `deploy.yml` — `/health` вместо `/` |
| Deploy build-args | `deploy.yml` — `NEXT_PUBLIC_*` для web build |
| StaffUser migration | `20260629120000_add_staff_fields_and_user_updates` — loginAttempts, lockedUntil, totpSecret, transportType, deliveryRadius, GPS, updatedAt |
| iOS permissions | `apps/mobile/ios/Runner/Info.plist` — 5 NSXxxUsageDescription |
| Speaker toggle | `call_screen.dart` — `Hardware.instance.setSpeakerphoneOn()` |
| Management guide | `MANAGEMENT.md` — инструкция по управлению |

---

## Ещё НЕ исправлено

| # | Задача | Приоритет |
|---|--------|-----------|
| P0-2 | Онлайн-оплата | 🔴 Блокер |
| P0-4 | Backup PostgreSQL | 🔴 Блокер |
| P0-11 | Унификация статусов заказов | 🟡 Важно |
| P0-13 | Юридический блок /about | 🟡 Важно |
| P1-2 | CSRF-токены (origin-check есть, токенов нет) | 🟡 |
| P1-3 | Access-токены в httpOnly cookie | 🟡 |
| P1-4 | SSR для публичных страниц | 🟡 |
| P1-5 | Pagination в CRM | 🟡 |
| P2-1 | Cron-задачи | 🟡 |
| P2-2 | Гекодинг адресов | 🟡 |
| Chat room access control | `chat.gateway.ts` — нет проверки доступа к room | 🟡 |
| WebSocket CORS whitelist | Все gateway'и — `callback(null, true)` | 🟢 |
| Operator app — alert() вместо LiveKit | `operator/renderer/index.html:337` | 🟢 |
| Курьер iOS | Нет `ios/` директории | 🟢 |

---

## Расхождения с предыдущей документацией

| Документ | Утверждение | Реальность |
|----------|-------------|------------|
| `current-state.md` | "76 Python-скриптов в корне" | Перенесены в `scripts/vps/` (81 файл) |
| `project-map.md` | "Нет Terraform/Pulumi" | `infra/terraform/` существует |
| `project-map.md` | "Нет shared Dart-кода" | `packages/mobile_shared/` существует и используется |
| `audit.md` S-C1 | "Хардкод-пароли в 76 скриптах" | Исправлено (P0-1) |
| `audit.md` B-C1 | "IDOR в mobile.service.ts:466" | Исправлено (P0-5) |
| `audit.md` S-C5 | "4/5 gateway'ей без auth" | Все 5 с auth (P0-6) |
| `audit.md` S-C2 | "CSP unsafe-inline" | Nonce-based CSP (P1-1) |
| `security-review.md` C1 | "WebSocket без auth" | Все 5 с JWT |
| `README.md` | `docs/demo-tailscale.md` | Файл не существует |
| `README.md` | `.omo/plans/grilyage-delivery.md` | Файл не существует |
| `implementation-roadmap.md` | "4 миграции" | 7 миграций (6 + новая 20260629120000) |

---

## Корневая причина "internal server error" при входе в админку

**Проблема:** `StaffAuthService.login()` обращается к полям `loginAttempts`, `lockedUntil`, `totpSecret` в модели `StaffUser`. Эти поля есть в `schema.prisma`, но **не было миграций** для их создания в БД. После `prisma migrate deploy` на VPS эти колонки отсутствовали → Prisma выбрасывал `PrismaClientValidationError` → 500 Internal Server Error.

**Решение:** Создана миграция `20260629120000_add_staff_fields_and_user_updates` — добавляет все недостающие колонки в `StaffUser` + `updatedAt` в `User`.

## Корневая причина "internal server error" при Яндекс ID

**Проблема:** `SocialAuthService.exchangeYandexCode()` требует `NEXT_PUBLIC_YANDEX_CLIENT_ID` и `YANDEX_CLIENT_SECRET`. В `.env.production` значения есть, но:
1. `docker-compose.prod.yml` не пробрасывал их в API контейнер
2. `deploy.yml` не передавал `NEXT_PUBLIC_YANDEX_CLIENT_ID` как build-arg для web

**Решение:**
1. `docker-compose.prod.yml` — добавлены env vars для API + build-arg для web
2. `deploy.yml` — добавлены build-args для web build

---

*Обновление создано 29 июня 2026. Предыдущие документы (`current-state.md`, `audit.md`, и т.д.) описывают состояние ДО этих исправлений.*
