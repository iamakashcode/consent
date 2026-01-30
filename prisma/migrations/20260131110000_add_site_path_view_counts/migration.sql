-- CreateTable
CREATE TABLE IF NOT EXISTS "site_path_view_counts" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "pagePath" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "site_path_view_counts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "site_path_view_counts_siteId_periodStart_pagePath_key" ON "site_path_view_counts"("siteId", "periodStart", "pagePath");
CREATE INDEX IF NOT EXISTS "site_path_view_counts_siteId_idx" ON "site_path_view_counts"("siteId");

-- AddForeignKey
ALTER TABLE "site_path_view_counts" ADD CONSTRAINT "site_path_view_counts_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
