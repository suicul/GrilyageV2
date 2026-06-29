-- Add missing columns to StaffUser: loginAttempts, lockedUntil, totpSecret, transportType, deliveryRadius, lastLatitude, lastLongitude, lastLocationAt, updatedAt
-- These fields exist in schema.prisma but were never migrated. They are required by StaffAuthService (login/lockout/2FA) and courier GPS tracking.

ALTER TABLE "StaffUser" ADD COLUMN "loginAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "StaffUser" ADD COLUMN "lockedUntil" TIMESTAMP(3);
ALTER TABLE "StaffUser" ADD COLUMN "totpSecret" TEXT;
ALTER TABLE "StaffUser" ADD COLUMN "transportType" "TransportType" NOT NULL DEFAULT 'WALKING';
ALTER TABLE "StaffUser" ADD COLUMN "deliveryRadius" INTEGER NOT NULL DEFAULT 5;
ALTER TABLE "StaffUser" ADD COLUMN "lastLatitude" DOUBLE PRECISION;
ALTER TABLE "StaffUser" ADD COLUMN "lastLongitude" DOUBLE PRECISION;
ALTER TABLE "StaffUser" ADD COLUMN "lastLocationAt" TIMESTAMP(3);
ALTER TABLE "StaffUser" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Add missing updatedAt to User model (schema.prisma has it, init migration does not)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
