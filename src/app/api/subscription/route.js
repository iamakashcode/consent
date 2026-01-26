import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

/**
 * GET - Fetch subscriptions for all user's sites (domain-based plans)
 * Returns array of subscriptions, one per domain
 */
export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(req.url);
    const subscriptionId = searchParams.get("subscriptionId");
    
    console.log("[Subscription API] Fetching subscriptions for user:", userId, subscriptionId ? `(filtering by subscriptionId: ${subscriptionId})` : "");

    // If subscriptionId is provided, find subscription by Razorpay subscription ID
    if (subscriptionId) {
      try {
        const subscription = await prisma.subscription.findFirst({
          where: {
            razorpaySubscriptionId: subscriptionId,
            site: {
              userId: userId, // Ensure subscription belongs to this user
            },
          },
          include: {
            site: {
              select: {
                siteId: true,
                id: true,
                domain: true,
              },
            },
          },
        });

        if (!subscription) {
          return Response.json({
            subscriptions: [],
            count: 0,
            activeCount: 0,
          });
        }

        return Response.json({
          subscriptions: [{
            siteId: subscription.site.siteId,
            siteDbId: subscription.site.id,
            domain: subscription.site.domain,
            subscription: {
              id: subscription.id,
              plan: subscription.plan || "basic",
              status: subscription.status || "pending",
              currentPeriodStart: subscription.currentPeriodStart,
              currentPeriodEnd: subscription.currentPeriodEnd,
              trialEndAt: subscription.trialEndAt,
              cancelAtPeriodEnd: subscription.cancelAtPeriodEnd || false,
              razorpayPaymentId: subscription.razorpayPaymentId,
              razorpaySubscriptionId: subscription.razorpaySubscriptionId,
              razorpayPlanId: subscription.razorpayPlanId,
            },
          }],
          count: 1,
          activeCount: subscription.status === "active" ? 1 : 0,
        });
      } catch (error) {
        console.error("[Subscription API] Error fetching subscription by ID:", error);
        return Response.json({ error: "Failed to fetch subscription" }, { status: 500 });
      }
    }

    // Get all sites for user with their subscriptions
    // Use try-catch around the Prisma query to catch any database errors
    let sites;
    try {
      sites = await prisma.site.findMany({
        where: { userId },
        include: {
          subscription: true, // Include full subscription object
        },
      });
      console.log("[Subscription API] Found sites:", sites.length);
    } catch (dbError) {
      console.error("[Subscription API] Database error:", dbError);
      throw new Error(`Database query failed: ${dbError.message}`);
    }

    // Return subscriptions grouped by site
    const subscriptions = sites.map(site => {
      const sub = site.subscription;
      return {
        siteId: site.siteId, // Public siteId for frontend use
        siteDbId: site.id, // Database ID (for matching)
        domain: site.domain,
        subscription: sub ? {
          id: sub.id,
          plan: sub.plan || "basic",
          status: sub.status || "pending",
          currentPeriodStart: sub.currentPeriodStart,
          currentPeriodEnd: sub.currentPeriodEnd,
          trialEndAt: sub.trialEndAt,
          cancelAtPeriodEnd: sub.cancelAtPeriodEnd || false,
          razorpayPaymentId: sub.razorpayPaymentId,
          razorpaySubscriptionId: sub.razorpaySubscriptionId,
          razorpayPlanId: sub.razorpayPlanId,
        } : null,
      };
    });

    console.log("[Subscription API] Returning subscriptions:", subscriptions.length);

    return Response.json({
      subscriptions, // Array of site subscriptions
      count: subscriptions.length,
      activeCount: subscriptions.filter(s => s.subscription?.status === "active").length,
    });
  } catch (error) {
    console.error("Error fetching subscriptions:", error);
    console.error("Error stack:", error.stack);
    console.error("Error details:", {
      message: error.message,
      name: error.name,
      code: error.code,
    });
    return Response.json(
      { 
        error: error.message || "Failed to fetch subscriptions",
        details: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
