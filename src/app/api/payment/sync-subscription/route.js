import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { fetchPaddleSubscription } from "@/lib/paddle";
import { prisma } from "@/lib/prisma";
import { startUserTrial } from "@/lib/subscription";

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

    // Get site and user info first
    const site = await prisma.site.findUnique({
      where: { id: dbSubscription.siteId },
      include: { user: { select: { trialEndAt: true, trialStartedAt: true } } },
    });

    if (!site) {
      return Response.json(
        { error: "Site not found" },
        { status: 404 }
      );
    }

    switch (paddleStatus) {
      case "active":
        // If subscription is active in Paddle, check if user trial is active
        // If user trial is active, keep as trial; otherwise set to active
        if (site.user?.trialEndAt && new Date() < new Date(site.user.trialEndAt)) {
          // User trial is active
          newStatus = "trial";
          shouldStartTrial = false; // Already active
        } else if (dbSubscription.status === "pending") {
          // Payment just completed, start user trial
          newStatus = "trial";
          shouldStartTrial = true;
        } else {
          // User trial ended, subscription is active
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

    // Start user-level trial if needed (14 days for new users)
    if (shouldStartTrial) {
      await startUserTrial(site.userId);
      console.log(`[Sync] Started user trial for user ${site.userId}`);
    }

    return Response.json({
      success: true,
      subscription: updated,
      site: {
        siteId: site.siteId,
        domain: site.domain,
      },
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
