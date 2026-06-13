# GrilyageDelivery — детальный план реализации

Проект: сайт + сервис доставки + CRM для гастрохауса «Грильяж» (Омск, Харьковская 7).
Источник требований: `MainServiceIdea.md`. Дизайн: `Site/Design/disign_v2/` (канонический файл — `grilyazh_mockup.html`).

## 0. Подтверждённые решения

| Вопрос | Решение |
|---|---|
| Стек | TypeScript-монорепо: Next.js (сайт+CRM), NestJS (API), PostgreSQL + Prisma, Docker Compose |
| Мобильные | Flutter (Android + iOS, одна кодовая база), отдельная фаза |
| Оплата | Без онлайн-оплаты в v1. Оплата при получении (наличные / карта курьеру). `paymentMethod` enum заложен под будущий шлюз |
| Объём | Сайт + CRM + API + Flutter + iRedMail + деплой VPS. WebRTC-звонки и чат — ВНЕ объёма (но WebSocket-шина заказов = их будущий фундамент) |
| Тесты | Инфраструктура с нуля. TDD для критичной логики (заказы, корзина, auth, email-верификация). Jest/Vitest + supertest + Playwright e2e |
| Кроссплатформенность | Dev: Arch Linux + Windows. Prod: Ubuntu ≥24.04 VPS. Всё через Docker Compose + Node — без платформозависимых шагов |

## 1. Дизайн-система (извлечено из макетов)

### Токены (`:root`, стабильны во всех макетах)
```css
--cream:#f6f1e7; --gold:#d6b06a; --wood:#7b6147; --text:#2f261f;
--border:#eadfcf; --footer:#2f261f; --dark:#20170f;
--vk:#4c75a3; --tg:#229ed9; --max:#8e8e93;
```
- Градиент кнопок: `linear-gradient(135deg,#d6b06a,#f0cf86)`; золотой заголовок `#e9d7a8`
- Шрифт: **Inter** (weights 500–900) — в макетах НЕ подключён (fallback Arial). Задача: подключить self-hosted/next-font Inter
- Радиусы: 999px (pill, доминирует), 28px (hero/header), 16–24px (карточки/модалки)
- Тени: золотые glow `0 0 0 1px rgba(214,176,106,.45)`, карточки `0 18px 38px rgba(51,37,22,.14)`
- Breakpoints макета: 900px (главная), 1100px/760px (вторичные). Добавить tablet ~1024px

### Страницы из макетов
1. **Главная** (`grilyazh_mockup.html`, канон): hero-слайдшоу, sticky header, поиск с историей, категории-чипсы, карусели блюд (drag+inertia), футер (контакты, Яндекс.Карта, VK/TG/MAX), модалка auth (login/signup), корзина-drawer со встроенным checkout
2. **Меню** (`menu.html`): категории → подкатегории → грид блюд, client-side каталог
3. **О нас** (`about.html`): производство, вакансии, доставка/оплата, карта, 4 юр-блока (placeholder — нужны реальные ИНН/ОГРН)
4. **Предзаказ** (`preorder.html`): ЗАГЛУШКА. Будущий объём: расширенная корзина, поиск по каталогу, многошаговая форма крупных/праздничных заказов

### Бизнес-логика из макетов
- Доставка: бесплатно от **1500 ₽**, базовая стоимость **199 ₽**; режимы Самовывоз/Доставка
- Корзина: localStorage `grilyazh-cart` (в проде: гость — localStorage, авторизованный — синхронизация с сервером)
- Категории: Новинки, Кулинария (Горячая/Холодная кухня, Закуски, Полуфабрикаты, Напитки), Пекарня (7 подкатегорий), Кондитерская (Торты/Пирожные/Печенье/Десерты), Бизнес-ланч (по дням недели Пн–Вс)
- Карточка блюда: фото, название, вес, КБЖУ (4 значения), описание, цена, флаг «новинка»
- Телефон-маска `+7 (___) ___-__-__`; часы Пн–Пт 08:00–21:00, Сб–Вс 09:00–21:00
- Контент-долги макетов: Unsplash-плейсхолдеры фото, телефон-плейсхолдер, юр-тексты

## 2. Архитектура

```
GrilyageDelivery/
├── apps/
│   ├── api/        # NestJS: REST API + WebSocket gateway + Prisma
│   ├── web/        # Next.js: публичный сайт (/) + CRM (/admin, скрыт, отдельная auth)
│   ├── launcher/   # Electron: локальный запуск dev-инфраструктуры, API, Web и проверки окружения
│   └── mobile/     # Flutter (фаза 5)
├── packages/
│   └── shared/     # Общие TS-типы, DTO, константы (DELIVERY_*, статусы)
├── infra/
│   ├── docker-compose.yml        # dev: postgres, mailpit
│   ├── docker-compose.prod.yml   # prod: api, web, postgres, nginx
│   └── nginx/                    # reverse proxy + TLS
├── Site/Design/    # макеты (референс, не трогаем)
└── package.json    # npm workspaces
```

**Ключевые архитектурные решения:**
- **Два домена аккаунтов**: `User` (клиенты) и `StaffUser` (CRM) — РАЗНЫЕ таблицы, разные JWT-issuer/secret, разные guard'ы. CRM недоступна с клиентскими токенами by design
- **Auth**: JWT access (15м) + refresh (30д, httpOnly cookie, ротация). Email-верификация токеном (24ч TTL)
- **Изображения**: загрузка multipart → sharp (ресайз 800px + webp + thumb 320px) → volume `/uploads`, отдача через Nginx/static
- **Realtime**: WebSocket gateway (socket.io) — события `order.created`/`order.updated` в операторскую. Эта же шина — фундамент будущего чата
- **Email dev/prod паритет**: dev — Mailpit (SMTP-ловушка с UI), prod — iRedMail SMTP. Один транспорт nodemailer, разные env
- **API versioning**: `/api/v1/...` — мобильные приложения требуют стабильного контракта

## 3. Модель данных (Prisma)

```
User            id, email(uniq), phone, name, passwordHash, emailVerifiedAt?, createdAt
EmailToken      id, userId, token(uniq), type(VERIFY|RESET), expiresAt
RefreshToken    id, userId|staffUserId, tokenHash, expiresAt, revokedAt?
Address         id, userId, label, street, house, apartment?, comment?
StaffUser       id, login(uniq), name, passwordHash, role(ADMIN|OPERATOR), active
Category        id, name, slug(uniq), sortOrder, imageUrl?, active
Subcategory     id, categoryId, name, slug, sortOrder, active
Product         id, subcategoryId, name, slug(uniq), description, price(int, копейки),
                weightGrams, kcal, protein, fat, carbs, imageUrl?, isNew, active, sortOrder
Promotion       id, title, description, imageUrl?, discountPercent?, productIds[], startsAt, endsAt, active
Order           id, number(seq, человекочитаемый), userId?(null=гость), status, deliveryMode(DELIVERY|PICKUP),
                paymentMethod(CASH|CARD_ON_DELIVERY), customerName, customerPhone, customerEmail?,
                address?, desiredTime?, comment?, itemsTotal, deliveryCost, total, createdAt
OrderItem       id, orderId, productId, nameSnapshot, priceSnapshot, qty
OrderStatusLog  id, orderId, status, staffUserId?, createdAt
```
Статусы заказа: `NEW → CONFIRMED → COOKING → DELIVERING|READY_FOR_PICKUP → COMPLETED | CANCELLED`.

## 4. API-поверхность (`/api/v1`)

| Группа | Эндпоинты |
|---|---|
| auth | `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/verify-email?token=`, `POST /auth/resend-verification`, `GET /auth/me` |
| catalog (public) | `GET /categories` (с подкатегориями), `GET /products?category=&subcategory=&search=&isNew=`, `GET /products/:slug` |
| orders | `POST /orders` (гость или user), `GET /orders/my`, `GET /orders/my/:id` |
| profile | `GET/PATCH /profile`, `CRUD /profile/addresses` |
| promotions | `GET /promotions` (активные) |
| staff-auth | `POST /staff/auth/login`, `POST /staff/auth/refresh`, `GET /staff/auth/me` |
| admin (ADMIN) | `CRUD /staff/categories`, `CRUD /staff/subcategories`, `CRUD /staff/products`, `POST /staff/uploads/image`, `CRUD /staff/promotions`, `CRUD /staff/users` (StaffUser) |
| operator (OPERATOR+) | `GET /staff/orders?status=&date=`, `GET /staff/orders/:id`, `PATCH /staff/orders/:id/status` |
| ws | namespace `/staff`: events `order.created`, `order.updated` (auth по staff JWT) |

## 5. Фазы и задачи

### Фаза 0 — Фундамент монорепо
- [x] 0.1 `git init`, `.gitignore`, `.editorconfig`, README
- [x] 0.2 npm workspaces: корневой `package.json`, `apps/*`, `packages/*`
- [x] 0.3 `infra/docker-compose.yml`: postgres:17 + mailpit (volumes, healthcheck)
- [x] 0.4 `packages/shared`: tsconfig base, константы (DELIVERY_FREE_FROM=150000, DELIVERY_COST=19900, статусы, enum'ы)
- [x] 0.5 Тулинг: TypeScript strict, ESLint + Prettier (единый конфиг), `.env.example`

### Фаза 1 — API-ядро (NestJS, TDD для критики)
- [x] 1.1 NestJS scaffold + ConfigModule + Prisma module + healthcheck `GET /health`
- [x] 1.2 Prisma schema (раздел 3) + миграция + сид (категории/подкатегории/24+ блюда из макетов, staff admin)
- [x] 1.3 **TDD** Auth-модуль клиентов: register (bcrypt, email-токен), login, refresh-ротация, verify-email, guards
- [x] 1.4 Catalog-модуль: public GET'ы с фильтрами/поиском (нормализация ё→е как в макете)
- [x] 1.5 **TDD** Orders-модуль: создание заказа (валидация, серверный пересчёт цен по БД — НЕ доверять клиенту, расчёт доставки 1500/199), статусная машина с валидными переходами, OrderStatusLog
- [x] 1.6 Staff-auth модуль (отдельный JWT) + RBAC guard (ADMIN/OPERATOR)
- [x] 1.7 Admin CRUD: категории/блюда/заказы + RBAC guards (ADMIN/OPERATOR) — эндпоинты `/staff/*`
- [x] 1.8 Operator: лента заказов, смена статуса; WebSocket gateway `/staff` + события
- [x] 1.9 Email-сервис: nodemailer → Mailpit(dev)/iRedMail(prod); письма верификации + подтверждения заказа
- [x] 1.10 Swagger `/api/docs` (контракт для Flutter)

### Фаза 2 — Публичный сайт (Next.js)
- [x] 2.1 Next.js scaffold (App Router), дизайн-токены (CSS vars из раздела 1), next/font Inter, базовый layout: header (sticky, бейдж корзины) + footer (контакты, карта, VK/TG/MAX)
- [x] 2.2 Главная: hero-слайдшоу, категории-чипсы, карусели блюд (drag+inertia из макета), карточка блюда (КБЖУ-пилюли)
- [x] 2.3 Страница «Меню»: категории → подкатегории → грид, данные из API
- [x] 2.4 Поиск: дропдаун, live-результаты, история (localStorage), клавиатурная навигация
- [x] 2.5 Корзина: drawer, состояние (localStorage `grilyazh-cart`), прогресс-бар бесплатной доставки, qty +/-
- [x] 2.6 Checkout в drawer: toggle Самовывоз/Доставка, маска телефона, время, адрес, способ оплаты (наличные/карта), `POST /api/v1/orders`, экран успеха с номером заказа
- [x] 2.7 Auth: модалка login/signup → API, страница верификации email, личный кабинет (профиль, адреса, история заказов, повтор заказа)
- [x] 2.8 «О нас» (по макету) + «Предзаказ» v1: полный каталог + расширенная форма (дата/время, комментарий) — реализация заглушки
- [x] 2.9 Адаптив: мобильная версия всех страниц (900px из макета + tablet 1024px)
- [x] 2.10 Playwright e2e: гость собирает корзину → заказ; регистрация → верификация → заказ из ЛК

### Фаза 3 — CRM `/admin`
- [x] 3.1 Layout CRM: отдельный login (staff JWT), тёмная утилитарная тема, middleware-защита роутов, никаких ссылок с публичного сайта
- [x] 3.2 Админ: таблицы категорий/подкатегорий (drag-sort), CRUD блюд с upload фото (preview, прогресс), активация/деактивация
- [x] 3.3 Admin: акции (CRUD, период действия), управление StaffUser
- [x] 3.4 Operator: лента заказов (фильтры статус/дата, звуковое уведомление о новом через WS), карточка заказа (состав, адрес, контакты, телефон-ссылка), смена статуса, печать заказа
- [x] 3.5 Дашборд: заказы за сегодня, выручка, популярные блюда

### Фаза 4 — Почта (dev — Mailpit, прод — iRedMail)
- [x] 4.0 Dev-решение: Mailpit уже работает (SMTP :1025, UI :8025) — перехватывает все письма, просмотр в браузере. Для тестирования через Tailscale достаточно.
- [~] 4.1 iRedMail на VPS (продакшен) — ОТЛОЖЕНО до покупки домена
- [~] 4.2 SMTP relay в проде (iRedMail) — ОТЛОЖЕНО до Phase 6
- [~] 4.3 Anti-spam — ОТЛОЖЕНО до прода

### Фаза 5 — Flutter-приложения (НИЗКИЙ ПРИОРИТЕТ)
- [x] 5.1 Flutter SDK 3.27.4 установлен (C:\tools\flutter) — scaffold и архитектура ОТЛОЖЕНЫ до приоритета Web+CRM
- [~] 5.2 Дизайн-система — ОТЛОЖЕНО (низкий приоритет, Flutter deferred)
- [~] 5.3 Экраны — ОТЛОЖЕНО (низкий приоритет, Flutter deferred)
- [~] 5.4 Push-уведомления (FCM) — ОТЛОЖЕНО (низкий приоритет, Flutter deferred)
- [~] 5.5 Сборки — ОТЛОЖЕНО (iOS требует macOS, Flutter deferred)

### Фаза 6 — Прод-деплой VPS (ОТЛОЖЕНО до покупки VPS + домена)
- [x] 6.1 `docker-compose.prod.yml`: api, web, postgres (volume), nginx; multi-stage Dockerfile'ы
- [x] 6.2 Nginx: reverse proxy, gzip/brotli, static `/uploads`, rate-limit на auth-эндпоинты
- [~] 6.3 Let's Encrypt (certbot), HTTPS-редирект, HSTS — ОТЛОЖЕНО
- [~] 6.4 Бэкапы: pg_dump cron + uploads rsync — ОТЛОЖЕНО
- [~] 6.5 Deploy-runbook — ОТЛОЖЕНО

### Фаза 7 — Desktop Launcher
- [x] 7.1 Electron лаунчер: запуск docker-compose (БД), API (NestJS), web (Next.js); просмотр логов; кнопки старт/стоп
- [x] 7.2 Dev-проверки лаунчера: Node/npm/Docker, `.env`, docker-compose, URL статусы API/Web/Mailpit
- [x] 7.3 Dev-операции лаунчера: `npm install`, Prisma migrate/seed, открыть сайт/CRM/API/Mailpit, корректная остановка процессов
- [x] 7.4 Управление demo-аккаунтами в лаунчере: создание/обновление StaffUser `ADMIN`/`OPERATOR` и клиентских User
- [x] 7.5 Подготовка демонстрации через Tailscale: checks в лаунчере, bind `0.0.0.0`, runbook с demo-сценарием
- [~] 7.6 Удалённое управление VPS через SSH — ОТЛОЖЕНО до прода

## 6. Сквозные требования
- **Безопасность**: bcrypt(12), rate-limit login/register, валидация всех DTO (class-validator), CSRF-устойчивость (Bearer для API), helmet, санитизация upload'ов (тип/размер ≤5MB)
- **Кроссплатформенность**: никаких bash-only скриптов в dev-потоке — npm scripts + Node; пути через `path.join`; LF в `.gitattributes`
- **Цены в копейках (int)** — никаких float
- **Тесты**: unit (расчёты заказа, статусная машина, auth) + e2e API (supertest) + e2e web (Playwright). CI-ready скрипт `npm test` в корне

## 7. Порядок работы
Фазы 0→1→2→3 строго последовательно (каждая зависит от предыдущей). Фаза 4 — параллельно с 3 (нужен только SMTP-интерфейс из 1.9). Фаза 5 — после стабилизации API (фаза 1 + Swagger). Фаза 6 — финал.
