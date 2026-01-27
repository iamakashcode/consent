import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { getSubscriptionCheckoutUrl } from "@/lib/paddle";

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
      // Get checkout URL from Paddle
      const authUrl = await getSubscriptionCheckoutUrl(subscriptionId);
      
      if (!authUrl) {
        return Response.json(
          { error: "Checkout URL not available for this subscription" },
          { status: 404 }
        );
      }

      return Response.json({
        success: true,
        authUrl: authUrl,
        subscriptionId: subscriptionId,
      });
    } catch (paddleError) {
      console.error("[Payment] Error fetching subscription from Paddle:", paddleError);
      return Response.json(
        { error: paddleError.message || "Failed to fetch subscription" },
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
