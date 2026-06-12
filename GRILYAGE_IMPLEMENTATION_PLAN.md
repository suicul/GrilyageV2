# План реализации проекта «Грильяж» — Сайт, доставка и CRM

**Версия**: 1.0  
**Дата**: 2026-06-11  
**Основание**: `MainServiceIdea.md`, дизайн-макеты `Site/Design/disign_v2/`

---

## 1. Подтверждённые архитектурные решения

| Вопрос | Решение |
|--------|---------|
| **Стек** | TypeScript-монорепо: Next.js (сайт + CRM), NestJS (API), PostgreSQL + Prisma, Docker Compose |
| **Мобильные приложения** | Flutter (Android + iOS, единая кодовая база) — разрабатывается параллельно с веб-версией |
| **Оплата** | Без онлайн-оплаты в v1. Только наличные / карта курьеру при получении. `paymentMethod` enum заложен под будущий шлюз |
| **Объём v1** | Сайт + CRM + API + Flutter + iRedMail + деплой VPS. WebRTC-звонки и чат — вне объёма (WebSocket-шина заказов = их будущий фундамент) |
| **Тестирование** | TDD для критичной логики (заказы, корзина, auth, email-верификация). Jest/Vitest + supertest + Playwright e2e |
| **Кроссплатформенность** | Dev: Arch Linux + Windows. Prod: Ubuntu ≥24.04 VPS. Всё через Docker Compose + Node — без платформозависимых шагов |

---

## 2. Дизайн-система (из макетов)

### Токены CSS (`:root`)
```css
--cream:#f6f1e7; --gold:#d6b06a; --wood:#7b6147; --text:#2f261f;
--border:#eadfcf; --footer:#2f261f; --dark:#20170f;
--vk:#4c75a3; --tg:#229ed9; --max:#8e8e93;
```

- **Градиент кнопок**: `linear-gradient(135deg,#d6b06a,#f0cf86)`
- **Золотой заголовок**: `#e9d7a8`
- **Шрифт**: Inter (weights 500–900) — подключить через next/font
- **Радиусы**: 999px (pill), 28px (hero/header), 16–24px (карточки/модалки)
- **Тени**: золотые glow `0 0 0 1px rgba(214,176,106,.45)`, карточки `0 18px 38px rgba(51,37,22,.14)`
- **Breakpoints**: 900px (главная), 1100px/760px (вторичные), +1024px tablet

### Страницы из макетов
1. **Главная** (`grilyazh_mockup.html`): hero-слайдшоу, sticky header, поиск с историей, категории-чипсы, карусели блюд (drag+inertia), футер (контакты, Яндекс.Карта, VK/TG/MAX), модалка auth (login/signup), корзина-drawer со встроенным checkout
2. **Меню** (`menu.html`): категории → подкатегории → грид блюд
3. **О нас** (`about.html`): производство, вакансии, доставка/оплата, карта, юр-блоки
4. **Предзаказ** (`preorder.html`): заглушка → расширенная корзина для крупных заказов

### Бизнес-логика
- Доставка: бесплатно от **1500 ₽**, базовая стоимость **199 ₽**
- Режимы: Самовывоз / Доставка
- Корзина: localStorage `grilyazh-cart` (гость) + синхронизация с сервером (авторизованный)
- Категории: Новинки, Кулинария, Пекарня, Кондитерская, Бизнес-ланч
- Карточка блюда: фото, название, вес, КБЖУ, описание, цена, флаг «новинка»
- Телефон-маска: `+7 (___) ___-__-__`
- Часы работы: Пн–Пт 08:00–21:00, Сб–Вс 09:00–21:00

---

## 3. Архитектура проекта

```
GrilyageDelivery/
├── apps/
│   ├── api/          # NestJS: REST API + WebSocket gateway + Prisma
│   ├── web/          # Next.js: публичный сайт (/) + CRM (/admin)
│   └── mobile/       # Flutter (Android + iOS)
├── packages/
│   └── shared/       # Общие TS-типы, DTO, константы
├── infra/
│   ├── docker-compose.yml        # dev: postgres, mailpit
│   ├── docker-compose.prod.yml   # prod: api, web, postgres, nginx
│   └── nginx/                    # reverse proxy + TLS
├── Site/Design/       # макеты (референс)
└── package.json       # npm workspaces
```

### Ключевые архитектурные решения
1. **Два домена аккаунтов**: `User` (клиенты) и `StaffUser` (CRM) — разные таблицы, разные JWT-issuer/secret, разные guard'ы
2. **Auth**: JWT access (15м) + refresh (30д, httpOnly cookie, ротация). Email-верификация токеном (24ч TTL)
3. **Изображения**: multipart → sharp (ресайз 800px + webp + thumb 320px) → volume `/uploads`
4. **Realtime**: WebSocket gateway (socket.io) — события `order.created`/`order.updated` в операторскую
5. **Email**: dev — Mailpit, prod — iRedMail SMTP. Единый транспорт nodemailer
6. **API versioning**: `/api/v1/...` — стабильный контракт для мобильных приложений

---

## 4. Модель данных (Prisma)

### Перечисления (Enums)
```typescript
DeliveryMode     → DELIVERY | PICKUP
PaymentMethod    → CASH | CARD_ON_DELIVERY (ONLINE — зарезервировано)
OrderStatus      → NEW → CONFIRMED → COOKING → DELIVERING|READY_FOR_PICKUP → COMPLETED | CANCELLED
StaffRole        → ADMIN | OPERATOR
EmailTokenType   → VERIFY | RESET
```

### Таблицы

| Модель | Ключевые поля |
|--------|---------------|
| **User** | id, email(uniq), phone?, name, passwordHash, emailVerifiedAt?, createdAt |
| **EmailToken** | id, userId, token(uniq), type, expiresAt |
| **RefreshToken** | id, userId?, staffUserId?, tokenHash, expiresAt, revokedAt? |
| **Address** | id, userId, label?, street, house, apartment?, comment? |
| **StaffUser** | id, login(uniq), name, passwordHash, role, active |
| **Category** | id, name, slug(uniq), sortOrder, imageUrl?, active |
| **Subcategory** | id, categoryId, name, slug, sortOrder, active |
| **Product** | id, subcategoryId, name, slug(uniq), description, price(int, копейки), weightGrams, kcal, protein, fat, carbs, imageUrl?, isNew, active, sortOrder |
| **Promotion** | id, title, description, imageUrl?, discountPercent?, productIds[], startsAt, endsAt, active |
| **Order** | id, number(seq), userId?, status, deliveryMode, paymentMethod, customerName, customerPhone, customerEmail?, address?, desiredTime?, comment?, itemsTotal, deliveryCost, total, createdAt |
| **OrderItem** | id, orderId, productId, nameSnapshot, priceSnapshot, qty |
| **OrderStatusLog** | id, orderId, status, staffUserId?, createdAt |

**Статусная машина заказа:**
```
NEW ──→ CONFIRMED ──→ COOKING ──→ DELIVERING ──→ COMPLETED
  │          │            │             │
  └──→ CANCELLED ←────────┴─────────────┘
                └──→ READY_FOR_PICKUP ──→ COMPLETED
```

---

## 5. API-поверхность (`/api/v1`)

### Публичные эндпоинты (без авторизации)
| Метод | Путь | Описание |
|-------|------|----------|
| `POST` | `/auth/register` | Регистрация клиента (отправка email-токена) |
| `POST` | `/auth/login` | Вход, выдача access + refresh токенов |
| `POST` | `/auth/refresh` | Обновление пары токенов |
| `POST` | `/auth/logout` | Отзыв refresh-токена |
| `GET` | `/auth/verify-email?token=` | Подтверждение email |
| `POST` | `/auth/resend-verification` | Повторная отправка токена |
| `GET` | `/categories` | Дерево категорий с подкатегориями |
| `GET` | `/products?category=&subcategory=&search=&isNew=` | Список блюд с фильтрацией |
| `GET` | `/products/:slug` | Карточка блюда |
| `POST` | `/orders` | Создание заказа (гость или авторизованный) |
| `GET` | `/promotions` | Активные акции |

### Эндпоинты авторизованного пользователя
| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `/auth/me` | Профиль текущего пользователя |
| `GET/PATCH` | `/profile` | Чтение/обновление профиля |
| `GET/POST` | `/profile/addresses` | Список/добавление адресов |
| `DELETE` | `/profile/addresses/:id` | Удаление адреса |
| `GET` | `/orders/my` | История заказов |
| `GET` | `/orders/my/:id` | Детали заказа |

### CRM-эндпоинты (Staff)

**Авторизация персонала:**
| Метод | Путь | Роль |
|-------|------|------|
| `POST` | `/staff/auth/login` | Public |
| `POST` | `/staff/auth/refresh` | Public |
| `GET` | `/staff/auth/me` | Staff |

**Администрирование (ADMIN):**
| Метод | Путь | Описание |
|-------|------|----------|
| `CRUD` | `/staff/categories` | Управление категориями |
| `CRUD` | `/staff/subcategories` | Управление подкатегориями |
| `CRUD` | `/staff/products` | Управление блюдами |
| `POST` | `/staff/uploads/image` | Загрузка изображений (multipart + sharp) |
| `CRUD` | `/staff/promotions` | Управление акциями |
| `CRUD` | `/staff/users` | Управление персоналом CRM |

**Операторская лента (OPERATOR+):**
| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `/staff/orders?status=&date=` | Фильтрованный список заказов |
| `GET` | `/staff/orders/:id` | Карточка заказа |
| `PATCH` | `/staff/orders/:id/status` | Изменение статуса |

**WebSocket (Staff):**
- Namespace: `/staff`
- События: `order.created`, `order.updated`
- Авторизация: staff JWT

---

## 6. Фазы реализации

### Фаза 0 — Фундамент монорепо ✅ (ВЫПОЛНЕНО)
- [x] Git-инициализация, `.gitignore`, `.editorconfig`, README
- [x] npm workspaces: корневой `package.json`, `apps/*`, `packages/*`
- [x] `infra/docker-compose.yml`: postgres:17 + mailpit
- [x] `packages/shared`: константы (доставка, статусы, enum'ы), утилиты форматирования
- [x] TypeScript strict, ESLint + Prettier, `.env.example`

### Фаза 1 — API-ядро (NestJS, TDD)
**Критерий**: зелёные e2e-тесты auth/catalog/orders

- [ ] **1.1** NestJS scaffold + ConfigModule + Prisma module + healthcheck `GET /health` *(базовый скелет готов — требуется верификация)*
- [ ] **1.2** Prisma schema + миграция + сид (категории/подкатегории/24+ блюда из макетов, staff admin)
- [ ] **1.3** **TDD** Auth-модуль клиентов: register (bcrypt, email-токен), login, refresh-ротация, verify-email, guards
- [ ] **1.4** Catalog-модуль: public GET'ы с фильтрами/поиском (нормализация ё→е)
- [ ] **1.5** **TDD** Orders-модуль: создание заказа (серверный пересчёт цен, расчёт доставки), статусная машина, OrderStatusLog
- [ ] **1.6** Staff-auth модуль (отдельный JWT) + RBAC guard (ADMIN/OPERATOR)
- [ ] **1.7** Admin CRUD: категории/подкатегории/блюда/акции + загрузка изображений (multer+sharp+webp)
- [ ] **1.8** Operator: лента заказов, смена статуса; WebSocket gateway `/staff` + события
- [ ] **1.9** Email-сервис: nodemailer → Mailpit(dev)/iRedMail(prod); письма верификации + подтверждения заказа
- [ ] **1.10** Swagger `/api/docs` (контракт для Flutter)

### Фаза 2 — Публичный сайт (Next.js)
**Критерий**: визуальное соответствие макетам, Playwright e2e сценария заказа

- [ ] **2.1** Scaffold (App Router), дизайн-токены, next/font Inter, layout: header (sticky, бейдж корзины) + footer
- [ ] **2.2** Главная: hero-слайдшоу, категории-чипсы, карусели блюд (drag+inertia), карточка блюда (КБЖУ-пилюли)
- [ ] **2.3** Страница «Меню»: категории → подкатегории → грид, данные из API
- [ ] **2.4** Поиск: дропдаун, live-результаты, история (localStorage), клавиатурная навигация
- [ ] **2.5** Корзина: drawer, состояние (Zustand + localStorage `grilyazh-cart`), прогресс-бар доставки
- [ ] **2.6** Checkout: toggle Самовывоз/Доставка, маска телефона, время, адрес, способ оплаты, `POST /orders`, экран успеха
- [ ] **2.7** Auth: модалка login/signup, страница верификации email, личный кабинет (профиль, адреса, история заказов, повтор заказа)
- [ ] **2.8** «О нас» + «Предзаказ» v1: полный каталог + расширенная форма (дата/время, комментарий)
- [ ] **2.9** Адаптив: мобильная версия (900px + 1024px tablet), Lighthouse mobile ≥ 90
- [ ] **2.10** Playwright e2e: гость → корзина → заказ; регистрация → верификация → заказ из ЛК

### Фаза 3 — CRM `/admin`
**Критерий**: оператор видит новый заказ realtime; админ создаёт блюдо с фото

- [ ] **3.1** Layout CRM: отдельный login (staff JWT), тёмная тема, middleware-защита роутов
- [ ] **3.2** Админ: таблицы категорий/подкатегорий (drag-sort), CRUD блюд с upload фото (preview, прогресс)
- [ ] **3.3** Админ: акции (CRUD, период действия), управление StaffUser
- [ ] **3.4** Оператор: лента заказов (фильтры статус/дата, звуковое уведомление через WS), карточка заказа, смена статуса, печать
- [ ] **3.5** Дашборд: заказы за сегодня, выручка, популярные блюда

### Фаза 4 — Почта iRedMail
**Критерий**: письмо верификации доходит на реальный ящик; корп. ящики работают

- [ ] **4.1** Документация-runbook: установка iRedMail на VPS/поддомен `mail.<домен>`, DNS (MX, SPF, DKIM, DMARC, PTR)
- [ ] **4.2** Корп. ящики (info@, orders@, noreply@) + отправка из API через SMTP relay (auth, TLS)
- [ ] **4.3** Anti-spam проверка (mail-tester ≥ 8/10), лимиты, бэкап maildir

### Фаза 5 — Flutter-приложения
**Критерий**: заказ оформляется с Android-эмулятора через прод-API

- [ ] **5.1** Установка Flutter SDK, scaffold, архитектура (Riverpod + dio + go_router), генерация API-клиента из OpenAPI
- [ ] **5.2** Дизайн-система: токены (cream/gold/wood), Inter, компоненты (DishCard с КБЖУ)
- [ ] **5.3** Экраны: главная/меню/поиск, карточка блюда, корзина+checkout, auth+профиль, история заказов
- [ ] **5.4** Push-уведомления (FCM) — если останется в объёме
- [ ] **5.5** Сборки: Android APK/AAB, iOS (требует macOS — внешняя зависимость)

### Фаза 6 — Прод-деплой VPS
**Критерий**: сайт по HTTPS, заказ проходит end-to-end на проде

- [ ] **6.1** `docker-compose.prod.yml`: api, web, postgres (volume), nginx; multi-stage Dockerfile'ы
- [ ] **6.2** Nginx: reverse proxy, gzip/brotli, static `/uploads`, rate-limit на auth
- [ ] **6.3** Let's Encrypt (certbot), HTTPS-редирект, HSTS
- [ ] **6.4** Бэкапы: pg_dump cron + uploads rsync; логи (rotation); systemd unit
- [ ] **6.5** Deploy-runbook: Ubuntu 24.04 с нуля → работающий прод (+ `git pull && docker compose build && up -d`)

---

## 7. Сквозные требования

### Безопасность
- bcrypt (12 раундов) для хэширования паролей
- rate-limit на login/register эндпоинты
- Валидация всех DTO через class-validator
- CSRF-устойчивость (Bearer для API)
- helmet для HTTP-заголовков безопасности
- Санитизация upload'ов (тип/размер ≤ 5MB)

### Тестирование
- **Unit**: расчёты заказа, статусная машина, auth, форматирование
- **E2E API**: supertest (все эндпоинты)
- **E2E Web**: Playwright (сценарии гостя и авторизованного пользователя)
- CI-ready скрипт `npm test` в корне

### Кроссплатформенность
- Никаких bash-only скриптов в dev-потоке — только npm scripts + Node
- Пути через `path.join`
- LF в `.gitattributes`

### Данные
- **Все цены в копейках (int)** — никаких float
- Статусная машина заказа с валидными переходами

---

## 8. Порядок работ и зависимости

```
Фаза 0 (Фундамент) ✅
    │
    ▼
Фаза 1 (API-ядро) — строго последовательно
    │
    ├──▶ Фаза 2 (Публичный сайт) — после стабилизации API
    │
    ├──▶ Фаза 3 (CRM) — после стабилизации API
    │        │
    │        └──▶ Фаза 4 (iRedMail) — параллельно с Фазой 3
    │
    ├──▶ Фаза 5 (Flutter) — после Swagger (1.10)
    │
    └──▶ Фаза 6 (Прод-деплой) — финал
```

**Ключевые зависимости:**
- Фазы 0→1→2→3: строго последовательно
- Фаза 4: параллельно с Фазой 3 (требуется SMTP-интерфейс из 1.9)
- Фаза 5: после стабилизации API (Фаза 1 + Swagger)
- Фаза 6: финальная, после всех фаз

---

*План составлен на основе `MainServiceIdea.md` и утверждённых архитектурных решений.*
*Дата начала работ: 2026-06-11*
