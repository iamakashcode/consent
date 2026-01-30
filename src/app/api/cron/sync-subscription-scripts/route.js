/**
 * Cron: sync CDN script with subscription status for all sites that have a subscription.
 * When subscription is active → real script on CDN; when expired/inactive → blank script.
 *
 * Call with a secret so only your cron can trigger it, e.g.:
 * GET /api/cron/sync-subscription-scripts?secret=YOUR_CRON_SECRET
 *
 * Set CRON_SECRET in .env and schedule this (e.g. every hour) in Vercel Cron or external cron.
 */

import { prisma } from "@/lib/prisma";
import { syncSiteScriptWithSubscription } from "@/lib/script-generator";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req) {
  const secret = req.nextUrl?.searchParams?.get("secret");
  const expected = process.env.CRON_SECRET;

  if (!expected || secret !== expected) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sites = await prisma.site.findMany({
    where: { subscription: { isNot: null } },
    select: { siteId: true },
  });

  const errors = [];
  let synced = 0;

  for (const site of sites) {
    try {
      await syncSiteScriptWithSubscription(site.siteId);
      synced++;
    } catch (err) {
      console.error(`[Cron] Sync failed for site ${site.siteId}:`, err);
      errors.push({ siteId: site.siteId, error: err.message });
    }
  }

  return Response.json({
    ok: true,
    synced,
    total: sites.length,
    errors: errors.length ? errors : undefined,
  });
}
