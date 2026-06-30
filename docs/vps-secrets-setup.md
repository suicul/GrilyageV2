# VPS Secrets Setup — Грильяж

> **Когда:** перед первым деплоем на VPS
> **Где:** выполняются на **локальной машине** (WSL / Linux / macOS)
> **Цель:** сгенерировать криптостойкие секреты и заполнить `.env.production`

---

## 1. Генерация JWT-секретов

Все 4 секрета генерируются одинаково — **64 байта случайных данных в hex**:

```bash
# Клиентские токены
openssl rand -hex 64   # → JWT_ACCESS_SECRET
openssl rand -hex 64   # → JWT_REFRESH_SECRET

# Staff-токены (CRM)
openssl rand -hex 64   # → STAFF_JWT_ACCESS_SECRET
openssl rand -hex 64   # → STAFF_JWT_REFRESH_SECRET
```

Каждый вызов даёт уникальную строку длиной 128 символов.

**Куда вписать:** в `.env.production`, переменные:

```
JWT_ACCESS_SECRET=<вставь_64_hex>
JWT_REFRESH_SECRET=<вставь_64_hex>
STAFF_JWT_ACCESS_SECRET=<вставь_64_hex>
STAFF_JWT_REFRESH_SECRET=<вставь_64_hex>
```

> ⚠️ Если секрет меньше 32 байт (64 hex-символа) — HMAC-SHA256 становится уязвим к брутфорсу.

---

## 2. Генерация пароля PostgreSQL

```bash
openssl rand -hex 32   # 32 байта = 64 hex-символа
```

Вписать в `.env.production`:

```
POSTGRES_PASSWORD=<сгенерированная_64hex_строка>
DATABASE_URL=postgresql://grilyage:${POSTGRES_PASSWORD}@postgres:5432/grilyage
```

---

## 3. Telegram Bot Token

Создаётся через @BotFather в Telegram. Инструкция:

1. Открой Telegram → найди `@BotFather`
2. Отправь `/newbot`
3. Назови бота (например, `GrilyageBot`)
4. Получи токен вида `1234567890:ABCdefGHIjklmNOPqrstUVwxyz-1234567`
5. Зайди в настройки бота → `Bot Settings` → `Domain` → укажи `grillyage.ru`
6. Включи Telegram Login Widget

Вписать в `.env.production`:

```
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklmNOPqrstUVwxyz-1234567
```

**Также обновить Flutter:** `apps/mobile/lib/features/auth/login_screen.dart:367`
заменить `PLACEHOLDER_BOT` на имя бота (например `GrilyageBot`).

---

## 4. Yandex Maps API Key

1. Перейти на https://developer.tech.yandex.ru/
2. Войти под Яндекс-ID, который админстрирует приложение `2461c9f22e4c4feeae467abaf7797956`
3. Создать новый API-ключ в разделе «Карты» → «JavaScript API и HTTP Геокодер»
4. В HTTP Referer Restrictions указать: `grillyage.ru/*`
5. Скопировать ключ

Вписать в `.env.production`:

```
YANDEX_MAPS_API_KEY=<ключ_от_яндекса>
```

---

## 5. VK Client ID (уже проставлен)

Значение `54642071` уже указано в `.env.production`.
Убедись, что в настройках приложения VK (https://id.vk.com/about/business/go)
указан доверенный redirect URI: `https://grillyage.ru/auth/vk/callback`

---

## 6. Yandex OAuth (уже проставлен)

- ID приложения: `2461c9f22e4c4feeae467abaf7797956`
- Secret: `b430fa45f1c14ecab1ef7fd9141fc88f`

Убедись в настройках приложения (https://oauth.yandex.ru/):
- Redirect URI: `https://grillyage.ru/auth/yandex/callback`
- Доступ: `email`, `login`, `avatar`

---

## 7. Sentry DSN

1. Создать аккаунт на https://sentry.io
2. Создать 2 проекта: `grilyage-api` (NestJS) и `grilyage-web` (Next.js)
3. Из каждого скопировать DSN

```
SENTRY_DSN=https://<key>@o<org>.ingest.de.sentry.io/<project>
```

---

## 8. Yandex Metrica

1. Перейти на https://metrika.yandex.ru/
2. Создать счётчик для `grillyage.ru`
3. Скопировать номер счётчика

```
NEXT_PUBLIC_YANDEX_METRICA_ID=<номер>
```

---

## 9. Firebase Cloud Messaging (push-уведомления)

1. Создать проект в https://console.firebase.google.com/
2. Добавить Android-приложение (package: `com.grilyage.app`)
3. Скачать `google-services.json` → положить в `apps/mobile/android/app/`
4. В настройках проекта → «Сервисные аккаунты» → «Создать новый ключ»
5. Скачать JSON → положить в корень проекта как `firebase-credentials.json`

В `.env.production`:

```
FCM_CREDENTIALS_PATH=/app/firebase-credentials.json
FCM_CREDENTIALS_SOURCE=./firebase-credentials.json
```

---

## 10. SMS.ru (опционально)

1. Зарегистрироваться на https://sms.ru
2. Получить API-ключ

```
SMS_RU_API_KEY=<ключ_от_sms.ru>
```

Без ключа SMS работают в режиме заглушки (лог в консоль).

---

## Быстрый чеклист после генерации

```bash
# Проверить, что .env.production не попадёт в git
git check-ignore .env.production   # должен показать файл

# Установить права (чтобы никто не прочитал)
chmod 600 .env.production

# Проверить, что ни один секрет не содержит "CHANGE_ME" или "placeholder"
grep -n "CHANGE_ME\|placeholder" .env.production
# После замены должно остаться только SMTP_USER / SMTP_PASSWORD для Postfix
```

## Пул-реквест не нужен — файл .env.production в .gitignore
