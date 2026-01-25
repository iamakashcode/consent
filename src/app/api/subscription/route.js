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
    console.log("[Subscription API] Fetching subscriptions for user:", userId);

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
