-- Migration: Move Subscription from User to Site (domain-based plans)
-- This changes the subscription model from account-based to domain-based

-- Step 1: Add siteId column to subscriptions (nullable for now)
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "siteId" TEXT;

-- Step 2: Create index for siteId
CREATE INDEX IF NOT EXISTS "subscriptions_siteId_idx" ON "subscriptions"("siteId");

-- Step 3: Migrate existing subscriptions to sites
-- For each user subscription, assign it to their first site
UPDATE "subscriptions" s
SET "siteId" = (
  SELECT id FROM "sites" 
  WHERE "userId" = s."userId" 
  ORDER BY "createdAt" ASC 
  LIMIT 1
)
WHERE "siteId" IS NULL AND EXISTS (
  SELECT 1 FROM "sites" WHERE "userId" = s."userId"
);

-- Step 4: Remove userId unique constraint (will be replaced by siteId unique)
ALTER TABLE "subscriptions" DROP CONSTRAINT IF EXISTS "subscriptions_userId_key";

-- Step 5: Make siteId unique and not null
-- First, delete subscriptions that couldn't be migrated (users with no sites)
DELETE FROM "subscriptions" WHERE "siteId" IS NULL;

-- Now make siteId required and unique
ALTER TABLE "subscriptions" ALTER COLUMN "siteId" SET NOT NULL;
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_siteId_key" UNIQUE ("siteId");

-- Step 6: Remove userId column and foreign key
ALTER TABLE "subscriptions" DROP CONSTRAINT IF EXISTS "subscriptions_userId_fkey";
ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "userId";

-- Step 7: Add foreign key for siteId
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_siteId_fkey" 
  FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE;
