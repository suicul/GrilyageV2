# Текущее состояние проекта «Грильяж»

> Аудит зрелости каждого компонента платформы на основе анализа репозитория.
> Дата: июнь 2026.

---

## Сводная таблица

| Раздел | Готовность | Критические блоки |
|--------|-----------|-------------------|
| Сайт | **75%** | `/menu` на локальных данных, нет онлайн-оплаты |
| CRM | **80%** | Нет e2e-тестов, `proxy.ts` не защищает маршруты |
| API | **85%** | Нет cron-задач, гекодинг не реализован |
| Авторизация | **75%** | OAuth client_id = PLACEHOLDER, SMS через email |
| Мобильные приложения | **70%** | iOS permissions отсутствуют, нет онлайн-оплаты |
| Курьерское приложение | **50%** | Только Android, навигация-stub, нет push |
| Операторское ПО | **40%** | Звонок = `alert()`, single-file HTML |
| Безопасность | **65%** | CSP `unsafe-inline`, хардкод-пароли в скриптах |
| Инфраструктура | **75%** | Dev ≠ Prod, 76 скриптов в корне |
| Почта | **70%** | SMS не интегрированы, нет очереди |
| Мониторинг | **60%** | Нет алертов, нет дашбордов |

---

## 1. Сайт

### Готовность: 75%

### Реализовано

- **Главная страница** (`/`): hero-слайдер (4 слайда, авто-ротация 4.8с), карусель категорий, ряды товаров по категориям, блок «Как заказать», информационная сетка, секция Yandex Maps, футер с контактами и соцсетями
- **Каталог на главной**: загрузка из `/api/v1/categories` с fallback на `lib/catalog.ts`
- **Поиск**: `SearchPanel` с клавиатурной навигацией (↑/↓/Enter/Esc), подсветка совпадений, lazy-load из API
- **Корзина**: slide-out drawer, управление количеством, итого, персистентность в `localStorage`
- **Оформление заказа**: переключатель PICKUP/DELIVERY, форма (имя, телефон, email, адрес, комментарий), прогресс-бар бесплатной доставки (от 1500₽), расчёт стоимости через `getDeliveryCost()`
- **Авторизация**: модальное окно с 3 режимами (phone OTP, email OTP, email+password) + VK ID + Yandex ID
- **Личный кабинет** (`/cabinet`): 3 вкладки (профиль, адреса, история заказов), кнопка «Повторить заказ»
- **Верификация email** (`/verify-email`): обработка токена из URL
- **OAuth callback'и**: VK (`/auth/vk/callback`), Yandex (`/auth/yandex/callback`)
- **Чат-виджет**: Socket.IO, lazy-создание комнаты, история сообщений
- **Cookie consent**: баннер с сохранением в `localStorage`
- **Yandex.Metrica**: счётчик с авто-`hit` при смене маршрута
- **Карта**: Yandex Maps 2.1 с кастомной меткой (logo.png) и балуном с часами работы
- **Юридические страницы**: `/privacy` (152-ФЗ, 8 секций), `/terms` (8 секций)
- **Адаптив**: bottom-nav (< 1100px), compact mode (< 480px)
- **Error boundaries**: `error.tsx`, `global-error.tsx`, `loading.tsx`

### Отсутствует

- **Страница `/menu`** использует хардкод-данные из `lib/catalog.ts` — не обращается к API
- **Предзаказ** (`/preorder`) — placeholder: «Форма предзаказа для больших заказов и праздников подключается следующим этапом»
- **Юридический блок** на `/about` — placeholder: «Нужно заполнить фактическими реквизитами»
- **Соцсети** (`/social/vk`, `/social/tg`, `/social/max`) — заглушки «СКОРО ЗДЕСЬ БУДЕТ ССЫЛКА»
- **Онлайн-оплата** — нет платёжного шлюза (YooKassa, Stripe, CloudPayments)
- **i18n** — только русский, все строки хардкод
- **E2E-тесты для CRM** — Playwright покрывает только 3 сценария публичного сайта
- **`loading.tsx` для admin-страниц** — только корневой
- **`remotePatterns`** в `next.config.mjs` — `images: {}` пустой

### Технический долг

- Дублирование мапы статусов заказов в `cabinet/page.tsx` и `admin/orders/page.tsx` — должно быть в shared
- `proxy.ts` проверяет наличие cookie `staff_token`, но не редиректит — защита только на клиенте в `admin/layout.tsx`
- `/social/tg` маршрут существует, но компонент обрабатывает только `vk` и `max` — `/social/tg` показывает «Страница не найдена»
- Все 38 `.tsx` файлов начинаются с `'use client'` — RSC не используются (кроме `layout.tsx`)
- Inline `style={{}}` в admin-страницах вместо CSS-классов

### Риски

- **SEO**: все страницы клиентские (`'use client'`), нет SSR/SSG для публичных страниц
- **Производительность**: один `globals.css` на 49 КБ, нет code-splitting стилей
- **Доступность**: нет ARIA-атрибутов, нет skip-navigation, нет focus-management в модалках
- **Бренд-консистентность**: Unsplash-изображения в hero-слайдере вместо реальных фото

---

## 2. CRM

### Готовность: 80%

### Реализовано

- **Дашборд** (`/admin`): заказы за день, выручка (сумма total), разбивка по статусам, топ-5 популярных блюд
- **Управление заказами** (`/admin/orders`): список с фильтром по статусу, таблица (номер, клиент, телефон, итого, статус, время), модальное окно с деталями (товары, доставка, оплата, адрес, комментарий), кнопки переходов статусов (TRANSITIONS map)
- **Чат оператора** (`/admin/chat`): двухпанельный интерфейс (список комнат + переписка), Socket.IO + 5s polling fallback, назначение/закрытие комнат, статусы OPEN/ASSIGNED/CLOSED
- **Управление каталогом** (`/admin/catalog`): 2 вкладки (Товары + Категории), CRUD товаров (с загрузкой фото через `/staff/uploads/file`), CRUD категорий с inline-управлением подкатегориями, каскад категория → подкатегория
- **Управление акциями** (`/admin/promotions`): CRUD (title, description, discountPercent, startsAt/endsAt, active toggle)
- **Управление персоналом** (`/admin/staff`): CRUD (name, login, password, role, active), для COURIER: transportType (WALKING/CAR) + deliveryRadius
- **Авторизация**: httpOnly cookie `staff_token` + refresh в localStorage, auto-refresh на 401
- **Ролевая навигация**: сайдбар показывает Каталог/Акции/Персонал только для ADMIN
- **Тёмная тема**: `.admin-theme` с собственными CSS-переменными

### Отсутствует

- **E2E-тесты** для CRM-страниц
- **Загрузка файлов** с прогресс-баром (нет индикатора загрузки)
- **Пагинация** в списках заказов и товаров
- **Экспорт данных** (заказы в CSV/Excel)
- **Массовые операции** (массовое изменение статусов, удаление товаров)
- **Уведомления** о новых заказах в CRM (только WebSocket, нет звуковых/визуальных алертов)
- **Фильтрация заказов** по дате (есть query-параметр, но UI не реализован)
- **Поиск** по заказам (по номеру, телефону, имени)

### Технический долг

- `proxy.ts` не редиректит неаутентифицированных пользователей — только клиентский guard в `admin/layout.tsx`
- Нет `loading.tsx` для admin-страниц — нет skeleton-загрузок
- Статусы заказов хардкод в `admin/orders/page.tsx` — дублирование с shared
- Inline `style={{}}` преобладает над CSS-классами в admin-страницах
- Нет валидации форм на клиенте (только серверная через ValidationPipe)

### Риски

- **Безопасность**: клиентский auth-guard легко обходится — серверные маршруты защищены, но HTML-страницы загружаются
- **Масштабируемость**: нет пагинации — при >1000 заказов список будет тормозить
- **UX**: нет подтверждения удаления (категории, товары, акции)
- **Данные**: нет soft-delete — удаление категорий каскадно удаляет подкатегории и товары

---

## 3. API

### Готовность: 85%

### Реализовано

- **15 NestJS-модулей**: Prisma, Health, Auth, StaffAuth, Catalog, Orders, Admin, Email, Profile, SocialAuth, Mobile, Call, Chat, Push, Logger
- **~80 REST-endpoints** с полной маршрутизацией
- **5 WebSocket gateway'ев**: `/staff`, `/orders`, `/mobile`, `/chat`, `/calls`
- **Prisma ORM**: 19 моделей, 8 enum'ов, 4 миграции, seed-данные
- **Dual JWT**: клиентский + staff, refresh-ротация, bcrypt (12 rounds)
- **Rate-limiting**: ThrottlerModule (3 tier: 3/20/100 за 1s/10s/60s)
- **Валидация**: глобальный ValidationPipe (whitelist, transform, forbidNonWhitelisted)
- **CORS**: credentials, whitelist origins + Tailscale
- **Helmet CSP**: whitelist Yandex, Sentry, Google Fonts, unpkg
- **CSRF-проверка**: Content-Type для state-changing запросов
- **Загрузка файлов**: URL-based + multipart (Sharp → WebP, resize 800×800 + thumbnail 320×320)
- **Swagger**: `/api/docs` с двумя bearer-схемами
- **Health-check**: `GET /health` (DB ping)
- **Graceful shutdown**: WS + DB pool
- **StructuredLogger**: JSON в production
- **Dockerfile**: multi-stage Node 22-alpine, healthcheck

### Отсутствует

- **Cron-задачи**: нет автоочистки OTP, refresh-токенов, деактивации акций по `endsAt`
- **Гекодинг адресов**: `findNearestCourier` хардкодит координаты кафе (54.9893, 73.3682)
- **Онлайн-оплата**: нет интеграции с платёжными шлюзами
- **SMS-отправка**: `SMS_RU_API_KEY` scaffolded, но Phone OTP отправляется на email
- **Социальные сети**: MAX и WHATSAPP в enum, но нет auth-flow
- **`@sentry/nestjs`**: в package.json, но подключён только `@sentry/node`
- **Terminus**: health-check ручной, не `@nestjs/terminus`
- **Rate-limit per-user**: Throttler глобальный, не привязан к userId
- **Request ID**: нет correlation ID для трейсинга запросов
- **API versioning**: только v1, нет стратегии миграции

### Технический долг

- `admin.service.ts:332` — TODO: гекодинг адреса заказа для `findNearestCourier`
- `main.ts:78` — TODO P2: nonce-based CSP вместо `'unsafe-inline'`
- `mobile/dto/create-order.dto.ts:8` — TODO: `@IsInt() @Min(1)` для `qty`
- `OrdersService.statusLabel` ссылается на 8 статусов, но в enum 7 — dead labels (`PREPARING`, `READY`, `DELIVERED`)
- `mobile.service.ts:466` — баг: `order.customerName !== userId` (всегда true), должно быть `order.userId !== userId`
- `EmailModule` объявлен `@Global()`, но импортируется явно в AuthModule и MobileModule
- `RefreshToken` полиморфная модель: `userId?` + `staffUserId?` — нет CHECK-constraint в БД

### Риски

- **Утечка данных**: нет автоматического удаления истёкших OTP и refresh-токенов
- **Гонка статусов**: нет оптимистичной блокировки при смене статуса заказа (два оператора могут одновременно)
- **N+1 запросы**: Prisma-запросы не оптимизированы (нет `include`/`select` в списках)
- **WebSocket auth**: 3 из 5 gateway'ев открыты (CORS `*`) — аутентификация только на уровне событий
- **Файловые загрузки**: нет проверки MIME-type на сервере (только расширение)

---

## 4. Авторизация

### Готовность: 75%

### Реализовано

- **Dual JWT-система**: два независимых домена (client + staff) с отдельными секретами
- **Access-токены**: TTL 15m (настраиваемый)
- **Refresh-токены**: 64 random bytes → SHA-256, ротация при refresh, отзыв при logout
- **Пароли**: bcrypt, 12 rounds
- **Email-верификация**: activation token (32 bytes hex, SHA-256, 24h TTL)
- **httpOnly cookie** для staff (`staffAccessToken`, secure в production, sameSite lax)
- **Dual extractor**: cookie + Bearer header для staff
- **StaffRolesGuard**: `@Roles()` декоратор, SUPER_ADMIN наследует ADMIN
- **OAuth VK**: VK ID SDK → access_token → `users.get` API
- **OAuth Yandex**: access_token + authorization_code exchange
- **Telegram Login Widget**: HMAC-SHA256 verification, reject if auth_date > 24h
- **Email OTP**: 6-digit code, отправка через Nodemailer
- **Phone OTP**: 6-digit code, отправка **на email** (не SMS)
- **152-ФЗ**: UserConsent с IP + UserAgent
- **Frontend auth-flow**: login, register, phoneLogin, socialLogin, auto-refresh на 401

### Отсутствует

- **Реальные SMS**: `SMS_RU_API_KEY` scaffolded, но не используется
- **SUPER_ADMIN создание**: нет API-endpoint для создания SUPER_ADMIN через admin
- **2FA**: нет двухфакторной аутентификации
- **Account lockout**: нет блокировки после N неудачных попыток
- **Password reset**: `EmailTokenType.RESET` в enum, но endpoint не реализован
- **Session management**: нет списка активных сессий, нет принудительного отзыва
- **Rate-limit per-IP на auth**: Throttler глобальный (3/min на register, 5/min на login)
- **Token revocation list**: отозванные refresh-токены хранятся в БД, но нет очистки истёкших

### Технический долг

- VK/Yandex OAuth в мобильном приложении: `client_id=PLACEHOLDER`
- Telegram login в мобильном приложении: snackbar «Telegram скоро будет доступен»
- Phone OTP отправляется на email, а не на телефон — вводит пользователя в заблуждение
- `proxy.ts` проверяет cookie, но не редиректит — защита только на клиенте
- Статусы `MAX` и `WHATSAPP` в `SocialAccount.provider` enum, но нет реализации

### Риски

- **Брутфорс OTP**: 6-digit код, 10 попыток (attempts field), но нет экспоненциальной задержки
- **Token leakage**: access-токены в localStorage (XSS-уязвимость)
- **Cookie theft**: staff cookie httpOnly, но нет `__Host-` prefix
- **OAuth state**: Yandex OAuth использует `state` в localStorage, но нет проверки на сервере
- **Activation token**: 24h TTL — длинное окно для перехвата

---

## 5. Мобильные приложения

### Готовность: 70%

### Реализовано

- **21 маршрут** через GoRouter с 4-tab ShellRoute (Home, Menu, Promotions, Profile)
- **4 метода авторизации**: VK (WebView OAuth), Yandex (WebView OAuth), Email OTP, Phone OTP
- **Каталог**: категории (2-col grid с shimmer), товары (КБЖУ, вес, цена), поиск
- **Корзина**: Hive-персистентность, управление количеством, итого
- **Оформление заказа**: форма, pickup/delivery, 3 варианта оплаты (cash/card/online)
- **История заказов**: список со статусами, кнопка «Отследить»
- **Трекинг курьера**: YandexMap с меткой кафе + live-позиция курьера (Socket.IO `/orders`)
- **Чат**: Socket.IO `/chat`, пузыри (gold = пользователь, grey = оператор), typing indicators
- **Звонок**: LiveKit (voice only, 800kbps), очередь, активный звонок, завершение
- **Профиль**: меню (заказы, корзина, адреса, чат, карта, о нас, выход)
- **Push-уведомления**: FCM + RuStore Push, канал `orders`, background handler, tap → `/orders`
- **Offline-режим**: Hive-кэш меню, Dio interceptor (GET-cache-on-offline), OfflineIndicator
- **Акции**: список с discount-бейджами
- **Карта**: YandexMap с меткой кафе
- **Тема**: gold #D6B06A, Material 3, custom Card/Button/Input/Snackbar/FAB
- **Аналитика**: Firebase Analytics (screen view events)
- **Connectivity**: broadcast stream online/offline

### Отсутствует

- **Онлайн-оплата**: «Онлайн» — просто строка, нет платёжного SDK
- **Реальные OAuth-ключи**: VK/Yandex `client_id=PLACEHOLDER`
- **Telegram login**: snackbar-stub
- **Геолокация пользователя**: FAB «Моё местоположение» — пустой `onPressed`
- **Тесты**: `widget_test.dart` = `expect(true, isTrue)`
- **iOS permission descriptions**: `Info.plist` без `NSLocationWhenInUseUsageDescription`, `NSCameraUsageDescription`, `NSMicrophoneUsageDescription`
- **Firebase options**: нет `firebase_options.dart` (используется default config)
- **`.env` файл**: base URL и API-ключи хардкод
- **Codegen**: `freezed`/`json_serializable` объявлены, но все модели hand-written

### Технический долг

- `login_screen.dart:303-304` — VK/Yandex OAuth с `client_id=PLACEHOLDER`
- `login_screen.dart:68` — Telegram button copies «Грильяж» to clipboard + snackbar
- `map_screen.dart:48` — «Моё местоположение» FAB с пустым `onPressed`
- `call_screen.dart:115` — Speaker toggle обновляет state, но не переключает audio route
- `about_screen.dart` — хардкод-адрес «г. Москва, ул. Кондитерская, д. 15» (реальный адрес — Омск)
- Все модели hand-written с manual `fromJson` — codegen-зависимости объявлены, но не используются

### Риски

- **iOS reject**: отсутствие permission usage descriptions → краш при запросе location/camera/mic
- **OAuth failure**: PLACEHOLDER client_id → авторизация VK/Yandex не работает
- **Платёжный UX**: «Онлайн» оплата создаёт впечатление работающей функции, но не обрабатывается
- **Firebase crash**: отсутствие `firebase_options.dart` может привести к crash при инициализации
- **Данные**: нет миграции Hive-кэша при изменении модели

---

## 6. Курьерское приложение

### Готовность: 50%

### Реализовано

- **Авторизация**: login + password → `/staff/auth/login`, auto-login через SharedPreferences
- **Список заказов**: Socket.IO `/staff` (order.created, order.updated), logout в app bar
- **Детали заказа**: статус-хедер, клиент (имя, телефон), адрес (улица, дом, квартира, подъезд, этаж, домофон), товары, итого
- **Действия по статусу**: «Забрать заказ» (READY_FOR_PICKUP) → старт GPS, «Маршрут» → карта, «Доставлен» → стоп GPS
- **Карта**: YandexMap с метками кафе (gold) + курьер (blue)
- **GPS-трекинг**: `CourierLocationService` (location package), отправка каждые 10с → `PATCH /staff/location`
- **Тема**: M3 dark-gold

### Отсутствует

- **iOS**: нет `ios/` директории — только Android
- **Push-уведомления**: курьер не получает push о новых заказах
- **Навигация**: кнопка «Проложить» — snackbar «Функция откроется во внешнем навигаторе» (нет `url_launcher`)
- **Тесты**: нет `test/` директории
- **Refresh-токен**: Dio-клиент без 401-refresh логики
- **Offline-режим**: нет кэширования, нет offline-индикатора
- **Аналитика**: нет Firebase Analytics
- **Профиль курьера**: нет экрана с информацией о курьере
- **История доставок**: нет завершённых заказов
- **Заработок**: нет информации о заработке/статистике

### Технический долг

- Base URL `http://10.0.2.2:4000/api` хардкод (Android emulator → localhost) — нет `.env`
- Статусы заказов отличаются от mobile: `NEW/CONFIRMED/COOKING/READY_FOR_PICKUP/DELIVERING/COMPLETED/CANCELLED` vs `pending/confirmed/preparing/delivering/completed/cancelled`
- `go_router` объявлен в pubspec, но используется `Navigator.pushNamed`
- `freezed`/`json_serializable`/`riverpod_generator` объявлены, но не используются (нет `.g.dart` файлов)
- Riverpod 3 (`Notifier` API) vs mobile Riverpod 2 (`StateNotifier`) — разные API
- `android:label="courier"` — не кастомизировано

### Риски

- **Production readiness**: хардкод dev URL — приложение не работает без пересборки
- **Навигация**: курьер не может проложить маршрут из приложения — должен переключаться на внешний навигатор
- **Связь**: нет push — курьер должен держать приложение открытым для получения заказов
- **iOS**: полное отсутствие iOS-сборки — половина рынка недоступна
- **Данные**: нет кэша — при потере связи курьер теряет доступ к заказам

---

## 7. Операторское ПО

### Готовность: 40%

### Реализовано

- **Electron 34**: main process, BrowserWindow 1280×860, системный Tray
- **Окно звонка**: отдельное frameless окно 400×500 для LiveKit overlay
- **Нативные уведомления**: через Electron `Notification` API
- **IPC bridge**: `contextBridge` с `window.operator.*` (showNotification, openCallWindow, closeCallWindow, getApiUrl, getWsUrl, onCallParams)
- **Список заказов**: single-file HTML/JS с WebSocket-подпиской (`/ws?token=…`)
- **Статусы заказов**: pipeline new → accepted → preparing → ready → picked_up → delivered → cancelled
- **Тема**: gold-on-dark, консистентная с мобильными приложениями
- **Env-overridable**: `API_URL` и `WS_URL` через переменные окружения

### Отсутствует

- **Звонок клиенту**: `alert("Звонок клиенту: …\n(Интеграция с LiveKit/SIP)")` — полная заглушка
- **Чат**: нет интерфейса чата с клиентами
- **Управление заказами**: только просмотр статусов, нет кнопок перехода
- **Авторизация**: `prompt()` для ввода email/password — нет формы логина
- **Настройки**: нет экрана настроек
- **Обновления**: нет auto-update механизма
- **Уведомления о новых заказах**: нет звуковых алертов
- **История заказов**: нет фильтрации, поиска, пагинации
- **Статистика**: нет дашборда

### Технический долг

- Single-file HTML (`renderer/index.html`) — вся логика в одном файле
- Нет разделения на компоненты/модули
- Нет TypeScript — чистый JavaScript
- Нет тестов
- Нет сборки (webpack/vite) — raw HTML
- `livekit-client` в dependencies, но не используется

### Риски

- **Непригодность для production**: оператор не может управлять заказами — только просматривать
- **Звонки**: полная заглушка — оператор не может звонить клиентам
- **Безопасность**: `prompt()` для авторизации — нет защиты от XSS
- **Поддержка**: single-file архитектура затрудняет развитие
- **Дублирование**: функционал дублируется в web CRM (`/admin`) — операторское ПО не добавляет ценности

---

## 8. Безопасность

### Готовность: 65%

### Реализовано

- **JWT**: dual-система (client + staff), отдельные секреты, TTL 15m access / 30d refresh
- **Refresh-ротация**: старый токен отзывается при refresh
- **bcrypt**: 12 rounds для паролей
- **httpOnly cookie**: staff access-токен в httpOnly cookie (secure в production, sameSite lax)
- **Helmet CSP**: whitelist Yandex, Sentry, Google Fonts, unpkg
- **CORS**: credentials, whitelist origins + Tailscale
- **CSRF-проверка**: Content-Type для state-changing запросов (415)
- **Rate-limiting**: ThrottlerModule (3 tier: 3/20/100 за 1s/10s/60s)
- **ValidationPipe**: whitelist, transform, forbidNonWhitelisted
- **152-ФЗ**: UserConsent с IP + UserAgent
- **Email-верификация**: activation token (SHA-256, 24h TTL)
- **Graceful shutdown**: WS + DB pool

### Отсутствует

- **Nonce-based CSP**: `'unsafe-inline'` для скриптов (Next.js требует)
- **CSRF-токены**: проверка только Content-Type, не origin/referer
- **2FA**: нет двухфакторной аутентификации
- **Account lockout**: нет блокировки после N неудачных попыток
- **Rate-limit per-user**: Throttler глобальный, не привязан к userId/IP
- **Request ID**: нет correlation ID для трейсинга
- **WAF**: нет Web Application Firewall
- **DDoS protection**: нет защиты на уровне приложения
- **Security headers**: нет `X-Permitted-Cross-Domain-Policies`, `Permissions-Policy`
- **Dependency scanning**: нет `npm audit` в CI

### Технический долг

- **76 Python-скриптов** в корне с хардкод-паролем VPS (`paramiko` → `212.119.42.249` root)
- **`.env.production`** может содержать реальные секреты в git
- **`proxy.ts`** не редиректит неаутентифицированных пользователей
- **WebSocket auth**: 3 из 5 gateway'ев открыты (CORS `*`)
- **Файловые загрузки**: нет проверки MIME-type на сервере
- **`@sentry/nestjs`** в package.json, но не подключён

### Риски

- **XSS**: access-токены в localStorage — уязвимость к XSS-атакам
- **CSRF**: проверка только Content-Type — обход через `multipart/form-data`
- **CSP bypass**: `'unsafe-inline'` позволяет инъекцию скриптов
- **Утечка данных**: хардкод-пароли в Python-скриптах — любой с доступом к репо имеет root-доступ к VPS
- **Брутфорс OTP**: 6-digit код, 10 попыток, нет экспоненциальной задержки
- **Token leakage**: нет `__Host-` prefix для cookie, нет `Secure` flag в dev

---

## 9. Инфраструктура

### Готовность: 75%

### Реализовано

- **Docker Compose (dev)**: 8 сервисов (postgres, api, web, nginx, smtp, livekit, livekit-agent, certbot)
- **Docker Compose (prod)**: api, web, nginx, redis, monitoring (Grafana + Loki + Prometheus + node-exporter)
- **Nginx**: HTTPS reverse proxy (Let's Encrypt), maintenance mode, WebSocket support, LiveKit signaling (86400s timeout)
- **Let's Encrypt**: автоматическое обновление каждые 12h через certbot
- **CI/CD**: GitHub Actions (ci.yml: lint + typecheck + test + build; deploy.yml: build + scp + docker load + health-check)
- **Postfix**: null-client relay через smtp.yandex.ru:465 (TLS wrapper, SASL)
- **LiveKit**: WebRTC-сервер (7880 TCP, 7881-7882 UDP, TURN на grillyage.ru:5349)
- **LiveKit Agent**: IVR-бот (DTMF-меню, очередь звонков, перевод на оператора)
- **Monitoring**: Grafana (3001), Loki (3100), Promtail, Prometheus (9090), node-exporter (9100)
- **Deploy scripts**: `deploy.sh` (env-валидация, docker build, prisma migrate, seed), `init-ssl.sh` (Let's Encrypt setup)
- **Dockerfile'ы**: multi-stage Node 22-alpine для api и web, healthcheck'и
- **Volumes**: pgdata, uploads, certbot-www, certbot-etc

### Отсутствует

- **Dev ≠ Prod консистентность**: разные TLS-режимы, rate-limiting, мониторинг, Redis
- **Backup**: нет автоматического бэкапа PostgreSQL
- **Disaster recovery**: нет плана восстановления
- **Load balancing**: один инстанс api/web
- **CDN**: нет CDN для статических файлов (uploads, images)
- **Secrets management**: нет Vault/SOPS — секреты в `.env`
- **Infrastructure as Code**: нет Terraform/Pulumi
- **Container registry**: нет приватного registry — образы билдятся на VPS
- **Docs**: `docs/demo-tailscale.md` упомянут в README, но файл отсутствует

### Технический долг

- **76 Python-скриптов** в корне репозитория — загромождают структуру
- **Dev compose** включает LiveKit/SMTP, **prod compose** — нет (управляются отдельно)
- **Postgres без host-port** в обоих compose — затрудняет ручную отладку
- **Nginx configs**: `default.conf` (HTTPS) и `nginx.conf` (HTTP) — разные конфигурации для dev/prod
- **Uploads**: в dev — api-stored, в prod — static-aliased в nginx
- **Redis**: в prod compose, но не используется в коде (только в env)

### Риски

- **Single point of failure**: один VPS, один postgres, один api — нет репликации
- **Утечка данных**: хардкод-пароли в Python-скриптах, `.env.production` в git
- **Downtime**: нет health-check → auto-restart для api/web
- **Масштабируемость**: нет horizontal scaling — только vertical
- **SSL expiry**: certbot renewal автоматический, но нет мониторинга expiry
- **Disk space**: нет ротации логов, нет очистки uploads

---

## 10. Почта

### Готовность: 70%

### Реализовано

- **Nodemailer**: 4 шаблона (verification email, email OTP, phone OTP, order confirmation)
- **HTML-шаблоны**: с брендингом Грильяж
- **Postfix relay**: null-client → smtp.yandex.ru:465 (TLS wrapper, SASL)
- **Mailpit**: dev-окружение (localhost:1025, web UI на :8025)
- **SMTP-конфигурация**: `SMTP_HOST/PORT/USER/PASSWORD/SECURE/IGNORE_TLS` + `MAIL_FROM`
- **Email-верификация**: activation token (32 bytes hex, SHA-256, 24h TTL)
- **Email OTP**: 6-digit code для авторизации
- **Phone OTP**: 6-digit code, отправляется **на email** (не SMS)
- **Order confirmation**: письмо после создания заказа

### Отсутствует

- **SMS-отправка**: `SMS_RU_API_KEY` scaffolded, но не используется
- **Очередь писем**: нет retry-логики, нет dead-letter queue
- **Bounce handling**: нет обработки недоставленных писем
- **Unsubscribe**: нет отписки от маркетинговых рассылок
- **Email templates**: нет редактора шаблонов в CRM
- **Transactional email service**: нет интеграции с SendGrid/Mailgun/SES
- **Email analytics**: нет отслеживания открытий/кликов
- **Rate-limit per-email**: нет защиты от spam-а

### Технический долг

- Phone OTP отправляется на email — вводит пользователя в заблуждение («код из SMS»)
- Нет retry-логики при сбое SMTP
- Нет логирования отправленных писем в БД
- Нет валидации email-адресов (MX-record check)
- `MAIL_FROM` хардкод в env — нет возможности менять из CRM

### Риски

- **Deliverability**: Yandex SMTP relay — может попадать в спам
- **Spam**: нет rate-limit per-email — злоумышленник может отправить тысячи писем
- **Data loss**: нет очереди — при сбое SMTP письма теряются
- **Compliance**: нет unsubscribe-механизма — нарушение CAN-SPAM/GDPR
- **UX**: Phone OTP на email — пользователь ожидает SMS, получает email

---

## 11. Мониторинг

### Готовность: 60%

### Реализовано

- **Grafana**: дашборды на порту 3001
- **Loki**: агрегация логов (3.4, filesystem storage, 30-day retention, 10MB/s ingestion)
- **Promtail**: сбор Docker-контейнерных логов через `/var/run/docker.sock`, фильтр по `logging=promtail` label
- **Prometheus**: метрики (9090), scrape `node-exporter:9100`, `api:4000`, self, 60s interval
- **Node-exporter**: host-метрики (CPU, memory, disk, network)
- **Sentry**: error tracking (10% traces, opt-in via `SENTRY_DSN`)
- **StructuredLogger**: JSON-логи в production
- **Health-check**: `GET /health` (DB ping)
- **Docker healthcheck'и**: postgres (pg_isready), api (wget /health)

### Отсутствует

- **Alerting rules**: нет правил алертов (Prometheus Alertmanager не настроен)
- **Pre-configured dashboards**: Grafana без предустановленных дашбордов
- **Uptime monitoring**: нет внешнего мониторинга доступности (UptimeRobot, Pingdom)
- **APM**: нет Application Performance Monitoring (Jaeger, Zipkin)
- **Error budget**: нет SLO/SLA
- **Log rotation**: нет автоматической ротации логов
- **Metrics endpoint**: `/metrics` не экспонируется (Prometheus scrape config есть, но endpoint не реализован)
- **Sentry NestJS integration**: `@sentry/nestjs` в package.json, но не подключён
- **Tracing**: нет distributed tracing (OpenTelemetry)
- **Anomaly detection**: нет ML-based anomaly detection

### Технический долг

- Monitoring stack только в `docker-compose.prod.yml` — нет в dev
- Promtail фильтрует по `logging=promtail` label, но не все сервисы помечены
- Loki retention 30 дней — может быть недостаточно для compliance
- Prometheus scrape interval 60s — может пропускать короткие пики
- Sentry 10% traces — может быть недостаточно для отладки

### Риски

- **Blind spots**: нет алертов — проблемы обнаруживаются только когда пользователи жалуются
- **Data loss**: Loki retention 30 дней — исторические логи недоступны
- **Performance**: нет APM — невозможно определить bottleneck
- **Incident response**: нет runbook, нет on-call rotation
- **Cost**: Grafana/Prometheus потребляют ресурсы VPS — нет мониторинга самого мониторинга
- **Security**: Grafana на порту 3001 — нет authentication/authorization

---

## Критический путь к production

### Блокеры (must-fix)

1. **Онлайн-оплата** — без платёжного шлюза сайт не может принимать оплату
2. **OAuth client_id** — VK/Yandex PLACEHOLDER в мобильном приложении
3. **iOS permissions** — отсутствие `NSLocationWhenInUseUsageDescription` → App Store reject
4. **Хардкод-пароли** — 76 Python-скриптов с root-доступом к VPS
5. **SMS-интеграция** — Phone OTP на email вводит пользователей в заблуждение

### Высокий приоритет (should-fix)

6. **`/menu` на локальных данных** — страница не использует API
7. **Курьерская навигация** — stub вместо `url_launcher`
8. **Push для курьера** — курьер не получает уведомления о заказах
9. **CSP nonce** — `'unsafe-inline'` снижает безопасность
10. **Гекодинг адресов** — `findNearestCourier` не работает корректно

### Средний приоритет (nice-to-have)

11. **Cron-задачи** — автоочистка OTP, refresh-токенов, деактивация акций
12. **E2E-тесты для CRM** — текущее покрытие только публичный сайт
13. **Monitoring alerts** — Prometheus Alertmanager
14. **Backup PostgreSQL** — автоматический бэкап
15. **Операторское ПО** — замена `alert()` на реальный LiveKit

---

*Аудит проведён на основе анализа репозитория. Код не изменён.*
