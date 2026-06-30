-- Add missing enum types that exist in schema.prisma but were never created by init migration.
-- These were likely applied via `prisma db push` in dev, but `prisma migrate deploy` on a
-- fresh database (CI, new staging) would fail without them.
DO $$ BEGIN
    CREATE TYPE "TransportType" AS ENUM ('WALKING', 'CAR');
EXCEPTION WHEN duplicate_object THEN null END $$;
DO $$ BEGIN
    CREATE TYPE "ChatRoomStatus" AS ENUM ('OPEN', 'ASSIGNED', 'CLOSED');
EXCEPTION WHEN duplicate_object THEN null END $$;
DO $$ BEGIN
    CREATE TYPE "CallStatus" AS ENUM ('QUEUED', 'CONNECTING', 'ACTIVE', 'ENDED');
EXCEPTION WHEN duplicate_object THEN null END $$;
DO $$ BEGIN
    CREATE TYPE "PreorderStatus" AS ENUM ('NEW', 'CONFIRMED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN null END $$;

-- Add missing columns to StaffUser: loginAttempts, lockedUntil, totpSecret, transportType, deliveryRadius, lastLatitude, lastLongitude, lastLocationAt, updatedAt
-- These fields exist in schema.prisma but were never migrated. They are required by StaffAuthService (login/lockout/2FA) and courier GPS tracking.
-- IF NOT EXISTS guards against environments where `prisma db push` already added them.

ALTER TABLE "StaffUser" ADD COLUMN IF NOT EXISTS "loginAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "StaffUser" ADD COLUMN IF NOT EXISTS "lockedUntil" TIMESTAMP(3);
ALTER TABLE "StaffUser" ADD COLUMN IF NOT EXISTS "totpSecret" TEXT;
ALTER TABLE "StaffUser" ADD COLUMN IF NOT EXISTS "transportType" "TransportType" NOT NULL DEFAULT 'WALKING';
ALTER TABLE "StaffUser" ADD COLUMN IF NOT EXISTS "deliveryRadius" INTEGER NOT NULL DEFAULT 5;
ALTER TABLE "StaffUser" ADD COLUMN IF NOT EXISTS "lastLatitude" DOUBLE PRECISION;
ALTER TABLE "StaffUser" ADD COLUMN IF NOT EXISTS "lastLongitude" DOUBLE PRECISION;
ALTER TABLE "StaffUser" ADD COLUMN IF NOT EXISTS "lastLocationAt" TIMESTAMP(3);
ALTER TABLE "StaffUser" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Add missing updatedAt to User model (schema.prisma has it, init migration does not)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
