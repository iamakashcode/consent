-- Add phone, countryCode, websiteUrl, email verification and reset token fields to users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "countryCode" TEXT DEFAULT '+49';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "websiteUrl" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "otp" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "otpExpiresAt" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "verifyToken" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "verifyTokenExpiresAt" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "resetToken" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "resetTokenExpiresAt" TIMESTAMP(3);

-- Existing users (no OTP flow) are considered verified so they can still log in
UPDATE "users" SET "emailVerified" = true WHERE "otp" IS NULL;
