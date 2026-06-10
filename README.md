# Грильяж — сайт, доставка и CRM

Сайт с доставкой/самовывозом, CRM (админ + оператор) и API для мобильных приложений
гастрохауса «Грильяж» (Омск).

## Структура

```
apps/
  api/      — NestJS REST API + WebSocket (заказы realtime) + Prisma/PostgreSQL
  web/      — Next.js: публичный сайт (/) и CRM (/admin)
  mobile/   — Flutter-приложение (Android/iOS)
packages/
  shared/   — общие типы, DTO, константы
infra/
  docker-compose.yml       — dev-окружение (PostgreSQL, Mailpit)
  docker-compose.prod.yml  — прод (VPS, Ubuntu 24.04+)
Site/Design/ — дизайн-макеты (референс)
```

## Требования

- Node.js ≥ 22
- Docker + Docker Compose
- (для mobile) Flutter SDK

Работает на Linux (Arch/Ubuntu) и Windows.

## Быстрый старт (dev)

```bash
cp .env.example .env
docker compose -f infra/docker-compose.yml up -d   # PostgreSQL + Mailpit
npm install
npm run db:migrate                                  # миграции + сид
npm run dev                                         # api: :4000, web: :3000
```

- Сайт: http://localhost:3000
- CRM: http://localhost:3000/admin
- API: http://localhost:4000/api/v1 (Swagger: /api/docs)
- Mailpit (почтовая ловушка): http://localhost:8025

## Тесты

```bash
npm test          # unit + e2e API
npm run test:e2e  # Playwright (web)
```

## План

Детальный план реализации: `.omo/plans/grilyage-delivery.md`
