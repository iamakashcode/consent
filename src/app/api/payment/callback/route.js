import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { razorpay } from "@/lib/razorpay";
import { calculateTrialEndDate } from "@/lib/subscription";

/**
 * Payment callback handler
 * This endpoint can be used by Razorpay or users to redirect after payment
 * Syncs subscription status from Razorpay and redirects user to profile page
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

    // If subscription ID is provided, sync status from Razorpay and find the site
    let redirectUrl = "/profile?payment=success";
    let siteId = null;
    
    if (subscriptionId) {
      try {
        // First, try to sync subscription status from Razorpay
        try {
          const razorpaySubscription = await razorpay.subscriptions.fetch(subscriptionId);
          console.log("[Payment Callback] Razorpay subscription status:", razorpaySubscription.status);
          
          // Find subscription in our database
          const dbSubscription = await prisma.subscription.findFirst({
            where: {
              razorpaySubscriptionId: subscriptionId,
              site: {
                userId: session.user.id,
              },
            },
            include: {
              site: {
                select: {
                  id: true,
                  siteId: true,
                  domain: true,
                },
              },
            },
          });

          if (dbSubscription) {
            siteId = dbSubscription.site.siteId;
            
            // Update subscription status based on Razorpay status
            let newStatus = dbSubscription.status;
            let currentPeriodStart = dbSubscription.currentPeriodStart;
            let currentPeriodEnd = dbSubscription.currentPeriodEnd;
            let trialEndAt = dbSubscription.trialEndAt;

            if (razorpaySubscription.status === "active" || razorpaySubscription.status === "authenticated") {
              newStatus = "active";
              
              if (razorpaySubscription.current_start) {
                currentPeriodStart = new Date(razorpaySubscription.current_start * 1000);
              }
              if (razorpaySubscription.current_end) {
                currentPeriodEnd = new Date(razorpaySubscription.current_end * 1000);
              }

              // Start trial for Basic plan if not started
              if (dbSubscription.plan === "basic" && !trialEndAt && razorpaySubscription.status === "active") {
                trialEndAt = calculateTrialEndDate("basic");
                if (trialEndAt > new Date()) {
                  currentPeriodEnd = trialEndAt;
                }
              }
            }

            // Update subscription
            await prisma.subscription.update({
              where: { id: dbSubscription.id },
              data: {
                status: newStatus,
                currentPeriodStart: currentPeriodStart,
                currentPeriodEnd: currentPeriodEnd,
                trialEndAt: trialEndAt,
              },
            });

            console.log("[Payment Callback] Synced subscription status:", {
              subscriptionId,
              oldStatus: dbSubscription.status,
              newStatus,
              razorpayStatus: razorpaySubscription.status,
            });
          }
        } catch (syncError) {
          console.error("[Payment Callback] Error syncing subscription:", syncError);
          // Continue to redirect even if sync fails
        }

        // Get site info for redirect URL
        const subscription = await prisma.subscription.findFirst({
          where: { razorpaySubscriptionId: subscriptionId },
          include: { site: { select: { siteId: true } } },
        });
        
        if (subscription && subscription.site) {
          siteId = subscription.site.siteId;
          redirectUrl = `/profile?payment=success&siteId=${siteId}`;
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
