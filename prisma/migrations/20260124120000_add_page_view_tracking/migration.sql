-- CreateTable
CREATE TABLE IF NOT EXISTS "page_views" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "pagePath" TEXT NOT NULL,
    "pageTitle" TEXT,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userAgent" TEXT,
    "referer" TEXT,

    CONSTRAINT "page_views_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "page_views_siteId_viewedAt_idx" ON "page_views"("siteId", "viewedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "page_views_siteId_pagePath_idx" ON "page_views"("siteId", "pagePath");

-- AddForeignKey
ALTER TABLE "page_views" ADD CONSTRAINT "page_views_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
