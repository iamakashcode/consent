import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { fetchRazorpaySubscription } from "@/lib/razorpay";
import { startDomainTrial, activateSubscription } from "@/lib/subscription";

/**
 * Sync subscription status from Razorpay
 * Called after user returns from Razorpay payment page
 */
export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { subscriptionId, siteId } = await req.json();

    if (!subscriptionId) {
      return Response.json({ error: "Subscription ID is required" }, { status: 400 });
    }

    // Find subscription in database
    let dbSubscription = await prisma.subscription.findFirst({
      where: { razorpaySubscriptionId: subscriptionId },
      include: { site: true },
    });

    if (!dbSubscription) {
      // Try finding by siteId if provided
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

        if (site?.subscription) {
          dbSubscription = { ...site.subscription, site };
        }
      }

      if (!dbSubscription) {
        return Response.json({ error: "Subscription not found" }, { status: 404 });
      }
    }

    // Verify subscription belongs to user
    if (dbSubscription.site?.userId !== session.user.id) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Fetch current status from Razorpay
    let razorpayStatus;
    try {
      const razorpaySub = await fetchRazorpaySubscription(subscriptionId);
      razorpayStatus = razorpaySub.status;
      
      console.log(`[Sync] Razorpay subscription ${subscriptionId} status: ${razorpayStatus}`);
    } catch (error) {
      console.error("[Sync] Error fetching from Razorpay:", error);
      return Response.json({
        success: false,
        error: "Could not fetch subscription from Razorpay",
        subscription: dbSubscription,
      });
    }

    // Map Razorpay status to our status
    let newStatus = dbSubscription.status;
    let shouldStartTrial = false;

    switch (razorpayStatus) {
      case "created":
        newStatus = "pending";
        break;
      case "authenticated":
      case "active":
        // If currently pending, this means payment method was just added
        if (dbSubscription.status === "pending") {
          shouldStartTrial = true;
        }
        newStatus = dbSubscription.site?.trialEndAt && new Date(dbSubscription.site.trialEndAt) > new Date()
          ? "trial"
          : "active";
        break;
      case "pending":
        // Razorpay is in retry phase
        newStatus = "active"; // Keep active during retry
        break;
      case "halted":
        newStatus = "payment_failed";
        break;
      case "cancelled":
        newStatus = "cancelled";
        break;
      case "completed":
        newStatus = "expired";
        break;
      default:
        console.warn(`[Sync] Unknown Razorpay status: ${razorpayStatus}`);
    }

    // Start trial if subscription was just activated
    if (shouldStartTrial && dbSubscription.siteId) {
      try {
        await startDomainTrial(dbSubscription.siteId, dbSubscription.plan);
        newStatus = "trial";
        console.log(`[Sync] Started trial for site ${dbSubscription.siteId}`);
      } catch (error) {
        console.error("[Sync] Error starting trial:", error);
        // Continue with activation even if trial setup fails
        newStatus = "active";
      }
    }

    // Update database if status changed
    if (newStatus !== dbSubscription.status) {
      await prisma.subscription.update({
        where: { id: dbSubscription.id },
        data: {
          status: newStatus,
          updatedAt: new Date(),
        },
      });

      console.log(`[Sync] Updated subscription ${dbSubscription.id} status: ${dbSubscription.status} -> ${newStatus}`);
    }

    // Fetch updated subscription
    const updatedSubscription = await prisma.subscription.findUnique({
      where: { id: dbSubscription.id },
      include: { site: true },
    });

    return Response.json({
      success: true,
      subscription: {
        id: updatedSubscription.id,
        siteId: updatedSubscription.site?.siteId,
        domain: updatedSubscription.site?.domain,
        plan: updatedSubscription.plan,
        status: updatedSubscription.status,
        trialEndAt: updatedSubscription.site?.trialEndAt,
        currentPeriodEnd: updatedSubscription.currentPeriodEnd,
      },
      razorpayStatus,
      message: newStatus === "trial"
        ? "Subscription activated! Your 7-day free trial has started."
        : newStatus === "active"
        ? "Subscription is active."
        : `Subscription status: ${newStatus}`,
    });

  } catch (error) {
    console.error("[Sync] Error:", error);
    return Response.json(
      { error: error.message || "Failed to sync subscription" },
      { status: 500 }
    );
  }
}
