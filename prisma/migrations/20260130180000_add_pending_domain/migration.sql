-- CreateTable
CREATE TABLE IF NOT EXISTS "pending_domains" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "trackers" JSONB NOT NULL DEFAULT '[]',
    "verificationToken" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'basic',
    "billingInterval" TEXT NOT NULL DEFAULT 'monthly',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pending_domains_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "pending_domains_siteId_key" ON "pending_domains"("siteId");
CREATE UNIQUE INDEX IF NOT EXISTS "pending_domains_userId_domain_key" ON "pending_domains"("userId", "domain");

-- AddForeignKey
ALTER TABLE "pending_domains" ADD CONSTRAINT "pending_domains_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
