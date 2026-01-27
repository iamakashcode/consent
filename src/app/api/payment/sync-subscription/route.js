import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { fetchPaddleSubscription } from "@/lib/paddle";
import { prisma } from "@/lib/prisma";
import { startDomainTrial } from "@/lib/subscription";

/**
 * Sync subscription status from Paddle
 * Called after user returns from Paddle payment page
 */
export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { subscriptionId, siteId } = await req.json();

    if (!subscriptionId) {
      return Response.json(
        { error: "Subscription ID is required" },
        { status: 400 }
      );
    }

    // Find subscription by Paddle subscription ID or siteId
    let dbSubscription = null;
    if (siteId) {
      const site = await prisma.site.findFirst({
        where: {
          OR: [{ siteId: siteId }, { id: siteId }],
          userId: session.user.id,
        },
        include: { subscription: true },
      });

      if (site?.subscription) {
        dbSubscription = site.subscription;
      }
    }

    if (!dbSubscription) {
      dbSubscription = await prisma.subscription.findFirst({
        where: { paddleSubscriptionId: subscriptionId },
        include: { site: true },
      });
    }

    if (!dbSubscription) {
      return Response.json(
        { error: "Subscription not found" },
        { status: 404 }
      );
    }

    // Verify user owns this subscription
    if (dbSubscription.site.userId !== session.user.id) {
      return Response.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    // Fetch current status from Paddle
    let paddleStatus;
    let paddleSub;
    try {
      paddleSub = await fetchPaddleSubscription(subscriptionId);
      paddleStatus = paddleSub.status;
      console.log(`[Sync] Paddle subscription ${subscriptionId} status: ${paddleStatus}`);
    } catch (error) {
      console.error("[Sync] Error fetching from Paddle:", error);
      return Response.json(
        { error: "Could not fetch subscription from Paddle" },
        { status: 500 }
      );
    }

    // Map Paddle status to our status
    let newStatus = dbSubscription.status;
    let shouldStartTrial = false;

    switch (paddleStatus) {
      case "active":
        if (dbSubscription.status === "pending") {
          newStatus = "trial";
          shouldStartTrial = true;
        } else if (dbSubscription.status === "trial") {
          newStatus = "trial";
        } else {
          newStatus = "active";
        }
        break;
      case "trialing":
        newStatus = "trial";
        shouldStartTrial = true;
        break;
      case "past_due":
      case "paused":
        newStatus = "payment_failed";
        break;
      case "canceled":
        newStatus = "cancelled";
        break;
      default:
        console.warn(`[Sync] Unknown Paddle status: ${paddleStatus}`);
    }

    // Update subscription in database
    const updated = await prisma.subscription.update({
      where: { id: dbSubscription.id },
      data: {
        status: newStatus,
        currentPeriodStart: paddleSub.current_period_starts_at
          ? new Date(paddleSub.current_period_starts_at)
          : null,
        currentPeriodEnd: paddleSub.current_period_ends_at
          ? new Date(paddleSub.current_period_ends_at)
          : null,
        updatedAt: new Date(),
      },
    });

    // Start trial if needed
    if (shouldStartTrial) {
      await startDomainTrial(dbSubscription.siteId, dbSubscription.plan);
    }

    return Response.json({
      success: true,
      subscription: updated,
      paddleStatus,
      message: `Subscription synced. Status: ${newStatus}`,
    });
  } catch (error) {
    console.error("[Sync] Error:", error);
    return Response.json(
      { error: error.message || "Failed to sync subscription" },
      { status: 500 }
    );
  }
}
