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
    const subscription = await prisma.subscription.findFirst({
      where: { razorpaySubscriptionId: subscriptionId },
      include: { site: { include: { user: true } } },
    });

    if (!subscription) {
      return NextResponse.redirect(new URL("/payment?error=subscription_not_found", req.url));
    }

    // Update subscription status based on Razorpay status
    if (status === "authenticated" || status === "active") {
      await prisma.subscription.update({
        where: { siteId: subscription.siteId },
        data: {
          status: "active",
        },
      });
      
      return NextResponse.redirect(new URL("/profile?subscription=activated", req.url));
    }

    return NextResponse.redirect(new URL("/profile", req.url));
  } catch (error) {
    console.error("Subscription callback error:", error);
    return NextResponse.redirect(new URL("/payment?error=callback_failed", req.url));
  }
}
