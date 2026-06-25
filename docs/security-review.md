# Security Review — Проект «Грильяж»

> **Дата:** июнь 2026  
> **Аудитор:** Sisyphus (AI Agent)  
> **Основа:** Исходный код, `project-map.md`, `audit.md`, `strategic-report.md`  
> **Методология:** OWASP Top 10, CVSS v3.1  
> **Код не изменён**  
> **Статус:** ACTIVE

---

## Executive Summary

**Общая оценка безопасности: 65/100** (критические уязвимости присутствуют)

| Категория | Оценка | Комментарий |
|-----------|--------|-------------|
| **Аутентификация** | 70/100 | JWT реализован корректно, но нет 2FA, account lockout |
| **Авторизация** | 75/100 | RBAC работает, но есть IDOR-баг в mobile.service.ts |
| **WebSocket** | 30/100 | 4 из 5 gateway'ей открыты без аутентификации |
| **Загрузка файлов** | 60/100 | Sharp конвертирует в WebP, но нет валидации MIME |
| **CSP / Headers** | 65/100 | Helmet настроен, но `'unsafe-inline'` для scripts |
| **Хранение данных** | 80/100 | bcrypt(12), SHA-256 для токенов, refresh token rotation |
| **Rate limiting** | 75/100 | Throttle на большинстве endpoints, но нет exponential backoff для OTP |
| **Инфраструктура** | 20/100 | Хардкод-пароли в Python-скриптах, нет backup |

**Критические уязвимости (требуют немедленного исправления):**
1. 🔴 **IDOR в `mobile.service.ts:466`** — любой пользователь может получить чужой заказ
2. 🔴 **WebSocket без auth** — 4 gateway'я принимают любые подключения
3. 🔴 **SSRF в `saveImageFromUrl`** — нет валидации URL (можно читать локальные файлы)
4. 🔴 **Хардкод-пароли** — 76 Python-скриптов с plaintext-паролем VPS

**Вердикт:** **NO-GO** для production без устранения критических уязвимостей.

---

## 1. Аутентификация (Authentication)

### 1.1. JWT-токены

#### ✅ Сильные стороны

| Аспект | Реализация | Оценка |
|--------|------------|--------|
| **Алгоритм** | HS256 (HMAC-SHA256) | ✅ Корректно |
| **Expiration** | `ignoreExpiration: false` | ✅ Токены истекают |
| **Refresh token rotation** | Старый токен помечается `revokedAt` | ✅ Защита от reuse |
| **Хранение refresh** | SHA-256 hash в БД | ✅ Токены не хранятся в plaintext |
| **Секреты** | Отдельные для user/staff, 4 ключа | ✅ Разделение |
| **Валидация env** | `env-validation.ts` проверяет наличие секретов | ✅ Fail-fast |

#### ⚠️ Проблемы

| # | Проблема | CVSS | Файл | Описание |
|---|----------|------|------|----------|
| A1.1 | **Fallback-секреты** | 7.5 | `jwt.strategy.ts:16` | `config.get('JWT_ACCESS_SECRET', 'change-me-user-access')` — если env не установлен, используется дефолт |
| A1.2 | **Нет 2FA** | 5.3 | — | Нет TOTP / WebAuthn для staff и клиентов |
| A1.3 | **Нет account lockout** | 5.3 | `auth.service.ts:72-89` | Можно бесконечно перебирать пароли (ограничен только throttle 5/min) |
| A1.4 | **JWT в localStorage** | 6.1 | — | Client access-токен хранится в `localStorage` (уязвим к XSS) |
| A1.5 | **Refresh token в БД без привязки к device** | 4.3 | `schema.prisma:145-158` | Нет `userAgent`, `ip`, `deviceId` — невозможно отозвать конкретное устройство |

**Рекомендации:**
- Убрать fallback-секреты, падать с ошибкой если `JWT_ACCESS_SECRET` не установлен
- Добавить 2FA (TOTP) для staff (P1-9 в roadmap)
- Добавить account lockout после 5 неудачных попыток (P1-10)
- Перевести access-токен в httpOnly cookie (P1-3)
- Добавить `userAgent`, `ip` в `RefreshToken` модель

### 1.2. Пароли

#### ✅ Сильные стороны

| Аспект | Реализация | Оценка |
|--------|------------|--------|
| **Хеширование** | `bcrypt` с cost factor 12 | ✅ Современный алгоритм |
| **Сравнение** | `bcrypt.compare` (timing-safe) | ✅ Защита от timing attacks |

#### ⚠️ Проблемы

| # | Проблема | CVSS | Файл | Описание |
|---|----------|------|------|----------|
| A2.1 | **Нет проверки сложности пароля** | 3.7 | `dto/register.dto.ts` | Нет minLength, нет проверки на common passwords |
| A2.2 | **Нет проверки на утечки** | 3.7 | — | Нет интеграции с Have I Been Pwned |

**Рекомендации:**
- Добавить `minLength: 8` в DTO
- Интегрировать HIBP API (опционально)

### 1.3. OTP-коды

#### ✅ Сильные стороны

| Аспект | Реализация | Оценка |
|--------|------------|--------|
| **Длина** | 6 цифр | ✅ 10^6 комбинаций |
| **Expiration** | Проверяется `expiresAt` | ✅ Коды истекают |
| **Попытки** | `attempts >= 5` → блокировка | ✅ Защита от брутфорса |
| **Throttle** | 3 запроса/мин на отправку | ✅ Защита от SMS bombing |

#### ⚠️ Проблемы

| # | Проблема | CVSS | Файл | Описание |
|---|----------|------|------|----------|
| A3.1 | **Нет exponential backoff** | 5.3 | `mobile.service.ts:191-210` | После каждой неудачной попытки нет задержки. 5 попыток за 1 секунду. |
| A3.2 | **Phone OTP на email** | 6.1 | `mobile.service.ts:285-298` | `sendPhoneOtp` отправляет код на email, а не SMS. Пользователь ожидает SMS. |
| A3.3 | **OTP логируется в plaintext** | 5.3 | `mobile.service.ts:298` | `this.logger.log(\`Phone OTP ${code} sent...\`)` — код виден в логах |
| A3.4 | **Нет IP-based rate limit** | 4.3 | — | Throttle по IP, но нет глобального лимита на verification |

**Рекомендации:**
- Добавить exponential backoff (1с, 2с, 4с, 8с) после неудачных попыток (P0-7)
- Интегрировать SMS.ru (P0-3)
- Убрать логирование OTP-кода
- Добавить IP-based rate limit на verification endpoints

### 1.4. Social Auth (VK, Yandex, Telegram)

#### ✅ Сильные стороны

| Аспект | Реализация | Оценка |
|--------|------------|--------|
| **OAuth flow** | Стандартный OAuth 2.0 | ✅ Корректно |
| **Verification** | HMAC-SHA256 для Telegram | ✅ Защита от подделки |

#### ⚠️ Проблемы

| # | Проблема | CVSS | Файл | Описание |
|---|----------|------|------|----------|
| A4.1 | **Нет verification для VK/Yandex** | 6.1 | `social-auth.service.ts` | Токены не верифицируются на стороне провайдера |
| A4.2 | **Account takeover через social** | 7.5 | — | Если email совпадает, аккаунт привязывается без подтверждения |

**Рекомендации:**
- Верифицировать токены VK/Yandex через их API
- Требовать подтверждение email при привязке social account

---

## 2. Авторизация (Authorization)

### 2.1. RBAC (Role-Based Access Control)

#### ✅ Сильные стороны

| Аспект | Реализация | Оценка |
|--------|------------|--------|
| **Роли** | `SUPER_ADMIN`, `ADMIN`, `OPERATOR`, `COURIER` | ✅ Чёткая иерархия |
| **Guard** | `StaffRolesGuard` + `@Roles()` decorator | ✅ Декларативный подход |
| **Наследование** | `SUPER_ADMIN` наследует `ADMIN` | ✅ Корректно |
| **Проверка active** | `staff.active` проверяется при каждом запросе | ✅ Деактивация работает |

#### ⚠️ Проблемы

| # | Проблема | CVSS | Файл | Описание |
|---|----------|------|------|----------|
| B1.1 | **IDOR в `getMyOrderById`** | 7.5 | `mobile.service.ts:466` | `order.customerName !== userId` — сравнивает строку и cuid, всегда true. Затем проверяет `userId`, но первая проверка бессмысленна. |
| B1.2 | **Нет проверки владения в `deleteAddress`** | 6.5 | `mobile.service.ts` | Не проверяется, что адрес принадлежит пользователю |
| B1.3 | **CORS wildcard в WebSocket** | 6.1 | `orders.gateway.ts:13-16` | `callback(null, true)` — принимает любые origins |

**Рекомендации:**
- Исправить `mobile.service.ts:466` на `order.userId !== userId` (P0-5)
- Добавить проверку владения в `deleteAddress`
- Ограничить CORS в WebSocket gateway'ях

### 2.2. Защита административной панели

#### ✅ Сильные стороны

| Аспект | Реализация | Оценка |
|--------|------------|--------|
| **Staff JWT** | Отдельный секрет `STAFF_JWT_ACCESS_SECRET` | ✅ Разделение |
| **Cookie + Bearer** | Поддержка обоих методов | ✅ Гибкость |
| **httpOnly cookie** | `staffAccessToken` в httpOnly cookie | ✅ Защита от XSS |

#### ⚠️ Проблемы

| # | Проблема | CVSS | Файл | Описание |
|---|----------|------|------|----------|
| B2.1 | **`proxy.ts` не редиректит** | 5.3 | `proxy.ts:9` | `if (!staffToken) return NextResponse.next()` — пропускает без токена |
| B2.2 | **Нет CSRF-токенов** | 6.1 | — | Staff-операции уязвимы к CSRF |
| B2.3 | **Нет 2FA для admin** | 5.3 | — | Компромет пароля = полный доступ |

**Рекомендации:**
- Добавить redirect на `/admin/login` при отсутствии токена (P2-3)
- Добавить CSRF-токены (P1-2)
- Добавить 2FA для staff (P1-9)

---

## 3. WebSocket Security

### 3.1. Текущее состояние

| Gateway | Namespace | Auth | CORS | Оценка |
|---------|-----------|------|------|--------|
| `OrdersGateway` | `/staff` | ❌ Нет | `*` | 🔴 Критично |
| `MobileGateway` | `/mobile` | ❌ Нет | `*` | 🔴 Критично |
| `ChatGateway` | `/chat` | ❌ Нет | `true` | 🔴 Критично |
| `CallGateway` | `/calls` | ❌ Нет | `*` | 🔴 Критично |
| `UserOrdersGateway` | `/orders` | ✅ JWT | `*` | 🟡 Средне |

### 3.2. Уязвимости

| # | Проблема | CVSS | Файл | Описание |
|---|----------|------|------|----------|
| C1 | **Нет аутентификации на connect** | 8.1 | `orders.gateway.ts:25-27` | Любой может подключиться к `/staff` и получать все заказы в реальном времени |
| C2 | **CORS wildcard** | 6.1 | Все gateway'и | `callback(null, true)` — принимает любые origins |
| C3 | **Нет rate limiting** | 5.3 | — | Можно flood'ить WebSocket-соединения |
| C4 | **Нет проверки roomId в chat** | 6.5 | `chat.gateway.ts:30-32` | Любой может присоединиться к любому `room:{id}` |

**Рекомендации:**
- Добавить JWT-проверку в `handleConnection` для всех gateway'ей (P0-6)
- Ограничить CORS whitelist'ом доменов
- Добавить rate limiting на WebSocket-сообщения
- Проверять, что пользователь имеет доступ к `roomId` в chat

---

## 4. Загрузка файлов

### 4.1. Текущая реализация

**Файл:** `admin.controller.ts:143-193`

```typescript
@Post('uploads/file')
@UseInterceptors(
  FileInterceptor('file', {
    storage: diskStorage({ ... }),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  }),
)
async uploadFile(@UploadedFile() file: Express.Multer.File) {
  // Конвертация в WebP через sharp
  await sharp(tempPath)
    .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(outputPath);
}
```

### 4.2. Сильные стороны

| Аспект | Реализация | Оценка |
|--------|------------|--------|
| **Размер** | Лимит 10 MB | ✅ Защита от DoS |
| **Конвертация** | Sharp → WebP | ✅ Унификация формата |
| **Имя файла** | `Date.now()-random.webp` | ✅ Нет path traversal |
| **Авторизация** | `@Roles(StaffRole.ADMIN)` | ✅ Только admin |

### 4.3. Уязвимости

| # | Проблема | CVSS | Файл | Описание |
|---|----------|------|------|----------|
| D1 | **Нет валидации MIME** | 6.1 | `admin.controller.ts:167` | Принимается любой файл, не только изображения |
| D2 | **SSRF в `saveImageFromUrl`** | 8.1 | `admin.service.ts:260-275` | `fetch(url)` без валидации — можно читать `file:///etc/passwd`, `http://169.254.169.254` (AWS metadata) |
| D3 | **Нет проверки размера после конвертации** | 4.3 | — | Sharp может создать большой файл из маленького (zip bomb) |
| D4 | **Статическая раздача без CORS** | 3.7 | `main.ts:65` | `express.static(uploadsDir)` — файлы доступны публично |

**Рекомендации:**
- Добавить валидацию MIME (`file.mimetype.startsWith('image/')`)
- Валидировать URL в `saveImageFromUrl` (whitelist доменов, запрет `file://`, `http://localhost`, `http://169.254.*`)
- Добавить проверку размера после конвертации
- Настроить CORS для `/uploads`

---

## 5. Content Security Policy (CSP)

### 5.1. Текущая конфигурация

**Файл:** `main.ts:68-114`

```typescript
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", 'https://unpkg.com', "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        // ...
      },
    },
  }),
);
```

### 5.2. Оценка

| Директива | Значение | Оценка | Комментарий |
|-----------|----------|--------|-------------|
| `defaultSrc` | `'self'` | ✅ | Строгая |
| `scriptSrc` | `'unsafe-inline'` | 🔴 | Позволяет XSS |
| `styleSrc` | `'unsafe-inline'` | 🟡 | Необходимо для inline styles |
| `imgSrc` | `data:`, `blob:` | 🟡 | Позволяет data URI |
| `frameSrc` | `yandex.com`, `yandex.ru` | ✅ | Ограничено |
| `connectSrc` | `wss://grillyage.ru` | ✅ | Ограничено |
| `formAction` | `'self'` | ✅ | Защита от form hijacking |
| `frameAncestors` | `'none'` | ✅ | Защита от clickjacking |

### 5.3. Уязвимости

| # | Проблема | CVSS | Описание |
|---|----------|------|----------|
| E1 | **`'unsafe-inline'` для scripts** | 7.5 | Позволяет инжектить произвольный JavaScript |
| E2 | **Нет nonce** | 6.1 | Nonce-based CSP безопаснее |

**Рекомендации:**
- Заменить `'unsafe-inline'` на nonce-based CSP (P1-1)
- Добавить `strict-dynamic` для совместимости с Next.js

---

## 6. Хранение данных

### 6.1. Пароли

| Аспект | Реализация | Оценка |
|--------|------------|--------|
| **Алгоритм** | bcrypt | ✅ Современный |
| **Cost factor** | 12 | ✅ ~250ms на hash (защита от брутфорса) |
| **Сравнение** | `bcrypt.compare` | ✅ Timing-safe |

### 6.2. Токены

| Токен | Хранение | Оценка |
|-------|----------|--------|
| **Refresh token** | SHA-256 hash в БД | ✅ Не хранится в plaintext |
| **Activation token** | SHA-256 hash в БД | ✅ |
| **Email token** | SHA-256 hash в БД | ✅ |
| **OTP code** | Plaintext в БД | ⚠️ Должен быть hash |

### 6.3. Персональные данные (152-ФЗ)

| Аспект | Реализация | Оценка |
|--------|------------|--------|
| **Согласие** | `UserConsent` модель | ✅ Записывается |
| **Шифрование at rest** | Нет | 🔴 PII не шифруется |
| **Аудит-лог** | Нет | 🔴 Нет истории доступа |

**Рекомендации:**
- Хешировать OTP-коды (как refresh tokens)
- Добавить шифрование PII (email, phone) at rest
- Добавить аудит-лог для доступа к PII

---

## 7. Rate Limiting

### 7.1. Текущая конфигурация

| Endpoint | Limit | TTL | Оценка |
|----------|-------|-----|--------|
| `POST /auth/register` | 3 | 60s | ✅ |
| `POST /auth/login` | 5 | 60s | ✅ |
| `POST /auth/resend-verification` | 2 | 60s | ✅ |
| `POST /mobile/auth/send-code` | 3 | 60s | ✅ |
| `POST /mobile/auth/complete` | 10 | 60s | 🟡 Высокий |
| `POST /mobile/auth/verify-email-otp` | 10 | 60s | 🟡 Высокий |
| `POST /mobile/auth/verify-phone-otp` | 10 | 60s | 🟡 Высокий |
| `POST /staff-auth/login` | 5 | 60s | ✅ |

### 7.2. Уязвимости

| # | Проблема | CVSS | Описание |
|---|----------|------|----------|
| F1 | **Нет exponential backoff** | 5.3 | После неудачной попытки нет задержки |
| F2 | **Нет IP-based lockout** | 5.3 | Можно перебирать с разных IP |
| F3 | **Высокий limit для OTP verification** | 4.3 | 10 попыток/мин — достаточно для брутфорса 6-digit кода |

**Рекомендации:**
- Добавить exponential backoff (P0-7)
- Добавить IP-based lockout после 10 неудачных попыток
- Уменьшить limit для OTP verification до 5/мин

---

## 8. Инфраструктурная безопасность

### 8.1. Хардкод-пароли

| # | Проблема | CVSS | Файл | Описание |
|---|----------|------|------|----------|
| G1 | **Plaintext-пароль VPS** | 9.8 | 76 Python-скриптов | `paramiko` → `212.119.42.249` root password в plaintext |
| G2 | **`.env.production` может быть в git** | 8.1 | — | Если содержит реальные секреты — полный компромет |

**Рекомендации:**
- Перенести скрипты в `scripts/vps/`, читать пароли из env/SSH key (P0-1)
- Проверить `.env.production` в `.gitignore` (P0-8)
- Сменить все секреты если `.env.production` был в git

### 8.2. Backup

| # | Проблема | CVSS | Описание |
|---|----------|------|----------|
| G3 | **Нет backup PostgreSQL** | 8.1 | Database corruption → полная потеря данных |

**Рекомендации:**
- Настроить автоматический `pg_dump` каждые 6 часов (P0-4)

### 8.3. Мониторинг

| # | Проблема | CVSS | Описание |
|---|----------|------|----------|
| G4 | **Нет Grafana-алертов** | 5.3 | Администратор не узнаёт о падении |
| G5 | **Нет audit log** | 5.3 | Невозможно расследовать инциденты |

**Рекомендации:**
- Настроить Alertmanager + Telegram (P3)
- Добавить audit log для критических операций

---

## 9. Матрица уязвимостей

### 9.1. Критические (CVSS ≥ 7.0)

| ID | Уязвимость | CVSS | Вектор | Влияние |
|----|------------|------|--------|---------|
| G1 | Хардкод-пароли VPS | 9.8 | Network | Полный компромет production |
| C1 | WebSocket без auth | 8.1 | Network | Утечка всех заказов в реальном времени |
| D2 | SSRF в `saveImageFromUrl` | 8.1 | Network | Чтение локальных файлов, AWS metadata |
| B1.1 | IDOR в `getMyOrderById` | 7.5 | Network | Утечка PII (адреса, телефоны) |
| E1 | CSP `'unsafe-inline'` | 7.5 | Network | XSS-атаки |
| A4.2 | Account takeover через social | 7.5 | Network | Компромет аккаунтов |

### 9.2. Высокие (CVSS 4.0-6.9)

| ID | Уязвимость | CVSS | Вектор | Влияние |
|----|------------|------|--------|---------|
| A1.4 | JWT в localStorage | 6.1 | Network | Кража токенов через XSS |
| A3.2 | Phone OTP на email | 6.1 | Network | Снижение конверсии |
| B2.2 | Нет CSRF-токенов | 6.1 | Network | CSRF-атаки на staff |
| C4 | Нет проверки roomId в chat | 6.5 | Network | Чтение чужих чатов |
| D1 | Нет валидации MIME | 6.1 | Network | Загрузка вредоносных файлов |
| A1.1 | Fallback-секреты JWT | 7.5 | Network | Подделка токенов если env не установлен |

### 9.3. Средние (CVSS < 4.0)

| ID | Уязвимость | CVSS | Вектор | Влияние |
|----|------------|------|--------|---------|
| A2.1 | Нет проверки сложности пароля | 3.7 | Network | Слабые пароли |
| A3.3 | OTP логируется | 5.3 | Local | Утечка кодов из логов |
| F3 | Высокий limit для OTP | 4.3 | Network | Брутфорс кодов |

---

## 10. Roadmap исправлений

### 10.1. Немедленные (P0, 1-2 недели)

| # | Исправление | Часы | Приоритет |
|---|-------------|------|-----------|
| 1 | Исправить IDOR в `mobile.service.ts:466` | 1 | 🔴 Критично |
| 2 | Добавить JWT-auth в WebSocket gateway'и | 8-12 | 🔴 Критично |
| 3 | Валидировать URL в `saveImageFromUrl` | 4-6 | 🔴 Критично |
| 4 | Удалить хардкод-пароли из Python-скриптов | 8-12 | 🔴 Критично |
| 5 | Проверить `.env.production` в `.gitignore` | 2-4 | 🔴 Критично |
| 6 | Добавить exponential backoff для OTP | 4-6 | 🟡 Важно |
| 7 | Убрать логирование OTP-кода | 1 | 🟡 Важно |

**Итого P0:** 28-42 часа

### 10.2. Краткосрочные (P1, 1-2 месяца)

| # | Исправление | Часы | Приоритет |
|---|-------------|------|-----------|
| 1 | Nonce-based CSP | 16-24 | 🟡 Важно |
| 2 | CSRF-токены | 6-8 | 🟡 Важно |
| 3 | httpOnly cookie для client access | 12-16 | 🟡 Важно |
| 4 | 2FA для staff | 16-24 | 🟡 Важно |
| 5 | Account lockout | 4-6 | 🟡 Важно |
| 6 | Валидация MIME при загрузке | 2-4 | 🟡 Важно |

**Итого P1:** 56-82 часа

### 10.3. Долгосрочные (P2-P3, 3+ месяца)

| # | Исправление | Часы | Приоритет |
|---|-------------|------|-----------|
| 1 | Шифрование PII at rest | 20-30 | 🟢 Желательно |
| 2 | Audit log | 16-24 | 🟢 Желательно |
| 3 | Хеширование OTP-кодов | 4-6 | 🟢 Желательно |
| 4 | WebAuthn / Passkeys | 40-60 | 🟢 Желательно |

**Итого P2-P3:** 80-120 часов

---

## 11. Заключение

**Общая оценка безопасности: 65/100**

**Критические уязвимости:**
- 🔴 IDOR в mobile API (утечка PII)
- 🔴 WebSocket без auth (утечка заказов)
- 🔴 SSRF в загрузке изображений (чтение локальных файлов)
- 🔴 Хардкод-пароли (полный компромет production)

**Сильные стороны:**
- ✅ JWT реализован корректно (refresh rotation, SHA-256 hash)
- ✅ bcrypt с cost factor 12
- ✅ RBAC с чёткой иерархией
- ✅ Rate limiting на большинстве endpoints
- ✅ Helmet CSP (но с `'unsafe-inline'`)

**Вердикт:** **NO-GO** для production без устранения P0-уязвимостей.

**Рекомендация:**
1. Немедленно исправить P0 (28-42 часа, 1-2 недели)
2. Внедрить P1 (56-82 часа, 1-2 месяца)
3. Планировать P2-P3 (80-120 часов, 3+ месяца)

**После устранения P0:**
- Security score: ~80/100
- Можно запускать soft-launch
- Full launch после P0 + P1

---

*Security review создан на основе исходного кода и документации проекта. Дата: июнь 2026. Код не изменён.*
