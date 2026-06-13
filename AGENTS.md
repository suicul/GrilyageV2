# GrilyageDelivery — Agents & Skills

## Архитектурные константы (обязательны для всех агентов)

| Константа | Значение |
|---|---|
| Цены | `int` **КОПЕЙКИ** (никаких float). 1500₽ = `150000` |
| Доставка | бесплатно от `150000` коп., базовая `19900` коп. |
| Два домена auth | `User` (клиенты) — таблица `User`, `JWT_ACCESS_SECRET` / `StaffUser` (CRM) — таблица `StaffUser`, `STAFF_JWT_ACCESS_SECRET` |
| Auth guard | `JwtAuthGuard` для user, `StaffJwtGuard` для staff — РАЗНЫЕ, не взаимозаменяемы |
| API prefix | `/api/v1` (global prefix в NestJS) |
| Web proxy | `next.config.mjs` → rewrite `/api/v1/:path*` → `localhost:4000/api/v1/:path*` |
| Язык ошибок API | **Русский** — все сообщения об ошибках в AuthService, StaffAuthService, стратегиях |
| Refresh token | SHA256 хеш в БД, ротация при каждом refresh |
| Email dev | Mailpit (SMTP localhost:1025, UI :8025) |

---

## Агенты

### 1. Auth Architect
**Специализация**: Вся аутентификация — user + staff JWT, guards, регистрация, верификация email.

**Файлы**: `apps/api/src/auth/*`, `apps/api/src/staff-auth/*`

**Правила**:
- User auth: `JWT_ACCESS_SECRET` (env), `JwtAuthGuard`, `JwtStrategy`
- Staff auth: `STAFF_JWT_ACCESS_SECRET` (env), `StaffJwtGuard`, `StaffJwtStrategy` (name: `'staff-jwt'`)
- Регистрация → bcrypt(12) + email-токен (SHA256) → не логинит автоматически (фронт делает login после register)
- RefreshToken — отдельная таблица, `tokenHash` (SHA256), `userId` или `staffUserId`
- Все error message — на русском языке
- Validation: class-validator во всех DTO

### 2. Frontend Engineer
**Специализация**: Next.js App Router, UI/UX, стили, анимации, адаптив.

**Файлы**: `apps/web/app/*`, `apps/web/components/*`, `apps/web/lib/*`

**Правила**:
- Дизайн-токены: `--cream:#f6f1e7; --gold:#d6b06a; --wood:#7b6147; --text:#2f261f`
- Шрифт: Inter (next/font)
- Header: sticky, z-index: 1800, login-pill
- Корзина: localStorage `grilyazh-cart`, drawer z-index: 1500
- Auth: модалка, контекст `AuthContext`/`StaffAuthContext`, `/admin/login` для CRM
- Все запросы к API — через Next.js proxy (`/api/v1/...`), не напрямую к :4000
- Телефон-маска: `+7 (___) ___-__-__`
- Цены форматировать: `(price / 100).toLocaleString('ru-RU') + ' ₽'`

### 3. API Builder
**Специализация**: NestJS модули, Prisma, заказы, каталог, профиль.

**Файлы**: `apps/api/src/*` (кроме auth)

**Правила**:
- Global prefix: `api/v1` (кроме `GET /health`)
- ValidationPipe: `whitelist: true, transform: true, forbidNonWhitelisted: false`
- Заказы: серверный пересчёт цен по БД (НЕ доверять клиенту)
- Статусная машина: `NEW → CONFIRMED → COOKING → DELIVERING|READY_FOR_PICKUP → COMPLETED | CANCELLED`
- WebSocket: namespace `/staff`, события `order.created`/`order.updated`
- CORS: `WEB_PUBLIC_URL` + `100.x.x.x:3000` + `*.ts.net`

### 4. Database Guardian
**Специализация**: Prisma schema, миграции, сиды, целостность данных.

**Файлы**: `apps/api/prisma/*`

**Правила**:
- Все денежные поля — `Int` (копейки)
- `emailVerifiedAt: DateTime?` у User
- `RefreshToken` — `userId String?` + `staffUserId String?` (nullable, одно из двух)
- `Order.number` — `@default(autoincrement())` для человекочитаемых номеров
- Сид: admin (login:admin, пароль:admin123), 5 категорий, 30+ продуктов, 2 акции

### 5. Launcher Dev
**Специализация**: Electron лаунчер, dev-инфраструктура.

**Файлы**: `apps/launcher/*`

**Правила**:
- Скрипты создания аккаунтов: `scripts/create-staff-user.js`, `scripts/create-customer-user.js`
- Используют `dotenv` + `PrismaClient` + `bcrypt` напрямую, без NestJS
- port detection: `netstat -ano` (Win) / `lsof -ti :PORT` (Unix)
- env vars для скриптов: `STAFF_LOGIN`, `STAFF_PASSWORD` / `CUSTOMER_EMAIL`, `CUSTOMER_PASSWORD`
- tailscale IP: `tailscale ip -4` → CORS/0.0.0.0

### 6. QA Oracle
**Специализация**: Верификация архитектуры, security review, интеграционные тесты.

**Правила проверок**:
1. Нет `float/double` для цен — только `int` (копейки)
2. Нет пересечения JWT guard'ов — user token не открывает CRM
3. Все error message на русском
4. Refresh token обязательно SHA256 в БД
5. `next.config.mjs` содержит rewrite `/api/v1/:path*`
6. Нет `|| 'Ошибка входа'` fallback в auth-context (должен показывать конкретную ошибку от API)

---

## Контракты между агентами

### Auth ↔ Frontend
```
POST /api/v1/auth/login → { email, password }
← 200 { accessToken, refreshToken }
← 401 { message: "Неверный email или пароль" }

POST /api/v1/auth/register → { email, password, name, phone? }
← 201 { id, email, name, phone, emailVerifiedAt }
← 409 { message: "Этот email уже зарегистрирован" }

GET /api/v1/auth/me → Authorization: Bearer <token>
← 200 { id, email, name, phone, emailVerifiedAt, createdAt }
```

### StaffAuth ↔ CRM Frontend
```
POST /api/v1/staff/auth/login → { login, password }
← 200 { accessToken, refreshToken }
← 401 { message: "Неверный логин или пароль" }

GET /api/v1/staff/auth/me → Authorization: Bearer <token>
← 200 { id, login, name, role, active }
```

---

## Порядок разработки

1. **Database Guardian** → schema + migration + seed
2. **API Builder** + **Auth Architect** → параллельно, после schema
3. **Frontend Engineer** → после стабилизации API
4. **Launcher Dev** → после готовности API + Web
5. **QA Oracle** → на каждом этапе, обязательная проверка перед merge
