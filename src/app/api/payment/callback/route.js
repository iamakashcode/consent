import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

/**
 * Payment callback handler
 * This endpoint can be used by Razorpay or users to redirect after payment
 * Redirects user to profile page with success message
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const subscriptionId = searchParams.get("subscription_id") || searchParams.get("subscriptionId");
    const status = searchParams.get("status");
    
    console.log("[Payment Callback] Received callback:", { subscriptionId, status });
    
    // Get session to verify user
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user || !session.user.id) {
      // Redirect to login if not authenticated, but store subscription ID for after login
      const loginUrl = subscriptionId 
        ? `/login?redirect=/api/payment/callback?subscription_id=${subscriptionId}`
        : "/login";
      return Response.redirect(new URL(loginUrl, req.url));
    }

    // If subscription ID is provided, try to find the site
    let redirectUrl = "/profile?payment=success";
    
    if (subscriptionId) {
      try {
        const subscription = await prisma.subscription.findFirst({
          where: { razorpaySubscriptionId: subscriptionId },
          include: { site: { select: { siteId: true } } },
        });
        
        if (subscription && subscription.site) {
          redirectUrl = `/profile?payment=success&siteId=${subscription.site.siteId}`;
          console.log("[Payment Callback] Found subscription, redirecting to:", redirectUrl);
        } else {
          console.warn("[Payment Callback] Subscription not found for:", subscriptionId);
        }
      } catch (error) {
        console.error("[Payment Callback] Error finding subscription:", error);
      }
    }

    // Redirect to profile page
    return Response.redirect(new URL(redirectUrl, req.url));
  } catch (error) {
    console.error("[Payment Callback] Error:", error);
    // On error, still redirect to profile
    return Response.redirect(new URL("/profile?payment=success", req.url));
  }
}
