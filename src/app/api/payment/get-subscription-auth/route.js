import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { razorpay } from "@/lib/razorpay";

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const subscriptionId = searchParams.get("subscriptionId");

    if (!subscriptionId) {
      return Response.json(
        { error: "Subscription ID is required" },
        { status: 400 }
      );
    }

    try {
      // Fetch subscription from Razorpay
      const subscription = await razorpay.subscriptions.fetch(subscriptionId);
      
      // Get auth URL from subscription
      const authUrl = subscription.authenticate_url || subscription.short_url;
      
      if (!authUrl) {
        return Response.json(
          { error: "Authentication URL not available for this subscription" },
          { status: 404 }
        );
      }

      return Response.json({
        success: true,
        authUrl: authUrl,
        subscriptionId: subscriptionId,
      });
    } catch (razorpayError) {
      console.error("[Payment] Error fetching subscription from Razorpay:", razorpayError);
      return Response.json(
        { error: razorpayError.message || "Failed to fetch subscription" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[Payment] Error in get-subscription-auth:", error);
    return Response.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
