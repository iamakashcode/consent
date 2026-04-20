import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { hasVerificationColumns } from "@/lib/db-utils";
import { isSubscriptionActive, checkPageViewLimit } from "@/lib/subscription";

/**
 * GET /api/sites/[siteId]/script-status
 * Check if the consent script is installed and active on the domain.
 * Script is considered "installed" when: domain is verified AND we received a ping (lastSeenAt) in the last 48 hours.
 */
export async function GET(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const { siteId } = resolvedParams;
    if (!siteId) {
      return Response.json({ error: "Site ID is required" }, { status: 400 });
    }

    const verificationColumns = await hasVerificationColumns();
    const hasLastSeenAt = await prisma.$queryRaw`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'sites'
      AND column_name = 'lastSeenAt'
      LIMIT 1
    `.then((result) => Array.isArray(result) && result.length > 0).catch(() => false);

    const site = await prisma.site.findFirst({
      where: {
        OR: [{ siteId }, { id: siteId }],
        userId: session.user.id,
      },
      select: {
        id: true,
        siteId: true,
        domain: true,
        ...(verificationColumns.allExist ? { isVerified: true } : {}),
        ...(hasLastSeenAt ? { lastSeenAt: true } : {}),
        bannerConfig: true,
      },
    });

    if (!site) {
      return Response.json({ error: "Site not found" }, { status: 404 });
    }

    const isVerified = verificationColumns.allExist
      ? (site.isVerified ?? false)
      : (site.bannerConfig?._verification?.isVerified ?? false);
    const lastSeenAt = hasLastSeenAt ? site.lastSeenAt : null;

    const now = new Date();
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const scriptInstalled =
      isVerified && lastSeenAt && new Date(lastSeenAt) >= fortyEightHoursAgo;

    const [subscriptionStatus, viewLimit] = await Promise.all([
      isSubscriptionActive(site.id),
      checkPageViewLimit(site.id),
    ]);

    let serveState = "not_installed";
    let servingReason = "Script not detected on the website yet.";
    if (!subscriptionStatus.isActive) {
      serveState = "inactive_subscription";
      servingReason = "Subscription is inactive or expired.";
    } else if (viewLimit.exceeded) {
      serveState = "limit_reached";
      servingReason = "Page view limit reached for this billing period.";
    } else if (scriptInstalled) {
      serveState = "serving";
      servingReason = "Consent script is active and serving.";
    }
    const isServingScript = serveState === "serving";

    return Response.json({
      siteId: site.siteId,
      domain: site.domain,
      scriptInstalled,
      isServingScript,
      serveState,
      servingReason,
      isVerified,
      lastSeenAt: lastSeenAt ? new Date(lastSeenAt).toISOString() : null,
      viewLimit,
      subscriptionActive: subscriptionStatus.isActive,
      subscriptionReason: subscriptionStatus.reason,
    });
  } catch (error) {
    console.error("[script-status] Error:", error);
    return Response.json(
      { error: error.message || "Failed to get script status" },
      { status: 500 }
    );
  }
}
