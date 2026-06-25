# Release Plan — Проект «Грильяж»

> **Дата:** июнь 2026  
> **Текущая версия:** 0.1.0 (pre-release)  
> **Целевая версия:** 1.0.0 (production)  
> **Статус:** PLANNING

---

## 1. Версионирование

### 1.1. Semantic Versioning (SemVer)

**Формат:** `MAJOR.MINOR.PATCH`

| Компонент | Когда увеличивается | Пример |
|-----------|---------------------|--------|
| **MAJOR** | Breaking changes в API, несовместимые изменения БД | 1.0.0 → 2.0.0 |
| **MINOR** | Новая функциональность (backward compatible) | 1.0.0 → 1.1.0 |
| **PATCH** | Bug fixes, security patches | 1.0.0 → 1.0.1 |

**Примеры:**

- `0.1.0` — pre-release (текущая)
- `0.2.0` — добавлен SMS OTP
- `0.3.0` — добавлена платёжная интеграция
- `1.0.0` — production release (после P0 + P1)
- `1.0.1` — hotfix (баг в мобильном приложении)
- `1.1.0` — добавлен предзаказ
- `2.0.0` — breaking change в API (новая структура заказов)

### 1.2. Git tagging

**Формат тегов:** `v{MAJOR}.{MINOR}.{PATCH}`

```bash
git tag -a v1.0.0 -m "Release 1.0.0: Production launch"
git push origin v1.0.0
```

**Pre-release теги:**

```bash
git tag -a v1.0.0-rc.1 -m "Release candidate 1 for 1.0.0"
git push origin v1.0.0-rc.1
```

### 1.3. Branching strategy

**Модель:** GitHub Flow (упрощённый Git Flow)

```
main (production)
  │
  ├── feature/sms-integration (feature branch)
  │     └── PR → main
  │
  ├── hotfix/payment-bug (hotfix branch)
  │     └── PR → main
  │
  └── release/v1.0.0 (release branch, опционально)
        └── PR → main
```

**Правила:**

- `main` — всегда production-ready
- Feature branches — от `main`, merge через PR
- Hotfix branches — от `main`, merge через PR, cherry-pick в `main`
- Release branches — опционально, для стабилизации перед релизом

---

## 2. Release Process

### 2.1. Pre-release checklist

**За 1 неделю до релиза:**

- [ ] Все P0-задачи выполнены (или есть план на hotfix)
- [ ] Все P1-задачи выполнены (для full launch)
- [ ] Unit tests проходят (`npm test`)
- [ ] E2E tests проходят (если реализованы)
- [ ] Security audit пройден (`security-review.md`)
- [ ] Performance testing выполнен (Lighthouse, load testing)
- [ ] Documentation обновлена (`AI_CTO.md`, `project-map.md`)
- [ ] Changelog написан
- [ ] Release notes подготовлены

**За 1 день до релиза:**

- [ ] Code freeze (никаких новых features)
- [ ] Final testing на staging (если есть)
- [ ] Backup базы данных выполнен
- [ ] Rollback plan готов
- [ ] Команда уведомлена о релизе
- [ ] On-call инженер назначен

### 2.2. Release day timeline

| Время | Действие | Ответственный |
|-------|----------|---------------|
| **09:00** | Final check: все тесты проходят, backup готов | DevOps |
| **10:00** | Code freeze, создание release branch | Backend |
| **10:30** | Build Docker images | DevOps |
| **11:00** | Deploy на staging (если есть) | DevOps |
| **11:30** | Smoke testing на staging | QA / Backend |
| **12:00** | Deploy на production | DevOps |
| **12:30** | Smoke testing на production | QA / Backend |
| **13:00** | Monitoring: первые 2 часа | DevOps + Backend |
| **15:00** | Monitoring: следующие 4 часа | DevOps |
| **19:00** | End of day check | DevOps |
| **Next day** | Post-release review | Team |

### 2.3. Deployment strategy

**Для MVP (1 VPS):** Rolling update с downtime

```bash
# 1. Pull latest code
cd /opt/grilyage
git pull origin main
git checkout v1.0.0

# 2. Build new images
docker compose -f infra/docker-compose.prod.yml build

# 3. Stop old containers (downtime ~30s)
docker compose -f infra/docker-compose.prod.yml down

# 4. Run migrations
npm run db:migrate:prod

# 5. Start new containers
docker compose -f infra/docker-compose.prod.yml up -d

# 6. Health check
curl https://grillyage.ru/health
```

**Для future (multiple VPS):** Blue-green deployment

```
┌─────────────────┐         ┌─────────────────┐
│   Blue (prod)   │         │  Green (staging) │
│   v1.0.0        │         │   v1.1.0        │
│   Active        │         │   Testing       │
└────────┬────────┘         └────────┬────────┘
         │                           │
         └───────────┬───────────────┘
                     │
              ┌──────┴──────┐
              │ Load Balancer│
              │  (Nginx/HAProxy) │
              └─────────────┘
```

**Шаги:**

1. Deploy v1.1.0 на Green environment
2. Test на Green
3. Switch traffic: Blue → Green (Nginx upstream)
4. Monitor 30 мин
5. Если всё ок — Green becomes new Blue
6. Если проблемы — rollback: switch back to Blue

---

## 3. Changelog

### 3.1. Формат

**Файл:** `CHANGELOG.md`

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [1.0.0] - 2026-06-24

### Added
- Online payment integration (YooKassa)
- SMS OTP for phone verification
- Push notifications for couriers
- Courier navigation (url_launcher)
- Backup strategy (PostgreSQL every 6h)

### Fixed
- IDOR vulnerability in `getMyOrderById` (security bug)
- WebSocket authentication (all gateways now require JWT)
- CSP `'unsafe-inline'` replaced with nonce-based

### Changed
- Migrated from localStorage to httpOnly cookies for JWT
- Updated to Next.js 14 (App Router)
- Improved performance: N+1 queries fixed

### Security
- Fixed CVSS 7.5 IDOR vulnerability
- Added CSRF protection for staff operations
- Implemented 2FA for admin users

## [0.3.0] - 2026-06-15

### Added
- Payment integration (YooKassa)
- SMS.ru integration for phone OTP

## [0.2.0] - 2026-06-10

### Added
- WebSocket authentication for all gateways
- Backup strategy implementation

## [0.1.0] - 2026-06-01

### Added
- Initial release
- Basic order management
- CRM for operators
- Mobile app (Android)
```

### 3.2. Автоматическая генерация

**Инструмент:** `standard-version` или `semantic-release`

```bash
npm install -D standard-version
```

**package.json:**

```json
{
  "scripts": {
    "release": "standard-version",
    "release:dry-run": "standard-version --dry-run"
  }
}
```

**Использование:**

```bash
npm run release
# Автоматически:
# 1. Увеличивает версию в package.json
# 2. Обновляет CHANGELOG.md
# 3. Создаёт git tag
# 4. Коммитит изменения
```

---

## 4. Release Notes

### 4.1. Для пользователей

**Формат:** Blog post / in-app notification

**Пример:**

```markdown
# 🎉 Грильяж 1.0 — официальный релиз!

Мы рады объявить о выпуске версии 1.0 нашей платформы доставки еды.

## Что нового

### 📱 Мобильное приложение
- **Онлайн-оплата:** теперь можно оплатить заказ картой прямо в приложении
- **SMS-подтверждение:** быстрая верификация по SMS вместо email
- **Push-уведомления:** получайте уведомления о статусе заказа в реальном времени

### 🚚 Для курьеров
- **Навигация:** встроенная навигация к адресу клиента
- **Push-уведомления:** мгновенные уведомления о новых заказах

### 🔒 Безопасность
- Улучшена защита данных пользователей
- Добавлена двухфакторная аутентификация для администраторов

## Как обновить

Мобильное приложение обновится автоматически. Если нет — обновите через Google Play / RuStore.

## Обратная связь

Нашли баг? Напишите нам: support@grillyage.ru

Спасибо, что выбираете Грильяж! 🍰
```

### 4.2. Для команды (internal)

**Формат:** Email / Slack / Notion

**Пример:**

```markdown
# Release 1.0.0 — Internal Notes

**Дата:** 2026-06-24  
**Версия:** 1.0.0  
**Статус:** ✅ Released

## Изменения

### Breaking changes
- Нет

### Новые features
- Онлайн-оплата (YooKassa)
- SMS OTP
- Push notifications для курьеров

### Bug fixes
- IDOR vulnerability (CVSS 7.5)
- WebSocket auth
- CSP nonce-based

## Deployment

**Время:** 12:00 MSK  
**Downtime:** ~30 секунд  
**Rollback plan:** Готов (см. §5)

## Monitoring

**Первые 2 часа:**
- DevOps: мониторинг Grafana
- Backend: мониторинг Sentry
- Product: smoke testing

**On-call:**
- DevOps: Иван (Telegram: @ivan)
- Backend: Пётр (Telegram: @petr)

## Known issues

- iOS-версия мобильного приложения ещё не готова (в процессе)
- Operator app (Electron) — заглушка, будет заменён на web CRM

## Next steps

- v1.1.0: предзаказ, программа лояльности
- v1.2.0: iOS mobile app, operator app replacement
```

---

## 5. Rollback Plan

### 5.1. Когда откатывать

| Ситуация | Действие |
|----------|----------|
| **Error rate > 5%** за 5 мин | Немедленный rollback |
| **Critical bug** (data loss, security breach) | Немедленный rollback |
| **Performance degradation** (p95 > 5s) | Rollback в течение 1 часа |
| **Minor bug** (UI glitch, non-critical) | Hotfix в течение 24 часов |

### 5.2. Rollback procedure

**Шаг 1: Определить предыдущую стабильную версию**

```bash
git tag --sort=-v:refname | head -5
# v1.0.0
# v0.3.0
# v0.2.0
# v0.1.0
```

**Шаг 2: Откатить код**

```bash
cd /opt/grilyage
git checkout v0.3.0  # предыдущая стабильная версия
```

**Шаг 3: Откатить БД (если были миграции)**

```bash
# Если миграции необратимы — восстановить из backup
# См. backup-strategy.md §6.1

# Если миграции обратимы:
npm run db:migrate:rollback
```

**Шаг 4: Пересобрать и перезапустить**

```bash
docker compose -f infra/docker-compose.prod.yml build
docker compose -f infra/docker-compose.prod.yml down
docker compose -f infra/docker-compose.prod.yml up -d
```

**Шаг 5: Проверить health**

```bash
curl https://grillyage.ru/health
```

**Шаг 6: Уведомить команду**

```
🚨 Rollback выполнен
Причина: [описание проблемы]
Версия: v0.3.0 (откат с v1.0.0)
Время: 12:45 MSK
Статус: ✅ Production работает
Next steps: [план исправления]
```

### 5.3. Database rollback

**Сценарий 1: Миграции обратимы**

```bash
npm run db:migrate:rollback
```

**Сценарий 2: Миграции необратимы (data loss)**

```bash
# Восстановить из backup
# См. backup-strategy.md §6.1

# Остановить API
docker compose -f infra/docker-compose.prod.yml stop api

# Восстановить БД
docker exec grilyage-postgres psql -U grilyage -d grilyage -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
docker exec -i grilyage-postgres psql -U grilyage -d grilyage < /var/backups/grilyage/postgres/grilyage_LATEST.sql

# Запустить API
docker compose -f infra/docker-compose.prod.yml start api
```

---

## 6. Hotfix Process

### 6.1. Когда нужен hotfix

| Ситуация | Severity | Время реакции |
|----------|----------|---------------|
| **Critical bug** (data loss, security) | P0 | 1 час |
| **Major bug** (broken feature) | P1 | 4 часа |
| **Minor bug** (UI glitch) | P2 | 24 часа |

### 6.2. Hotfix workflow

**Шаг 1: Создать hotfix branch**

```bash
git checkout main
git pull origin main
git checkout -b hotfix/payment-bug
```

**Шаг 2: Исправить баг**

```bash
# Исправить код
# Добавить тесты
# Проверить: npm test
```

**Шаг 3: Создать PR**

```bash
git add .
git commit -m "fix: payment bug in checkout"
git push origin hotfix/payment-bug
```

**Шаг 4: Code review + merge**

- PR review (минимум 1 approver)
- CI/CD checks проходят
- Merge в `main`

**Шаг 5: Увеличить PATCH версию**

```bash
npm version patch
# 1.0.0 → 1.0.1
```

**Шаг 6: Deploy hotfix**

```bash
git tag v1.0.1
git push origin v1.0.1

# Deploy на production
# См. §2.3
```

**Шаг 7: Обновить CHANGELOG**

```markdown
## [1.0.1] - 2026-06-25

### Fixed
- Payment bug in checkout (hotfix)
```

---

## 7. Communication Plan

### 7.1. Stakeholders

| Аудитория | Канал | Время уведомления |
|-----------|-------|-------------------|
| **Команда** (dev, product, design) | Slack / Telegram | За 1 день до релиза |
| **Пользователи** | In-app notification, email | В день релиза |
| **Клиенты** (B2B) | Email | За 1 день до релиза |
| **Investors / CTO** | Email | В день релиза (после deploy) |

### 7.2. Templates

**Pre-release notification (команда):**

```
📅 Release 1.0.0 запланирован на завтра (2026-06-24)

Время: 12:00 MSK
Downtime: ~30 секунд
Rollback plan: готов

Чек-лист:
✅ Все тесты проходят
✅ Backup готов
✅ Monitoring настроен
✅ On-call назначен

On-call:
- DevOps: Иван (@ivan)
- Backend: Пётр (@petr)

Вопросы? Пишите в #release-channel
```

**Post-release notification (команда):**

```
✅ Release 1.0.0 успешно выпущен!

Время deploy: 12:15 MSK
Downtime: 28 секунд
Статус: production работает

Первые метрики:
- Error rate: 0.1% (норма)
- Response time p95: 450ms (норма)
- Uptime: 100%

Sentry: 0 errors
Grafana: все метрики в норме

Спасибо всем за работу! 🎉

Next: мониторинг первые 24 часа
```

**User notification (in-app):**

```
🎉 Обновление!

Мы выпустили новую версию Грильяж с онлайн-оплатой и SMS-подтверждением.

Что нового:
✅ Оплата картой в приложении
✅ Быстрая верификация по SMS
✅ Push-уведомления о заказах

Обновите приложение, чтобы получить новые функции!
```

---

## 8. Post-release Monitoring

### 8.1. Первые 24 часа

| Время | Действие | Ответственный |
|-------|----------|---------------|
| **0-2 часа** | Активный мониторинг (Grafana, Sentry) | DevOps + Backend |
| **2-6 часов** | Проверка каждые 30 мин | DevOps |
| **6-12 часов** | Проверка каждые 2 часа | DevOps |
| **12-24 часа** | Проверка каждые 4 часа | DevOps |

**Метрики для мониторинга:**

- Error rate < 0.5%
- Response time p95 < 500ms
- Uptime ≥ 99.5%
- Sentry: нет critical errors
- Business metrics: заказы, конверсия

### 8.2. Первые 7 дней

| День | Действие |
|------|----------|
| **Day 1** | Активный мониторинг, daily standup |
| **Day 2-3** | Проверка метрик, сбор feedback |
| **Day 4-7** | Анализ performance, планирование hotfix (если нужно) |

### 8.3. Post-release review

**Когда:** Через 1 неделю после релиза

**Agenda:**

1. **Что прошло хорошо?**
   - Deploy без downtime?
   - Monitoring сработал?
   - Команда была готова?

2. **Что можно улучшить?**
   - Были ли проблемы?
   - Что заняло больше времени, чем ожидалось?
   - Какие процессы не сработали?

3. **Action items**
   - Обновить документацию
   - Улучшить CI/CD
   - Добавить тесты
   - Оптимизировать deployment

**Формат:** Retrospective meeting (30 мин)

**Output:** Action items в Jira / Notion

---

## 9. Release Schedule

### 9.1. Roadmap

| Версия | Дата | Описание | Статус |
|--------|------|----------|--------|
| **0.1.0** | 2026-06-01 | Initial pre-release | ✅ Done |
| **0.2.0** | 2026-06-10 | WebSocket auth, backup | ✅ Done |
| **0.3.0** | 2026-06-15 | Payment, SMS OTP | ✅ Done |
| **1.0.0** | 2026-06-24 | Production launch | 🔄 In progress |
| **1.0.1** | TBD | Hotfix (если нужно) | ⏳ Planned |
| **1.1.0** | 2026-07-15 | Предзаказ, программа лояльности | ⏳ Planned |
| **1.2.0** | 2026-08-15 | iOS mobile app, operator app | ⏳ Planned |
| **2.0.0** | 2026-10-01 | Breaking changes (API v2) | ⏳ Planned |

### 9.2. Release cadence

| Тип релиза | Частота | Пример |
|------------|---------|--------|
| **Major** (breaking) | Раз в 6-12 месяцев | 1.0.0 → 2.0.0 |
| **Minor** (features) | Раз в 1-2 месяца | 1.0.0 → 1.1.0 |
| **Patch** (bug fixes) | По необходимости | 1.0.0 → 1.0.1 |
| **Hotfix** (critical) | Немедленно | 1.0.0 → 1.0.1 |

---

## 10. Tools & Automation

### 10.1. CI/CD (GitHub Actions)

**Файл:** `.github/workflows/release.yml`

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '22'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

      - name: Build
        run: npm run build

      - name: Build Docker images
        run: |
          docker build -t grilyage-api:${{ github.ref_name }} apps/api
          docker build -t grilyage-web:${{ github.ref_name }} apps/web

      - name: Push to registry
        run: |
          docker tag grilyage-api:${{ github.ref_name }} registry.grillyage.ru/api:${{ github.ref_name }}
          docker push registry.grillyage.ru/api:${{ github.ref_name }}

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to production
        run: |
          ssh user@grillyage.ru "cd /opt/grilyage && git pull && docker compose -f infra/docker-compose.prod.yml pull && docker compose -f infra/docker-compose.prod.yml up -d"
```

### 10.2. Automated changelog

**Инструмент:** `github-changelog-generator`

```bash
github_changelog_generator -u your-org -p grilyage --token $GITHUB_TOKEN
```

### 10.3. Slack / Telegram notifications

**GitHub Actions:**

```yaml
- name: Notify Slack
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    channel: '#releases'
  env:
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

---

## 11. Контакты

| Роль | Имя | Контакт | Ответственность |
|------|-----|---------|-----------------|
| **Release Manager** | — | Telegram | Координация релиза |
| **DevOps** | — | Telegram / Phone | Deployment, rollback |
| **Backend** | — | Telegram / Phone | Code review, hotfix |
| **QA** | — | Telegram | Testing, smoke tests |
| **Product Owner** | — | Telegram / Email | Release notes, communication |
| **CTO** | — | Email / Phone | Approval, escalation |

---

*Release plan создан на основе AI_CTO.md, implementation-roadmap.md, deployment-checklist.md. Дата: июнь 2026.*
