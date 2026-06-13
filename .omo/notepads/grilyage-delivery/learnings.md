# Learnings � grilyage-delivery

## 2026-06-11 Task 1.1: NestJS scaffold
- NestJS scaffold complete (ConfigModule, PrismaModule, HealthModule)
- Build passes (npm run build)
- Docker containers running (postgres:17, mailpit)
- Schema fully defined in prisma/schema.prisma
- Missing: seed.ts

## 2026-06-12 Task 1.2: Prisma migration + seed
- Prisma migration `init` created successfully (11 tables, all enums, FK constraints)
- seed.ts created with 5 categories, 18+ subcategories, 30+ products, admin user, 2 promotions
- Database seeded cleanly: output shows all ✓
- Build passes
- Created apps/api/.env for prisma to find DATABASE_URL
- Created prisma.config.ts for Prisma 6 deprecation fix
- Note: subagent system (Tokenator/gemini-3.5-flash) fails consistently (empty responses / no-op). Had to execute seed.ts and prisma commands directly.
## [2026-06-13 19:28] Authentication Fix - Proxy & Localization

- **Root cause of 'Ошибка входа'**: Two next.config files existed (next.config.ts with proxy rewrites + next.config.mjs without). Next.js loads .mjs, so API proxy returned 404 on all /api/v1/* requests. Frontend got HTML 404 page, res.json() failed, fell back to generic 'Ошибка входа'.
- **Fix**: Merged both configs into next.config.mjs, deleted next.config.ts
- **Localization**: Changed all auth error messages from English to Russian (26 error strings across auth.service.ts, staff-auth.service.ts, jwt.strategy.ts, staff-jwt.strategy.ts)
- **Verified**: Login/register/me/staff-login all return 200 with tokens through proxy; bad credentials return 401 with 'Неверный email или пароль'; duplicate returns 409 with 'Этот email уже зарегистрирован'
- **curl on Windows**: Must use --connect-timeout 5 --max-time 10 and pass JSON via file -d @file.json to avoid PowerShell escaping issues
## [2026-06-13 19:30] Created AGENTS.md

- Defined 6 agents (Auth Architect, Frontend Engineer, API Builder, Database Guardian, Launcher Dev, QA Oracle)
- Documented architectural constants (prices in kopecks, two auth domains, Russian API messages)
- Specified inter-agent contracts (Auth↔Frontend staff login) and development order
## [2026-06-13 19:45] Localized remaining API errors to Russian

- Fixed 17 English error messages across 4 files + 1 guard + 1 test file
- Files updated: profile.service.ts, catalog.service.ts, admin.service.ts (+spec), orders.service.ts, staff-roles.guard.ts
- All API error messages now in Russian (AGENTS.md compliance)
- Build passes (tsc --noEmit OK)
- Subagent (quick category) failed to make edits twice — had to do string replacements directly
## [2026-06-13 20:10] Phase 6.1-6.2 — Production infra scaffold

- Created apps/api/Dockerfile (multi-stage build: node:22-alpine builder + slim production, non-root user, healthcheck)
- Created apps/web/Dockerfile (multi-stage: deps/builder/runner, standalone output, non-root user)
- Created infra/docker-compose.prod.yml (postgres+api+web+nginx, internal network, no exposed postgres)
- Created infra/nginx/nginx.conf (reverse proxy, gzip, rate-limit on auth, security headers, WS support)
- Updated next.config.mjs: added output: 'standalone' for Docker support
- Build passes, all previous fixes verified
## [2026-06-13 20:48] CRM CRUD + Yandex Map + Social stubs

- **CRM CRUD (item 6)**: admin/catalog/page.tsx — complete product CRUD with modal form (name, desc, price, weight, KBZHU, subcategory, image, isNew, active). admin/promotions/page.tsx — complete promotion CRUD (title, desc, discount %, date range, active toggle, delete)
- **Yandex Map (item 8)**: Added .map-section before footer with Yandex Maps iframe embed (Omsk, Kharkovskaya 7 coords) + overlay with address/hours. CSS for responsive map section in globals.css
- **VK/TG/MAX stubs (item 8)**: Created /social/[network]/page.tsx — themed stub pages with gradient backgrounds, icons, "СКОРО ЗДЕСЬ БУДЕТ ССЫЛКА" message. Footer links updated to /social/vk, /social/tg, /social/max
- **TypeScript fix**: Moved `const { user } = useAuth()` before the useEffect that depends on it (hoisting error TS2448)
- **Social icons styling**: Updated footer social links with colored backgrounds per mockup (VK #2787f5, TG #27a7e7, MAX radial-gradient)
