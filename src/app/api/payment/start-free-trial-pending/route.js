import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { activatePendingDomainForFreeTrial } from "@/lib/activate-pending-domain";

/**
 * POST /api/payment/start-free-trial-pending
 * Start 14-day free trial for a pending domain (first domain only) without Paddle checkout.
 * Use when user clicks "Start 14-day free trial" and we want 0 payment – domain moves from pending to active trial.
 */
export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const siteId = body.siteId ? String(body.siteId).trim() : null;
    const plan = ["basic", "starter", "pro"].includes(body.plan) ? body.plan : "basic";
    const billingInterval = ["monthly", "yearly"].includes(body.billingInterval) ? body.billingInterval : "monthly";

    if (!siteId) {
      return Response.json(
        { error: "siteId is required (pending domain's siteId)." },
        { status: 400 }
      );
    }

    const pending = await prisma.pendingDomain.findFirst({
      where: { siteId, userId: session.user.id },
    });

    if (!pending) {
      return Response.json(
        { error: "Pending domain not found. Add the domain first, then select a plan." },
        { status: 404 }
      );
    }

    const userSitesCount = await prisma.site.count({ where: { userId: session.user.id } });
    if (userSitesCount > 0) {
      return Response.json(
        { error: "Free trial without payment is only for your first domain. Use checkout for extra domains." },
        { status: 400 }
      );
    }

    const result = await activatePendingDomainForFreeTrial(pending, { plan, billingInterval });

    return Response.json({
      success: true,
      siteId: result.site.siteId,
      domain: result.site.domain,
      message: "14-day free trial started. Your domain is now active.",
    });
  } catch (error) {
    console.error("[start-free-trial-pending]", error);
    return Response.json(
      { error: error.message || "Failed to start free trial" },
      { status: 500 }
    );
  }
}
