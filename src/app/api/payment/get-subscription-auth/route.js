import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { razorpay } from "@/lib/razorpay";

/**
 * GET - Get Razorpay subscription authentication URL
 * This is used to redirect users to add payment method to their subscription
 */
export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const subscriptionId = searchParams.get("subscriptionId");

    if (!subscriptionId) {
      return Response.json({ error: "Subscription ID required" }, { status: 400 });
    }

    // Verify subscription belongs to user
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId: session.user.id,
        razorpaySubscriptionId: subscriptionId,
      },
    });

    if (!subscription) {
      return Response.json({ error: "Subscription not found" }, { status: 404 });
    }

    // Fetch subscription from Razorpay to get auth URL
    try {
      const razorpaySubscription = await razorpay.subscriptions.fetch(subscriptionId);
      const authUrl = razorpaySubscription.authenticate_url || razorpaySubscription.short_url;

      if (!authUrl) {
        return Response.json({ 
          error: "Authentication URL not available. Subscription may already be authenticated." 
        }, { status: 400 });
      }

      return Response.json({ authUrl });
    } catch (error) {
      console.error("Error fetching Razorpay subscription:", error);
      return Response.json(
        { error: "Failed to fetch subscription details from Razorpay" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Get subscription auth error:", error);
    return Response.json(
      { error: error.message || "Failed to get subscription auth URL" },
      { status: 500 }
    );
  }
}
