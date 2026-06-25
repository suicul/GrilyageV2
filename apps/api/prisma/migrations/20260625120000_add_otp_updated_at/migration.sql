-- Add updatedAt column for exponential OTP backoff tracking
ALTER TABLE "OtpCode" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
