-- AlterTable: Add user-level trial fields
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "trialStartedAt" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "trialEndAt" TIMESTAMP(3);

-- AlterTable: Add billing interval to subscriptions
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "billingInterval" TEXT NOT NULL DEFAULT 'monthly';
