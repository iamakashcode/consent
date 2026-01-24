-- Add trialEndAt column
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "trialEndAt" TIMESTAMP(3);

-- Update default plan from 'free' to 'basic' for existing records
UPDATE "subscriptions" SET "plan" = 'basic' WHERE "plan" = 'free';
