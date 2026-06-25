# Monitoring Plan — Проект «Грильяж»

> **Дата:** июнь 2026  
> **Целевая платформа:** Ubuntu 24.04 VPS (Timeweb)  
> **Uptime SLA:** ≥ 99.5%  
> **Статус:** ACTIVE

---

## 1. Обзор стратегии мониторинга

### 1.1. Цели

| Метрика | Значение | Описание |
|---------|----------|----------|
| **Uptime** | ≥ 99.5% | ≤ 43 часа простоя в год |
| **Error rate** | ≤ 0.5% | Процент запросов с ошибками |
| **Response time p95** | ≤ 500ms | 95-й перцентиль времени ответа API |
| **MTTR** (Mean Time To Recovery) | ≤ 15 мин | Среднее время восстановления |
| **MTTD** (Mean Time To Detect) | ≤ 5 мин | Среднее время обнаружения проблемы |

### 1.2. Стек технологий

| Компонент | Инструмент | Назначение |
|-----------|------------|------------|
| **Metrics collection** | Prometheus | Сбор метрик |
| **Log aggregation** | Loki + Promtail | Сбор и хранение логов |
| **Visualization** | Grafana | Dashboards и графики |
| **Error tracking** | Sentry | Отслеживание ошибок в приложениях |
| **Alerting** | Prometheus Alertmanager | Уведомления о проблемах |
| **Uptime monitoring** | UptimeRobot / Better Stack | Внешний мониторинг доступности |

### 1.3. Архитектура

```
┌─────────────────────────────────────────────────────────────┐
│                        Applications                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │   API    │  │   Web    │  │  Mobile  │  │ Courier  │   │
│  │ (NestJS) │  │ (Next.js)│  │ (Flutter)│  │ (Flutter)│   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
│       │              │              │              │          │
│       └──────────────┴──────────────┴──────────────┘          │
│                          │                                    │
│                          ▼                                    │
│              ┌───────────────────────┐                        │
│              │  Sentry (Error Track) │                        │
│              └───────────────────────┘                        │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                      Infrastructure                          │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Prometheus  │  │     Loki     │  │   Promtail   │      │
│  │   (Metrics)  │  │    (Logs)    │  │  (Log Agent) │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                 │                │
│         └─────────────────┴─────────────────┘                │
│                           │                                  │
│                           ▼                                  │
│              ┌───────────────────────┐                        │
│              │       Grafana         │                        │
│              │   (Visualization)     │                        │
│              └───────────┬───────────┘                        │
│                          │                                   │
│                          ▼                                   │
│              ┌───────────────────────┐                        │
│              │   Alertmanager        │                        │
│              │  (Notifications)      │                        │
│              └───────────┬───────────┘                        │
│                          │                                   │
│                          ▼                                   │
│         ┌────────────────┼────────────────┐                  │
│         ▼                ▼                ▼                  │
│    ┌─────────┐     ┌─────────┐     ┌─────────┐             │
│    │  Email  │     │Telegram │     │  Slack  │             │
│    └─────────┘     └─────────┘     └─────────┘             │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Metrics Collection (Prometheus)

### 2.1. Источники метрик

| Источник | Endpoint | Частота | Метрики |
|----------|----------|---------|---------|
| **Node Exporter** | `:9100/metrics` | 15s | CPU, memory, disk, network |
| **cAdvisor** | `:8080/metrics` | 15s | Docker containers (CPU, memory, network) |
| **PostgreSQL Exporter** | `:9187/metrics` | 15s | DB connections, queries, transactions |
| **Nginx Exporter** | `:9113/metrics` | 15s | Requests, connections, latency |
| **API (NestJS)** | `:4000/metrics` | 15s | HTTP requests, latency, errors |
| **Web (Next.js)** | `:3000/metrics` | 15s | Page loads, SSR time, errors |

### 2.2. Prometheus configuration

**Файл:** `infra/prometheus/prometheus.yml`

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alert_rules.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']

  - job_name: 'cadvisor'
    static_configs:
      - targets: ['cadvisor:8080']

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']

  - job_name: 'nginx'
    static_configs:
      - targets: ['nginx-exporter:9113']

  - job_name: 'api'
    static_configs:
      - targets: ['api:4000']
    metrics_path: '/metrics'

  - job_name: 'web'
    static_configs:
      - targets: ['web:3000']
    metrics_path: '/metrics'
```

### 2.3. Docker Compose (monitoring stack)

**Файл:** `infra/docker-compose.monitoring.yml`

```yaml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    container_name: grilyage-prometheus
    volumes:
      - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
      - ./prometheus/alert_rules.yml:/etc/prometheus/alert_rules.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--storage.tsdb.retention.time=30d'
    ports:
      - "9090:9090"
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    container_name: grilyage-grafana
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana/provisioning:/etc/grafana/provisioning
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_ADMIN_PASSWORD}
      - GF_USERS_ALLOW_SIGN_UP=false
    ports:
      - "3001:3000"
    restart: unless-stopped

  loki:
    image: grafana/loki:latest
    container_name: grilyage-loki
    volumes:
      - ./loki/loki.yml:/etc/loki/local-config.yaml
      - loki_data:/loki
    command: -config.file=/etc/loki/local-config.yaml
    ports:
      - "3100:3100"
    restart: unless-stopped

  promtail:
    image: grafana/promtail:latest
    container_name: grilyage-promtail
    volumes:
      - ./promtail/promtail.yml:/etc/promtail/config.yml
      - /var/log:/var/log
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
      - /var/run/docker.sock:/var/run/docker.sock
    command: -config.file=/etc/promtail/config.yml
    restart: unless-stopped

  node-exporter:
    image: prom/node-exporter:latest
    container_name: grilyage-node-exporter
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    command:
      - '--path.procfs=/host/proc'
      - '--path.sysfs=/host/sys'
      - '--path.rootfs=/rootfs'
    ports:
      - "9100:9100"
    restart: unless-stopped

  cadvisor:
    image: gcr.io/cadvisor/cadvisor:latest
    container_name: grilyage-cadvisor
    volumes:
      - /:/rootfs:ro
      - /var/run:/var/run:ro
      - /sys:/sys:ro
      - /var/lib/docker/:/var/lib/docker:ro
    ports:
      - "8080:8080"
    restart: unless-stopped

  postgres-exporter:
    image: prometheuscommunity/postgres-exporter:latest
    container_name: grilyage-postgres-exporter
    environment:
      - DATA_SOURCE_NAME=postgresql://grilyage:${POSTGRES_PASSWORD}@postgres:5432/grilyage?sslmode=disable
    ports:
      - "9187:9187"
    restart: unless-stopped

  alertmanager:
    image: prom/alertmanager:latest
    container_name: grilyage-alertmanager
    volumes:
      - ./alertmanager/alertmanager.yml:/etc/alertmanager/alertmanager.yml
    ports:
      - "9093:9093"
    restart: unless-stopped

volumes:
  prometheus_data:
  grafana_data:
  loki_data:
```

---

## 3. Log Aggregation (Loki + Promtail)

### 3.1. Promtail configuration

**Файл:** `infra/promtail/promtail.yml`

```yaml
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: docker
    static_configs:
      - targets:
          - localhost
        labels:
          job: docker
          __path__: /var/lib/docker/containers/*/*-json.log

    pipeline_stages:
      - docker: {}
      - labels:
          container_name:
          stream:
      - timestamp:
          source: time
          format: RFC3339Nano

  - job_name: system
    static_configs:
      - targets:
          - localhost
        labels:
          job: syslog
          __path__: /var/log/syslog
```

### 3.2. Log format (structured JSON)

**API (NestJS) — StructuredLogger:**

```json
{
  "timestamp": "2026-06-24T10:30:45.123Z",
  "level": "info",
  "message": "Order created",
  "service": "api",
  "requestId": "abc-123-def-456",
  "userId": "user_123",
  "orderId": 42,
  "method": "POST",
  "url": "/api/v1/orders",
  "status": 201,
  "duration": 145
}
```

**Web (Next.js) — console.log:**

```json
{
  "timestamp": "2026-06-24T10:30:45.123Z",
  "level": "info",
  "message": "Page rendered",
  "service": "web",
  "page": "/menu",
  "duration": 234
}
```

### 3.3. Log queries (Loki)

**Все ошибки API:**

```logql
{job="docker", container_name="grilyage-api"} | json | level="error"
```

**Запросы с latency > 1s:**

```logql
{job="docker", container_name="grilyage-api"} | json | duration > 1000
```

**Ошибки аутентификации:**

```logql
{job="docker", container_name="grilyage-api"} | json | message=~".*Unauthorized.*"
```

**WebSocket connections:**

```logql
{job="docker", container_name="grilyage-api"} | json | message=~".*connected.*"
```

---

## 4. Error Tracking (Sentry)

### 4.1. API (NestJS) integration

**Файл:** `apps/api/src/main.ts`

```typescript
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV ?? 'production',
  tracesSampleRate: 0.1, // 10% для performance monitoring
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Sentry.Integrations.Prisma({ client: prisma }),
  ],
});

// Error handler
app.use(Sentry.Handlers.errorHandler());
```

### 4.2. Web (Next.js) integration

**Файл:** `apps/web/sentry.client.config.ts`

```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV ?? 'production',
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  integrations: [
    new Sentry.Replay(),
  ],
});
```

### 4.3. Alert rules (Sentry)

| Правило | Условие | Действие |
|---------|---------|----------|
| **Error spike** | > 50 errors за 5 мин | Email + Telegram |
| **New error** | Первый раз за 24 часа | Email |
| **Critical error** | Level = fatal | Email + Telegram + SMS |
| **Performance degradation** | p95 > 2s за 5 мин | Email |

---

## 5. Alerting (Prometheus Alertmanager)

### 5.1. Alert rules

**Файл:** `infra/prometheus/alert_rules.yml`

```yaml
groups:
  - name: infrastructure
    rules:
      - alert: HighCPUUsage
        expr: 100 - (avg by(instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 70
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage on {{ $labels.instance }}"
          description: "CPU usage is above 70% for 5 minutes (current: {{ $value }}%)"

      - alert: HighMemoryUsage
        expr: (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100 > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage on {{ $labels.instance }}"
          description: "Memory usage is above 80% for 5 minutes (current: {{ $value }}%)"

      - alert: DiskSpaceLow
        expr: (node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"}) * 100 < 10
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Low disk space on {{ $labels.instance }}"
          description: "Less than 10% disk space remaining (current: {{ $value }}%)"

      - alert: InstanceDown
        expr: up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Instance {{ $labels.instance }} down"
          description: "{{ $labels.instance }} has been down for more than 1 minute"

  - name: application
    rules:
      - alert: HighErrorRate
        expr: (rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m])) * 100 > 1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate on {{ $labels.instance }}"
          description: "Error rate is above 1% for 5 minutes (current: {{ $value }}%)"

      - alert: HighResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High response time on {{ $labels.instance }}"
          description: "95th percentile response time is above 1s for 5 minutes (current: {{ $value }}s)"

      - alert: APIHealthCheckFailed
        expr: probe_success{job="api_health"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "API health check failed"
          description: "API health check has been failing for more than 1 minute"

  - name: database
    rules:
      - alert: PostgreSQLDown
        expr: pg_up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "PostgreSQL is down"
          description: "PostgreSQL has been down for more than 1 minute"

      - alert: PostgreSQLHighConnections
        expr: pg_stat_activity_count / pg_settings_max_connections * 100 > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "PostgreSQL high connection usage"
          description: "PostgreSQL connections are above 80% of max (current: {{ $value }}%)"

      - alert: PostgreSQLSlowQueries
        expr: rate(pg_stat_activity_max_tx_duration{datname="grilyage"}[5m]) > 10
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "PostgreSQL slow queries"
          description: "PostgreSQL has queries running longer than 10s for 5 minutes"

  - name: backup
    rules:
      - alert: BackupFailed
        expr: grilyage_backup_success == 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Backup failed"
          description: "PostgreSQL backup failed at {{ $labels.instance }}"

      - alert: BackupTooOld
        expr: time() - grilyage_backup_last_success_timestamp > 7200
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Backup is older than 2 hours"
          description: "Last successful backup was {{ $value }}s ago"
```

### 5.2. Alertmanager configuration

**Файл:** `infra/alertmanager/alertmanager.yml`

```yaml
global:
  smtp_smarthost: 'smtp.gmail.com:587'
  smtp_from: 'alertmanager@grillyage.ru'
  smtp_auth_username: 'alertmanager@grillyage.ru'
  smtp_auth_password: '${SMTP_PASSWORD}'

route:
  group_by: ['alertname', 'severity']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  receiver: 'default'
  routes:
    - match:
        severity: critical
      receiver: 'critical'
    - match:
        severity: warning
      receiver: 'warning'

receivers:
  - name: 'default'
    email_configs:
      - to: 'devops@grillyage.ru'

  - name: 'warning'
    email_configs:
      - to: 'devops@grillyage.ru'
    telegram_configs:
      - api_url: 'https://api.telegram.org'
        bot_token: '${TELEGRAM_BOT_TOKEN}'
        chat_id: '${TELEGRAM_CHAT_ID}'
        message: |
          ⚠️ Warning: {{ .GroupLabels.alertname }}
          {{ range .Alerts }}
          {{ .Annotations.summary }}
          {{ .Annotations.description }}
          {{ end }}

  - name: 'critical'
    email_configs:
      - to: 'devops@grillyage.ru'
      - to: 'cto@grillyage.ru'
    telegram_configs:
      - api_url: 'https://api.telegram.org'
        bot_token: '${TELEGRAM_BOT_TOKEN}'
        chat_id: '${TELEGRAM_CHAT_ID}'
        message: |
          🚨 Critical: {{ .GroupLabels.alertname }}
          {{ range .Alerts }}
          {{ .Annotations.summary }}
          {{ .Annotations.description }}
          {{ end }}

inhibit_rules:
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning'
    equal: ['alertname', 'instance']
```

---

## 6. Dashboards (Grafana)

### 6.1. Pre-built dashboards

| Dashboard | ID | Описание |
|-----------|-----|----------|
| **Node Exporter Full** | 1860 | CPU, memory, disk, network |
| **Docker Container** | 893 | Docker containers metrics |
| **PostgreSQL Database** | 9628 | PostgreSQL performance |
| **Nginx** | 12559 | Nginx requests, connections |
| **API Performance** | Custom | HTTP requests, latency, errors |
| **Business Metrics** | Custom | Orders, users, revenue |

### 6.2. Custom dashboard: API Performance

**Panels:**

1. **Request Rate** (Time series)
   ```promql
   rate(http_requests_total[5m])
   ```

2. **Error Rate** (Time series)
   ```promql
   (rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m])) * 100
   ```

3. **Response Time p95** (Time series)
   ```promql
   histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
   ```

4. **Top Endpoints by Latency** (Table)
   ```promql
   topk(10, histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])))
   ```

5. **Active WebSocket Connections** (Stat)
   ```promql
   websocket_connections_active
   ```

### 6.3. Custom dashboard: Business Metrics

**Panels:**

1. **Orders per Hour** (Time series)
   ```promql
   rate(grilyage_orders_total[1h])
   ```

2. **Revenue per Day** (Stat)
   ```promql
   sum(grilyage_order_total_amount) by (day)
   ```

3. **Active Users** (Stat)
   ```promql
   grilyage_active_users_total
   ```

4. **Order Status Distribution** (Pie chart)
   ```promql
   sum(grilyage_orders_total) by (status)
   ```

5. **Average Order Value** (Stat)
   ```promql
   avg(grilyage_order_total_amount)
   ```

---

## 7. Uptime Monitoring

### 7.1. Внешний мониторинг

| Сервис | Endpoint | Частота | Локации |
|--------|----------|---------|---------|
| **UptimeRobot** | `https://grillyage.ru/health` | 1 мин | 5 локаций |
| **Better Stack** | `https://grillyage.ru/api/v1/categories` | 5 мин | 3 локации |

### 7.2. Health check endpoint

**Файл:** `apps/api/src/health/health.controller.ts`

```typescript
@Controller()
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: PrismaHealthIndicator,
    private redis: RedisHealthIndicator,
  ) {}

  @Get('health')
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.db.pingCheck('database'),
      () => this.redis.pingCheck('redis'),
    ]);
  }
}
```

**Response:**

```json
{
  "status": "ok",
  "info": {
    "database": { "status": "up" },
    "redis": { "status": "up" }
  },
  "error": {},
  "details": {
    "database": { "status": "up" },
    "redis": { "status": "up" }
  }
}
```

---

## 8. On-call Runbook

### 8.1. High CPU Usage

**Симптомы:**
- Алерт: `HighCPUUsage`
- Grafana: CPU > 70% за 5 мин

**Действия:**

1. Проверить, какой процесс использует CPU:
   ```bash
   docker stats --no-stream
   ```

2. Проверить логи API:
   ```bash
   docker logs grilyage-api --tail 100
   ```

3. Проверить PostgreSQL queries:
   ```bash
   docker exec grilyage-postgres psql -U grilyage -c "SELECT pid, now() - pg_stat_activity.query_start AS duration, query FROM pg_stat_activity WHERE state = 'active' ORDER BY duration DESC LIMIT 10;"
   ```

4. Если проблема в API — увеличить replicas или оптимизировать код
5. Если проблема в PostgreSQL — проверить индексы, N+1 queries

### 8.2. High Error Rate

**Симптомы:**
- Алерт: `HighErrorRate`
- Grafana: Error rate > 1% за 5 мин

**Действия:**

1. Проверить Sentry:
   - Открыть dashboard
   - Найти топ ошибок
   - Проверить stack traces

2. Проверить логи:
   ```bash
   docker logs grilyage-api --tail 100 | grep ERROR
   ```

3. Проверить Loki:
   ```logql
   {job="docker", container_name="grilyage-api"} | json | level="error"
   ```

4. Если ошибка в коде — откатить последний деплой:
   ```bash
   git checkout previous-release-tag
   docker compose -f infra/docker-compose.prod.yml build api
   docker compose -f infra/docker-compose.prod.yml up -d api
   ```

### 8.3. Database Down

**Симптомы:**
- Алерт: `PostgreSQLDown`
- Health check: `database: down`

**Действия:**

1. Проверить контейнер:
   ```bash
   docker ps | grep postgres
   docker logs grilyage-postgres --tail 50
   ```

2. Перезапустить PostgreSQL:
   ```bash
   docker compose -f infra/docker-compose.prod.yml restart postgres
   ```

3. Если не запускается — восстановить из backup:
   ```bash
   # См. backup-strategy.md §6.1
   ```

4. Проверить disk space:
   ```bash
   df -h
   ```

### 8.4. API Down

**Симптомы:**
- Алерт: `APIHealthCheckFailed`
- UptimeRobot: API недоступен

**Действия:**

1. Проверить контейнер:
   ```bash
   docker ps | grep api
   docker logs grilyage-api --tail 50
   ```

2. Перезапустить API:
   ```bash
   docker compose -f infra/docker-compose.prod.yml restart api
   ```

3. Проверить health:
   ```bash
   curl https://grillyage.ru/health
   ```

4. Если не помогает — проверить логи, откатить деплой

---

## 9. Контакты и эскалация

| Роль | Имя | Контакт | Время реакции |
|------|-----|---------|---------------|
| **DevOps** | — | Telegram / Phone | 15 мин (P0) |
| **Backend** | — | Telegram / Phone | 30 мин (P0) |
| **CTO** | — | Email / Phone | 24 часа (P2) |

**Escalation matrix:**

| Severity | Время реакции | Кто реагирует |
|----------|---------------|---------------|
| **Critical** | 15 мин | DevOps + Backend |
| **Warning** | 1 час | DevOps |
| **Info** | 24 часа | Backend |

---

*Monitoring plan создан на основе AI_CTO.md §9, §13, implementation-roadmap.md. Дата: июнь 2026.*
