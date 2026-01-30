import { prisma } from "@/lib/prisma";
import { checkPageViewLimit } from "@/lib/subscription";
import { syncSiteScriptWithSubscription } from "@/lib/script-generator";

/**
 * Track page view when script loads on a page
 * This endpoint is called by the consent script to track page views
 */
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function POST(req, { params }) {
  try {
    // Await params as it's a Promise in Next.js
    const resolvedParams = await params;
    const { siteId } = resolvedParams;

    if (!siteId) {
      return new Response(
        JSON.stringify({ error: "Site ID is required" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // Verify site exists
    const site = await prisma.site.findUnique({
      where: { siteId },
      select: { id: true, domain: true },
    });

    if (!site) {
      return new Response(JSON.stringify({ error: "Site not found" }), {
        status: 404,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // Get page view data from request body
    const body = await req.json().catch(() => ({}));
    const { pagePath, pageTitle, userAgent, referer } = body;

    // Extract page path from URL if not provided
    let finalPagePath = pagePath || "/";
    if (!pagePath) {
      const refererUrl = referer || req.headers.get("referer");
      if (refererUrl) {
        try {
          const url = new URL(refererUrl);
          finalPagePath = url.pathname + url.search;
        } catch (e) {
          // If URL parsing fails, use the referer as-is
          finalPagePath = refererUrl;
        }
      }
    }

    // Normalize page path (remove trailing slash except for root)
    if (finalPagePath !== "/" && finalPagePath.endsWith("/")) {
      finalPagePath = finalPagePath.slice(0, -1);
    }

    // Get user agent from body or headers (kept for lastSeenAt logic; not stored per view)
    const finalUserAgent = userAgent || req.headers.get("user-agent") || null;
    const finalReferer = referer || req.headers.get("referer") || null;

    // Increment lightweight counters: total views + one row per site per month per path (for unique pages)
    const now = new Date();
    const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const pagePathStored = (finalPagePath || "/").slice(0, 2048);

    try {
      await prisma.siteViewCount.upsert({
        where: {
          siteId_periodStart: { siteId: site.id, periodStart },
        },
        create: { siteId: site.id, periodStart, count: 1 },
        update: { count: { increment: 1 }, updatedAt: now },
      });

      try {
        await prisma.sitePathViewCount.upsert({
          where: {
            siteId_periodStart_pagePath: { siteId: site.id, periodStart, pagePath: pagePathStored },
          },
          create: { siteId: site.id, periodStart, pagePath: pagePathStored, count: 1 },
          update: { count: { increment: 1 }, updatedAt: now },
        });
      } catch (pathErr) {
        if (!pathErr?.message?.includes("site_path_view_counts") && !pathErr?.message?.includes("SitePathViewCount")) {
          throw pathErr;
        }
      }

      // If view limit just exceeded, sync CDN to blank so script stops working
      checkPageViewLimit(siteId).then((viewLimit) => {
        if (viewLimit.exceeded) {
          syncSiteScriptWithSubscription(siteId).catch((err) =>
            console.error("[Track] CDN sync after view limit exceeded:", err)
          );
        }
      });

      // Update lastSeenAt to indicate script is still active
      // Check if lastSeenAt column exists
      const hasLastSeenAt = await prisma.$queryRaw`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'sites' 
        AND column_name = 'lastSeenAt'
        LIMIT 1
      `.then(result => Array.isArray(result) && result.length > 0).catch(() => false);

      if (hasLastSeenAt) {
        try {
          await prisma.site.update({
            where: { id: site.id },
            data: { lastSeenAt: new Date() },
          });
        } catch (updateError) {
          // If Prisma update fails, try raw SQL
          try {
            await prisma.$executeRaw`
              UPDATE "sites"
              SET "lastSeenAt" = NOW()
              WHERE "id" = ${site.id}
            `;
          } catch (rawSqlError) {
            // Ignore if column doesn't exist yet
            console.warn("[Track] Could not update lastSeenAt:", rawSqlError.message);
          }
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: "Page view tracked",
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        }
      );
    } catch (dbError) {
      // Graceful degradation if site_view_counts table missing
      if (
        dbError.message &&
        (dbError.message.includes("does not exist") ||
          dbError.message.includes("SiteViewCount") ||
          dbError.message.includes("site_view_counts"))
      ) {
        console.warn("[Track] SiteViewCount table not found, skipping:", dbError.message);
        return new Response(
          JSON.stringify({ success: true, message: "Page view tracking not available" }),
          { status: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
        );
      }
      throw dbError;
    }
  } catch (error) {
    console.error("Page view tracking error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Failed to track page view",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
}
