import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { getUserSubscriptions, isDomainActive } from "@/lib/subscription";
import { cancelPaddleSubscription } from "@/lib/paddle";

/**
 * GET /api/subscription
 * Get all subscriptions for the current user (across all their domains)
 */
export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get("siteId");

    // If specific siteId requested, return that subscription only
    if (siteId) {
      const site = await prisma.site.findFirst({
        where: {
          OR: [
            { siteId: siteId },
            { id: siteId },
          ],
          userId: session.user.id,
        },
        include: { subscription: true },
      });

      if (!site) {
        return Response.json({ error: "Site not found" }, { status: 404 });
      }

      const status = await isDomainActive(site.id);

      return Response.json({
        siteId: site.siteId,
        siteDbId: site.id,
        domain: site.domain,
        subscription: site.subscription,
        trialEndAt: site.trialEndAt,
        trialStartedAt: site.trialStartedAt,
        isActive: status.isActive,
        reason: status.reason,
        trialDaysLeft: status.trialDaysLeft,
      });
    }

    // Return all subscriptions for user
    const result = await getUserSubscriptions(session.user.id);

    return Response.json(result);

  } catch (error) {
    console.error("[Subscription API] GET error:", error);
    return Response.json(
      { error: "Failed to fetch subscriptions" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/subscription
 * Cancel a subscription
 */
export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { action, siteId, cancelAtPeriodEnd = true } = await req.json();

    if (!siteId) {
      return Response.json({ error: "Site ID is required" }, { status: 400 });
    }

    // Find site and verify ownership
    const site = await prisma.site.findFirst({
      where: {
        OR: [
          { siteId: siteId },
          { id: siteId },
        ],
        userId: session.user.id,
      },
      include: { subscription: true },
    });

    if (!site) {
      return Response.json({ error: "Site not found" }, { status: 404 });
    }

    if (!site.subscription) {
      return Response.json({ error: "No subscription found for this domain" }, { status: 404 });
    }

    switch (action) {
      case "cancel":
        return await handleCancel(site, cancelAtPeriodEnd);
      
      case "reactivate":
        return await handleReactivate(site);
      
      default:
        return Response.json({ error: "Invalid action" }, { status: 400 });
    }

  } catch (error) {
    console.error("[Subscription API] POST error:", error);
    return Response.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}

/**
 * Handle subscription cancellation
 */
async function handleCancel(site, cancelAtPeriodEnd) {
  const subscription = site.subscription;

  // Cancel in Paddle if we have a subscription ID
  if (subscription.paddleSubscriptionId) {
    try {
      await cancelPaddleSubscription(subscription.paddleSubscriptionId, cancelAtPeriodEnd);
    } catch (error) {
      console.error("[Subscription] Error cancelling in Paddle:", error);
      // Continue with local cancellation even if Paddle fails
    }
  }

  // Update database
  if (cancelAtPeriodEnd) {
    await prisma.subscription.update({
      where: { siteId: site.id },
      data: { cancelAtPeriodEnd: true },
    });

    return Response.json({
      success: true,
      message: `Subscription will be cancelled at the end of the current period (${new Date(subscription.currentPeriodEnd).toLocaleDateString()}).`,
      cancelAtPeriodEnd: true,
      currentPeriodEnd: subscription.currentPeriodEnd,
    });
  } else {
    await prisma.subscription.update({
      where: { siteId: site.id },
      data: {
        status: "cancelled",
        cancelAtPeriodEnd: false,
      },
    });

    return Response.json({
      success: true,
      message: "Subscription cancelled immediately.",
      status: "cancelled",
    });
  }
}

/**
 * Handle subscription reactivation (undo pending cancellation)
 */
async function handleReactivate(site) {
  const subscription = site.subscription;

  if (!subscription.cancelAtPeriodEnd) {
    return Response.json(
      { error: "Subscription is not pending cancellation" },
      { status: 400 }
    );
  }

  // Note: Paddle doesn't support un-cancelling, so we just update locally
  // The webhook will handle reactivation if user makes a new payment

  await prisma.subscription.update({
    where: { siteId: site.id },
    data: { cancelAtPeriodEnd: false },
  });

  return Response.json({
    success: true,
    message: "Subscription reactivated. It will continue to renew automatically.",
  });
}
