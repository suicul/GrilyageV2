@echo off
chcp 65001 >nul
title Грильяж — Запуск

echo ═══════════════════════════════════════════
echo     Грильяж — Запуск проекта
echo ═══════════════════════════════════════════
echo.

:: ─── .env ────────────────────────────────────
if not exist ".env" (
    if exist ".env.example" (
        echo [1/6] Создание .env из .env.example...
        copy .env.example .env >nul
        echo   ✓ .env создан
    ) else (
        echo [✕] .env.example не найден. Скопируйте .env.example в .env вручную.
        pause
        exit /b 1
    )
) else (
    echo [1/6] .env уже существует
)

:: ─── Node.js ─────────────────────────────────
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [✕] Node.js не найден!
    echo     Установите Node.js 22+ с https://nodejs.org
    echo     После установки перезапустите этот скрипт
    pause
    exit /b 1
)
for /f "delims=" %%v in ('node -v') do set NODE_VER=%%v
echo [2/6] Node.js %NODE_VER%

:: ─── Docker ──────────────────────────────────
where docker >nul 2>&1
if %errorlevel% neq 0 (
    echo [✕] Docker не найден!
    echo     Установите Docker Desktop с https://docker.com
    echo     После установки перезапустите этот скрипт
    pause
    exit /b 1
)
echo [3/6] Docker
echo.

:: ─── npm install ─────────────────────────────
echo [4/6] Установка зависимостей...
if not exist "node_modules" (
    call npm install
    if %errorlevel% neq 0 (
        echo [✕] npm install не удался
        pause
        exit /b 1
    )
) else (
    echo   — уже установлены (пропускаем)
)

:: ─── Docker Compose ──────────────────────────
echo [5/6] Запуск PostgreSQL и Mailpit...
docker compose -f infra\docker-compose.yml up -d
if %errorlevel% neq 0 (
    echo [✕] Ошибка запуска Docker. Проверьте, что Docker Desktop запущен.
    pause
    exit /b 1
)
echo   — ждём PostgreSQL...
ping -n 8 127.0.0.1 >nul

:: ─── Миграция и сид ──────────────────────────
echo [6/6] Подготовка базы данных...
call npm run db:migrate
if %errorlevel% neq 0 (
    echo [✕] Миграция не удалась
    pause
    exit /b 1
)
call npm run db:seed
if %errorlevel% neq 0 (
    echo [✕] Сид не удался
    pause
    exit /b 1
)

echo.
echo ═══════════════════════════════════════════
echo   Всё готово!
echo   Открывается лаунчер — нажмите
echo   «Быстрый старт» чтобы запустить сайт.
echo ═══════════════════════════════════════════
echo.

:: ─── Лаунчер ─────────────────────────────────
call npm run launcher

echo.
echo Лаунчер закрыт. Для повторного запуска
echo просто откройте этот файл снова.
pause
