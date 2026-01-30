import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

/**
 * Callback handler for Paddle subscription setup
 * This is called after user completes payment in Paddle checkout
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const subscriptionId = searchParams.get("subscription_id");
    const status = searchParams.get("status");
    
    if (!subscriptionId) {
      return NextResponse.redirect(new URL("/payment?error=missing_subscription", req.url));
    }

    // Find subscription in database (using Paddle subscription ID)
    let subscription = null;
    try {
      subscription = await prisma.subscription.findFirst({
        where: { 
          OR: [
            { paddleSubscriptionId: subscriptionId },
            { paddleTransactionId: subscriptionId },
          ]
        },
        include: { site: true },
      });
    } catch (findError) {
      console.error("[Subscription Callback] Error finding subscription:", findError.message);
    }

    if (!subscription) {
      return NextResponse.redirect(new URL("/payment?error=subscription_not_found", req.url));
    }

    // Update subscription status based on Paddle payment status
    if (status === "authenticated" || status === "active") {
      try {
        await prisma.subscription.update({
          where: { siteId: subscription.siteId },
          data: {
            status: "active",
          },
        });
      } catch (updateError) {
        console.error("[Subscription Callback] Error updating subscription:", updateError.message);
        // Try raw SQL as fallback
        try {
          await prisma.$executeRaw`
            UPDATE subscriptions 
            SET status = 'active', "updatedAt" = NOW()
            WHERE "siteId" = ${subscription.siteId}
          `;
        } catch (rawError) {
          console.error("[Subscription Callback] Raw SQL also failed:", rawError.message);
        }
      }

      // Sync CDN script so real script is uploaded (subscription restored)
      const siteId = subscription.site?.siteId;
      if (siteId) {
        import("@/lib/script-generator")
          .then(({ syncSiteScriptWithSubscription }) => syncSiteScriptWithSubscription(siteId))
          .catch((err) => console.error("[Subscription Callback] CDN sync failed:", err));
      }

      return NextResponse.redirect(new URL("/profile?subscription=activated", req.url));
    }

    return NextResponse.redirect(new URL("/profile", req.url));
  } catch (error) {
    console.error("Subscription callback error:", error);
    return NextResponse.redirect(new URL("/payment?error=callback_failed", req.url));
  }
}
