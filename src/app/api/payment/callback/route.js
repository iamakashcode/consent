import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
// Payment callback handler for Paddle
// With Paddle, payment callbacks are handled via webhooks, but this route provides redirect after payment

/**
 * Payment callback handler
 * This endpoint handles payment redirects from Paddle checkout
 * Redirects user to dashboard after successful payment
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const subscriptionId = searchParams.get("subscription_id") || searchParams.get("subscriptionId");

    // Get session to verify user
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id) {
      // Redirect to login if not authenticated, but store subscription ID for after login
      const loginUrl = subscriptionId
        ? `/login?redirect=/api/payment/callback?subscription_id=${subscriptionId}`
        : "/login";
      return Response.redirect(new URL(loginUrl, req.url));
    }

    // With Paddle, payment callbacks are handled via webhooks
    // This route is kept for compatibility but redirects to dashboard
    let redirectUrl = "/dashboard/usage?payment=success";

    // Try to find subscription by Paddle subscription/transaction ID
    if (subscriptionId) {
      try {
        const subscription = await prisma.subscription.findFirst({
          where: {
            OR: [
              { paddleSubscriptionId: subscriptionId },
              { paddleTransactionId: subscriptionId },
            ],
            site: {
              userId: session.user.id,
            },
          },
          include: { site: { select: { siteId: true } } },
        });

        if (subscription && subscription.site) {
          redirectUrl = `/dashboard/usage?payment=success&siteId=${subscription.site.siteId}`;
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
