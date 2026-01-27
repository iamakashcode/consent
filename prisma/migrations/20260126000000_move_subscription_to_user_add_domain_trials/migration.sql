-- Migration: Move Subscription from Site to User and Add Domain Trials
-- This changes the subscription model from domain-based to user-based
-- Each user has one subscription, and each domain gets its own trial period

-- Step 1: Add trial fields to sites table
ALTER TABLE "sites" ADD COLUMN IF NOT EXISTS "trialEndAt" TIMESTAMP;
ALTER TABLE "sites" ADD COLUMN IF NOT EXISTS "trialStartedAt" TIMESTAMP;

-- Step 2: Add userId column back to subscriptions (nullable for now)
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "userId" TEXT;

-- Step 3: Create index for userId
CREATE INDEX IF NOT EXISTS "subscriptions_userId_idx" ON "subscriptions"("userId");

-- Step 4: Migrate existing subscriptions from sites to users
-- For each site subscription, assign it to the site's user
UPDATE "subscriptions" s
SET "userId" = (
  SELECT "userId" FROM "sites"
  WHERE "id" = s."siteId"
)
WHERE "userId" IS NULL;

-- Step 5: Remove siteId unique constraint (will be replaced by userId unique)
ALTER TABLE "subscriptions" DROP CONSTRAINT IF EXISTS "subscriptions_siteId_key";

-- Step 6: Make userId unique and not null
-- First, delete subscriptions that couldn't be migrated
DELETE FROM "subscriptions" WHERE "userId" IS NULL;

-- Now make userId required and unique
ALTER TABLE "subscriptions" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_userId_key" UNIQUE ("userId");

-- Step 7: Remove siteId column and foreign key
ALTER TABLE "subscriptions" DROP CONSTRAINT IF EXISTS "subscriptions_siteId_fkey";
ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "siteId";

-- Step 8: Add foreign key for userId
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE;

-- Step 9: Remove trialEndAt from subscriptions (now handled per domain)
ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "trialEndAt";