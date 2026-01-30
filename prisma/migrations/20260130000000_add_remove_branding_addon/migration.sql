-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "removeBrandingAddon" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "paddleAddonSubscriptionId" TEXT;
