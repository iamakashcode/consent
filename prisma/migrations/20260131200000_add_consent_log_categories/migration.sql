-- AlterTable
ALTER TABLE "consent_logs" ADD COLUMN IF NOT EXISTS "categories" JSONB;
