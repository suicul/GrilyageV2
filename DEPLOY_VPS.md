# Ручной деплой на VPS — пошаговая инструкция

> Цель: залить актуальный код на VPS `212.119.42.249` (grillyage.ru) для ручного тестирования.

---

## Что было исправлено (важно для тестирования)

1. **Вход в админку (500 error)** — создана миграция `20260629120000` для недостающих полей StaffUser (`loginAttempts`, `lockedUntil`, `totpSecret`, и др.)
2. **Яндекс ID (500 error)** — `docker-compose.prod.yml` теперь пробрасывает `NEXT_PUBLIC_YANDEX_CLIENT_ID` и `YANDEX_CLIENT_SECRET` в API контейнер + build-arg для web
3. **CI/CD** — добавлен `master` в trigger ветки
4. **Deploy** — добавлен `prisma migrate deploy` перед restart + health check на `/health`
5. **iOS permissions** — добавлены NSXxxUsageDescription в Info.plist
6. **Speaker toggle** — теперь вызывает `Hardware.setSpeakerphoneOn()` из LiveKit
7. **Удалён мусор** — отладочные файлы из корня

---

## Вариант A: Автоматический деплой через CI/CD (рекомендуется)

После push в `main` или `master` CI/CD сработает автоматически.

### Что нужно проверить в GitHub Secrets

```
Repository → Settings → Secrets and variables → Actions
```

Обязательные secrets:

| Secret | Значение |
|--------|----------|
| `VPS_HOST` | `212.119.42.249` |
| `VPS_USER` | `root` (или ваш пользователь) |
| `VPS_SSH_KEY` | приватный SSH-ключ ( содержимое `-----BEGIN OPENSSH PRIVATE KEY----- ... -----END OPENSSH PRIVATE KEY-----`) |
| `NEXT_PUBLIC_VK_CLIENT_ID` | VK OAuth client ID |
| `NEXT_PUBLIC_YANDEX_CLIENT_ID` | `2461c9f22e4c4feeae467abaf7797956` |
| `NEXT_PUBLIC_YANDEX_MAPS_API_KEY` | Yandex Maps API key |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry DSN (опционально) |

### Проверка

1. Push в `main` → GitHub Actions → CI должен пройти
2. После CI → Deploy запустится автоматически
3. Проверить: `curl https://grillyage.ru/health` → `{"status":"ok",...}`
4. Проверить: `https://grillyage.ru/admin/login` → форма входа

---

## Вариант B: Ручной деплой (если CI/CD не настроен)

### Шаг 0: Подключение к VPS

```bash
ssh root@212.119.42.249
# или
ssh user@212.119.42.249
```

### Шаг 1: Остановить текущие сервисы

```bash
cd /opt/grilyage
docker compose -f infra/docker-compose.prod.yml down
```

### Шаг 2: Обновить код

```bash
cd /opt/grilyage
git fetch origin
git checkout main          # или master
git pull origin main
```

> Если `/opt/grilyage` — это не git-репозиторий, клонируйте:
> ```bash
> git clone https://github.com/suicul/GrilyageV2.git /opt/grilyage
> cd /opt/grilyage
> git checkout main
> ```

### Шаг 3: Подготовить `.env.production`

```bash
cd /opt/grilyage

# Если файла нет — создать из шаблона
cp .env.production .env.production.bak 2>/dev/null  # бэкап старого
```

Отредактировать `.env.production`:

```bash
nano .env.production
```

**КРИТИЧЕСКИ ВАЖНО заменить заглушки на реальные значения:**

```bash
# Сгенерировать секреты (выполнить в консоли):
openssl rand -hex 64  # → JWT_ACCESS_SECRET
openssl rand -hex 64  # → JWT_REFRESH_SECRET
openssl rand -hex 64  # → STAFF_JWT_ACCESS_SECRET
openssl rand -hex 64  # → STAFF_JWT_REFRESH_SECRET
openssl rand -hex 32  # → POSTGRES_PASSWORD
```

Записать сгенерированные значения в `.env.production`.

**Проверить, что Yandex OAuth значения на месте:**
```
NEXT_PUBLIC_YANDEX_CLIENT_ID=2461c9f22e4c4feeae467abaf7797956
YANDEX_CLIENT_SECRET=b430fa45f1c14ecab1ef7fd9141fc88f
```

**Установить права:**
```bash
chmod 600 .env.production
```

### Шаг 4: Собрать Docker-образы

```bash
cd /opt/grilyage

# Сборка API
docker compose -f infra/docker-compose.prod.yml build api

# Сборка Web (с build-args для NEXT_PUBLIC_*)
export NEXT_PUBLIC_YANDEX_CLIENT_ID=2461c9f22e4c4feeae467abaf7797956
export NEXT_PUBLIC_VK_CLIENT_ID=your_vk_client_id
docker compose -f infra/docker-compose.prod.yml build web
```

> Если `NEXT_PUBLIC_VK_CLIENT_ID` не настроен, можно передать пустую строку:
> ```bash
> export NEXT_PUBLIC_VK_CLIENT_ID=""
> ```

### Шаг 5: Применить миграции БД

```bash
# Сначала запустить только postgres
docker compose -f infra/docker-compose.prod.yml up -d postgres

# Дождаться готовности postgres (10-15 секунд)
sleep 15

# Применить миграции (включая новую 20260629120000)
docker compose -f infra/docker-compose.prod.yml run --rm --no-deps api npx prisma migrate deploy

# Запустить seed (создаст admin/admin123 + каталог)
docker compose -f infra/docker-compose.prod.yml run --rm --no-deps api npx prisma db seed
```

> ⚠️ **Если миграция падает с ошибкой** "column already exists" — БД уже имеет эти поля
> (например, из `prisma db push`). В этом случае:
> ```bash
> # Пометить миграцию как применённую без выполнения SQL
> docker compose -f infra/docker-compose.prod.yml run --rm --no-deps api \
>   npx prisma migrate resolve --applied 20260629120000_add_staff_fields_and_user_updates
> ```

### Шаг 6: Запустить все сервисы

```bash
cd /opt/grilyage
docker compose -f infra/docker-compose.prod.yml up -d
```

### Шаг 7: Проверить статус

```bash
# Все контейнеры должны быть Up
docker compose -f infra/docker-compose.prod.yml ps

# Health check API
curl http://localhost:4000/health
# Ожидаемый ответ: {"status":"ok","info":{"database":{"status":"up"}}}

# Health check Web
curl -I http://localhost:3000
# Ожидаемый ответ: HTTP/1.1 200 OK

# Проверить через домен
curl https://grillyage.ru/health
curl -I https://grillyage.ru/
```

### Шаг 8: Проверить вход в админку

```bash
# 1. Открыть в браузере
https://grillyage.ru/admin/login

# 2. Войти с admin / admin123

# 3. Если ошибка — проверить логи API:
docker compose -f infra/docker-compose.prod.yml logs api --tail 50

# 4. Если "column does not exist" — миграция не применилась:
docker compose -f infra/docker-compose.prod.yml run --rm --no-deps api npx prisma migrate status
```

### Шаг 9: Проверить Яндекс ID

```bash
# 1. Открыть сайт: https://grillyage.ru
# 2. Нажать "Войти"
# 3. Выбрать "Яндекс ID"
# 4. Должно открыться окно OAuth Яндекса
# 5. После авторизации — возврат на сайт

# Если ошибка — проверить логи:
docker compose -f infra/docker-compose.prod.yml logs api --tail 50 | grep -i yandex

# Проверить, что env vars дошли до контейнера:
docker compose -f infra/docker-compose.prod.yml exec api env | grep YANDEX
```

### Шаг 10: Перезагрузить nginx (если нужно)

```bash
docker compose -f infra/docker-compose.prod.yml exec nginx nginx -s reload
# или
docker compose -f infra/docker-compose.prod.yml restart nginx
```

---

## Откат (rollback)

Если что-то сломалось:

```bash
cd /opt/grilyage

# Откатить код
git log --oneline -5          # найти предыдущий коммит
git checkout <previous-hash>

# Пересобрать
docker compose -f infra/docker-compose.prod.yml build
docker compose -f infra/docker-compose.prod.yml up -d

# Если БД сломана — восстановить из backup
# (см. MANAGEMENT.md → Бэкап PostgreSQL → Восстановление)
```

---

## Проверка после деплоя — чек-лист

| # | Проверка | URL / команда | Ожидаемый результат |
|---|----------|---------------|---------------------|
| 1 | API health | `curl https://grillyage.ru/health` | `{"status":"ok"}` |
| 2 | Сайт | `https://grillyage.ru/` | Главная страница |
| 3 | CRM login | `https://grillyage.ru/admin/login` | Форма входа |
| 4 | Вход admin | admin / admin123 | Дашборд CRM |
| 5 | Swagger | `https://grillyage.ru/api/docs` | Swagger UI (только dev) |
| 6 | Яндекс ID | Кнопка "Яндекс ID" в форме входа | OAuth окно |
| 7 | Каталог | `https://grillyage.ru/api/v1/categories` | JSON с категориями |
| 8 | Логи API | `docker compose logs api --tail 20` | Нет ошибок |
| 9 | Логи Web | `docker compose logs web --tail 20` | Нет ошибок |
| 10 | SSL | `https://www.ssllabs.com/ssltest/` | A или A+ |

---

## Частые проблемы

### "Internal Server Error" на /admin/login

**Причина:** Миграция `20260629120000` не применилась — нет колонок `loginAttempts`, `lockedUntil` в таблице `StaffUser`.

**Решение:**
```bash
docker compose -f infra/docker-compose.prod.yml run --rm --no-deps api npx prisma migrate deploy
docker compose -f infra/docker-compose.prod.yml restart api
```

### "Internal Server Error" на Яндекс ID

**Причина:** `NEXT_PUBLIC_YANDEX_CLIENT_ID` или `YANDEX_CLIENT_SECRET` не дошли до API контейнера.

**Решение:**
```bash
# Проверить env в контейнере
docker compose -f infra/docker-compose.prod.yml exec api env | grep YANDEX

# Если пусто — пересобрать с env vars
docker compose -f infra/docker-compose.prod.yml down
docker compose -f infra/docker-compose.prod.yml build --no-cache api web
docker compose -f infra/docker-compose.prod.yml up -d
```

### Web не видит Yandex Client ID

**Причина:** `NEXT_PUBLIC_YANDEX_CLIENT_ID` не передан как build-arg при сборке web.

**Решение:**
```bash
export NEXT_PUBLIC_YANDEX_CLIENT_ID=2461c9f22e4c4feeae467abaf7797956
docker compose -f infra/docker-compose.prod.yml build --no-cache web
docker compose -f infra/docker-compose.prod.yml up -d web
```

### Postgres не запускается

```bash
# Проверить логи
docker compose -f infra/docker-compose.prod.yml logs postgres

# Проверить диск
df -h

# Если диск полон — очистить docker
docker system prune -a --volumes  # ВНИМАНИЕ: удалит все неиспользуемые образы и volume!
```

### Port already in use

```bash
# Найти процесс на порту
sudo lsof -i :4000
sudo lsof -i :3000

# Убить
kill -9 <PID>
```

---

## Контакты

| Роль | Контакт |
|------|---------|
| VPS | `212.119.42.249` (Timeweb) |
| Домен | `grillyage.ru` |
| Repo | `https://github.com/suicul/GrilyageV2` |

---

*Инструкция актуальна на 29 июня 2026.*
