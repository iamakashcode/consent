-- AlterTable
ALTER TABLE "pending_domains" ADD COLUMN IF NOT EXISTS "paddleTransactionId" TEXT;

-- CreateIndex (optional: speeds up webhook lookup)
CREATE INDEX IF NOT EXISTS "pending_domains_paddleTransactionId_idx" ON "pending_domains"("paddleTransactionId") WHERE "paddleTransactionId" IS NOT NULL;
