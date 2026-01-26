import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { razorpay } from "@/lib/razorpay";
import { prisma } from "@/lib/prisma";
import { calculateTrialEndDate } from "@/lib/subscription";

/**
 * Sync subscription status from Razorpay
 * This endpoint checks Razorpay directly and updates our database
 */
export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { subscriptionId, siteId } = await req.json();

    if (!subscriptionId) {
      return Response.json(
        { error: "Subscription ID is required" },
        { status: 400 }
      );
    }

    // Find subscription in our database
    const dbSubscription = await prisma.subscription.findFirst({
      where: {
        razorpaySubscriptionId: subscriptionId,
        site: {
          userId: session.user.id, // Ensure it belongs to the user
        },
      },
      include: {
        site: {
          select: {
            id: true,
            siteId: true,
            domain: true,
          },
        },
      },
    });

    if (!dbSubscription) {
      return Response.json(
        { error: "Subscription not found" },
        { status: 404 }
      );
    }

    // Fetch subscription from Razorpay
    let razorpaySubscription;
    try {
      razorpaySubscription = await razorpay.subscriptions.fetch(subscriptionId);
      console.log("[Sync] Razorpay subscription status:", {
        id: razorpaySubscription.id,
        status: razorpaySubscription.status,
        current_start: razorpaySubscription.current_start,
        current_end: razorpaySubscription.current_end,
      });
    } catch (error) {
      console.error("[Sync] Error fetching from Razorpay:", error);
      return Response.json(
        { error: "Failed to fetch subscription from Razorpay" },
        { status: 500 }
      );
    }

    // Map Razorpay status to our status
    let newStatus = dbSubscription.status;
    let currentPeriodStart = dbSubscription.currentPeriodStart;
    let currentPeriodEnd = dbSubscription.currentPeriodEnd;
    let trialEndAt = dbSubscription.trialEndAt;

    // Razorpay subscription statuses: created, authenticated, active, pending, halted, cancelled, completed, expired
    if (razorpaySubscription.status === "active" || razorpaySubscription.status === "authenticated") {
      newStatus = "active";
      
      // Update period dates from Razorpay if available
      if (razorpaySubscription.current_start) {
        currentPeriodStart = new Date(razorpaySubscription.current_start * 1000);
      }
      if (razorpaySubscription.current_end) {
        currentPeriodEnd = new Date(razorpaySubscription.current_end * 1000);
      }

      // If this is Basic plan and trial hasn't started, start it now
      if (dbSubscription.plan === "basic" && !trialEndAt && razorpaySubscription.status === "active") {
        trialEndAt = calculateTrialEndDate("basic");
        // Set period end to trial end if trial is active
        if (trialEndAt > new Date()) {
          currentPeriodEnd = trialEndAt;
        }
        console.log("[Sync] Starting 7-day free trial for Basic plan");
      }
    } else if (razorpaySubscription.status === "cancelled" || razorpaySubscription.status === "expired") {
      newStatus = "cancelled";
    } else if (razorpaySubscription.status === "pending" || razorpaySubscription.status === "created") {
      newStatus = "pending";
    }

    // Update subscription in database
    await prisma.subscription.update({
      where: { id: dbSubscription.id },
      data: {
        status: newStatus,
        currentPeriodStart: currentPeriodStart,
        currentPeriodEnd: currentPeriodEnd,
        trialEndAt: trialEndAt,
      },
    });

    console.log("[Sync] Updated subscription:", {
      subscriptionId: subscriptionId,
      oldStatus: dbSubscription.status,
      newStatus: newStatus,
      razorpayStatus: razorpaySubscription.status,
    });

    return Response.json({
      success: true,
      subscription: {
        id: dbSubscription.id,
        plan: dbSubscription.plan,
        status: newStatus,
        currentPeriodStart: currentPeriodStart,
        currentPeriodEnd: currentPeriodEnd,
        trialEndAt: trialEndAt,
        razorpayStatus: razorpaySubscription.status,
      },
      site: {
        siteId: dbSubscription.site.siteId,
        domain: dbSubscription.site.domain,
      },
    });
  } catch (error) {
    console.error("[Sync] Error syncing subscription:", error);
    return Response.json(
      { error: error.message || "Failed to sync subscription" },
      { status: 500 }
    );
  }
}
