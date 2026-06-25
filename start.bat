@echo off
chcp 65001 >nul 2>&1
title Grilyage Launcher

echo ============================================
echo    Grilyage - one-click setup
echo ============================================
echo.

:: ---- .env -----------------------------------
if not exist ".env" (
    if exist ".env.example" (
        echo [1/6] Creating .env from .env.example...
        copy .env.example .env >nul
        echo   OK
    ) else (
        echo [FAIL] .env.example not found
        pause
        exit /b 1
    )
) else (
    echo [1/6] .env exists
)

:: ---- Node.js ---------------------------------
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [FAIL] Node.js not found!
    echo     Install Node.js 22+ from https://nodejs.org
    pause
    exit /b 1
)
for /f "delims=" %%v in ('node -v') do set NODE_VER=%%v
echo [2/6] Node.js %NODE_VER%

:: ---- Docker or Native DB --------------------
where docker >nul 2>&1
if %errorlevel% neq 0 (
    echo [3/6] Docker not found, checking native PostgreSQL...
    call :detect_native_db
    if errorlevel 1 (
        echo [FAIL] Neither Docker nor PostgreSQL found.
        pause
        exit /b 1
    )
    goto :after_docker
)

docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [3/6] Docker not running, checking native PostgreSQL...
    call :detect_native_db
    if errorlevel 1 (
        echo [FAIL] Docker not running and no native PostgreSQL found.
        pause
        exit /b 1
    )
    goto :after_docker
)

echo [3/6] Docker OK

:: ---- Ensure Docker images are cached --------
echo [4/9] Checking Docker images...
docker image inspect postgres:17-alpine >nul 2>&1
if errorlevel 1 (
    echo   Pulling postgres from mirror...
    docker pull dockerhub.timeweb.cloud/library/postgres:17-alpine
    if errorlevel 1 (
        echo   Mirror failed, checking native PostgreSQL...
        call :detect_native_db
        if errorlevel 1 (
            echo [FAIL] Cannot get PostgreSQL running.
            pause
            exit /b 1
        )
        goto :after_docker
    )
    docker tag dockerhub.timeweb.cloud/library/postgres:17-alpine postgres:17-alpine
)

docker image inspect axllent/mailpit:latest >nul 2>&1
if errorlevel 1 (
    docker pull dockerhub.timeweb.cloud/axllent/mailpit:latest
    if not errorlevel 1 (
        docker tag dockerhub.timeweb.cloud/axllent/mailpit:latest axllent/mailpit:latest
    )
)

echo   Starting PostgreSQL and Mailpit...
docker compose -f infra\docker-compose.yml up -d
if errorlevel 1 (
    echo [FAIL] Docker compose failed.
    pause
    exit /b 1
)

echo   Waiting for PostgreSQL...
ping -n 8 127.0.0.1 >nul

:after_docker

:: ---- npm install -----------------------------
echo [5/9] Installing dependencies...
if not exist "node_modules" (
    call npm install
    if errorlevel 1 (
        echo [FAIL] npm install failed
        pause
        exit /b 1
    )
) else (
    echo   skip, already installed
)

:: ---- Build shared package -------------------
echo [6/9] Building shared package...
pushd packages\shared
call npx tsc
if errorlevel 1 (
    echo [FAIL] Shared package build failed
    popd
    pause
    exit /b 1
)
popd
echo   OK

:: ---- Generate Prisma Client -----------------
echo [7/9] Generating Prisma client...
call npx prisma generate --schema=apps/api/prisma/schema.prisma
if errorlevel 1 (
    echo [FAIL] Prisma generate failed
    pause
    exit /b 1
)
echo   OK

:: ---- Migrate and Seed ------------------------
echo [8/9] Running migrations...
call npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma
if errorlevel 1 (
    echo   Trying migrate dev instead...
    call npx prisma migrate dev --schema=apps/api/prisma/schema.prisma
    if errorlevel 1 (
        echo [FAIL] Migration failed
        pause
        exit /b 1
    )
)

echo [9/9] Seeding database...
call npx prisma db seed --schema=apps/api/prisma/schema.prisma
if errorlevel 1 (
    echo [FAIL] Seed failed
    pause
    exit /b 1
)

echo.
echo ============================================
echo   All done!
echo   Run 'npm run dev' to start the site.
echo   Or open the launcher below:
echo ============================================
echo.

:: ---- Launcher --------------------------------
call npm run launcher

echo.
echo Launcher closed.
pause
exit /b 0

:: --- Native PostgreSQL detection ---
:detect_native_db
    where psql >nul 2>&1
    if not errorlevel 1 goto :check_pg
    if exist "C:\Program Files\PostgreSQL\17\bin\psql.exe" (
        echo   Found PostgreSQL 17
        set "PATH=C:\Program Files\PostgreSQL\17\bin;%PATH%"
        goto :check_pg
    )
    if exist "C:\Program Files\PostgreSQL\16\bin\psql.exe" (
        echo   Found PostgreSQL 16
        set "PATH=C:\Program Files\PostgreSQL\16\bin;%PATH%"
        goto :check_pg
    )
    exit /b 1
:check_pg
    pg_isready -h localhost >nul 2>&1
    if errorlevel 1 (
        echo   PostgreSQL not running.
        exit /b 1
    )
    echo   PostgreSQL is running on localhost.
    exit /b 0
