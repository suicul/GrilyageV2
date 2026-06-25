# Running Grilyage on Windows 11

What your friend needs to start the project in 5 minutes.

## Step 1. Install Docker Desktop

1. Download from https://docs.docker.com/desktop/setup/install/windows-install/
2. Install, restart computer
3. Launch Docker Desktop - wait for green indicator (bottom-left)

> Docker is required for PostgreSQL (database) and Mailpit (test email).

## Step 2. Install Node.js

1. Download from https://nodejs.org/ (version **22 LTS** or newer)
2. Install (restart not required)

## Step 3. Run the project

1. Unzip the archive to any folder (**no Cyrillic or spaces in path**, e.g. `C:\Projects\Grilyage`)
2. Open the folder and **double-click** `start.bat`
3. First launch takes ~2 minutes (downloading npm packages + Docker images)
4. The **launcher** window will open - click **Quick Start**
5. Launcher will start API and Web servers, browser opens with the site

> NOTE: CMD messages will be in English (transliterated). The launcher GUI is in Russian.

## What opens

| Address | What |
|---|---|
| http://localhost:3000 | **Site** - menu, cart, order |
| http://localhost:3000/admin | **CRM** - orders, catalog, staff |
| http://localhost:4000/api/docs | **Swagger** - API docs |
| http://localhost:8025 | **Mailpit** - test email inbox |

## CRM login

- **Login**: `admin`
- **Password**: `admin123`

## Re-running

Next time just double-click `start.bat` again - it checks everything and opens the launcher.

---

## Troubleshooting

### "Node.js not found"

Install Node.js 22+ (Step 2), then restart `start.bat`.

### "Docker not found"

Install Docker Desktop (Step 1), then restart `start.bat`.

### "Docker failed. Is Docker Desktop running?"

Launch Docker Desktop manually, wait for it to be ready, then restart `start.bat`.

### Ports are busy

Other programs may use ports 3000 (Web), 4000 (API), 5432 (PostgreSQL).
Close those programs or use the launcher buttons "free 4000" / "free 3000".

### "npm install failed"

- Check internet connection
- Open CMD in the project folder and run `npm install` manually

### "Migration failed"

1. Make sure Docker Desktop is running
2. Open CMD in the project folder and run:
   ```
   docker compose -f infra\docker-compose.yml restart postgres
   ping -n 5 127.0.0.1 >nul
   npm run db:migrate
   ```

### Yandex Maps not loading

Get a free API key from https://developer.tech.yandex.ru/ and add to `.env`:
```
NEXT_PUBLIC_YANDEX_MAPS_API_KEY=your_key_here
```

---

## Minimum requirements

- **OS**: Windows 11 (x64)
- **RAM**: 8+ GB (Docker + Node + project ~4 GB)
- **Storage**: 5+ GB free
- **Internet**: required for first run (downloads Docker images + npm packages)
- **Docker Desktop** with WSL2 (installs automatically)
- **Node.js** 22+

## Project structure

```
GrilyageV2-main/
  start.bat          <- double-click this to start
  .env.example       <- settings template (auto-copied to .env)
  infra/
    docker-compose.yml   <- PostgreSQL + Mailpit
  apps/
    api/             <- NestJS API (:4000)
    web/             <- Next.js site (:3000)
    launcher/        <- Electron launcher (service manager)
  package.json
```