import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { isSubscriptionActive, checkPageViewLimit } from "@/lib/subscription";

/**
 * GET /api/sites/[siteId]/can-customize
 * Returns whether banner customization is allowed for this site (subscription active + views under limit).
 */
export async function GET(req, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { siteId } = await params;
    if (!siteId) {
      return Response.json({ error: "Site ID is required" }, { status: 400 });
    }

    const site = await prisma.site.findFirst({
      where: {
        OR: [{ siteId }, { id: siteId }],
      },
      select: { id: true, siteId: true, userId: true },
    });

    if (!site || site.userId !== session.user.id) {
      return Response.json({ error: "Site not found" }, { status: 404 });
    }

    const [subStatus, viewLimit] = await Promise.all([
      isSubscriptionActive(site.siteId),
      checkPageViewLimit(site.siteId),
    ]);

    const canCustomize = subStatus.isActive && !viewLimit.exceeded;
    let reason = null;
    if (!subStatus.isActive) {
      reason = "Subscription is inactive or expired. Restore your plan to customize the banner.";
    } else if (viewLimit.exceeded) {
      reason = "You've reached your page view limit for this billing period. Upgrade your plan or wait for the next period to customize the banner.";
    }

    return Response.json({
      canCustomize,
      reason,
    });
  } catch (error) {
    console.error("[can-customize]", error);
    return Response.json(
      { error: error.message || "Failed to check customization status" },
      { status: 500 }
    );
  }
}
