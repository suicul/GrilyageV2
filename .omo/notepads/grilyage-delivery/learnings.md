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
