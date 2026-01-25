import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

/**
 * Callback handler for Razorpay subscription setup
 * This is called after user adds payment method to subscription
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const subscriptionId = searchParams.get("subscription_id");
    const status = searchParams.get("status");
    
    if (!subscriptionId) {
      return NextResponse.redirect(new URL("/payment?error=missing_subscription", req.url));
    }

    // Find subscription in database
    let subscription = null;
    try {
      subscription = await prisma.subscription.findFirst({
        where: { razorpaySubscriptionId: subscriptionId },
        include: { site: { include: { user: true } } },
      });
    } catch (findError) {
      console.error("[Subscription Callback] Error finding subscription:", findError.message);
      // Try without relation
      try {
        const sub = await prisma.subscription.findFirst({
          where: { razorpaySubscriptionId: subscriptionId },
        });
        if (sub) {
          const site = await prisma.site.findUnique({
            where: { id: sub.siteId },
            include: { user: true },
          });
          subscription = sub ? { ...sub, site } : null;
        }
      } catch (fallbackError) {
        console.error("[Subscription Callback] Fallback also failed:", fallbackError.message);
      }
    }

    if (!subscription) {
      return NextResponse.redirect(new URL("/payment?error=subscription_not_found", req.url));
    }

    // Update subscription status based on Razorpay status
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
      
      return NextResponse.redirect(new URL("/profile?subscription=activated", req.url));
    }

    return NextResponse.redirect(new URL("/profile", req.url));
  } catch (error) {
    console.error("Subscription callback error:", error);
    return NextResponse.redirect(new URL("/payment?error=callback_failed", req.url));
  }
}
