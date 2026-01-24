import { prisma } from "@/lib/prisma";
import { createRazorpayOrder, PLAN_PRICING } from "@/lib/razorpay";
import { razorpay } from "@/lib/razorpay";

/**
 * Webhook endpoint to charge users after trial ends
 * This should be called by a cron job (e.g., Vercel Cron) daily
 * 
 * To set up Vercel Cron:
 * Add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/webhooks/charge-trial",
 *     "schedule": "0 0 * * *"
 *   }]
 * }
 */
export async function POST(req) {
  try {
    // Optional: Add authentication/authorization check
    const authHeader = req.headers.get("authorization");
    const expectedToken = process.env.CRON_SECRET;
    
    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    
    // Find all subscriptions where:
    // 1. Plan is "basic"
    // 2. Trial has ended (trialEndAt < now)
    // 3. Payment period has ended or doesn't exist (currentPeriodEnd < now or is null)
    // 4. Status is still "active" (hasn't been cancelled)
    const expiredTrials = await prisma.subscription.findMany({
      where: {
        plan: "basic",
        status: "active",
        trialEndAt: {
          lte: now, // Trial has ended
        },
        OR: [
          { currentPeriodEnd: null },
          { currentPeriodEnd: { lte: now } }, // Payment period has ended
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    console.log(`[Charge Trial] Found ${expiredTrials.length} expired trials to charge`);

    const results = [];

    for (const subscription of expiredTrials) {
      try {
        // Check if there's already a pending order
        if (subscription.razorpayOrderId) {
          try {
            const existingOrder = await razorpay.orders.fetch(subscription.razorpayOrderId);
            // If order is still pending (created but not paid), skip
            if (existingOrder.status === "created") {
              console.log(`[Charge Trial] Order ${subscription.razorpayOrderId} already exists for user ${subscription.userId}, skipping`);
              results.push({
                userId: subscription.userId,
                status: "skipped",
                reason: "Order already exists",
              });
              continue;
            }
          } catch (error) {
            // Order doesn't exist, proceed to create new one
            console.log(`[Charge Trial] Existing order not found, creating new one`);
          }
        }

        // Create new payment order for automatic charging
        const amount = PLAN_PRICING.basic; // ₹5 = 500 paise
        
        // Try to create Razorpay subscription if plan ID exists
        let subscriptionCreated = false;
        if (subscription.razorpayPlanId) {
          try {
            // Create customer first (if needed)
            // Then create subscription
            // For now, we'll use one-time payment and set up subscription link
            const order = await createRazorpayOrder(amount);
            
            // Store order for payment
            await prisma.subscription.update({
              where: { userId: subscription.userId },
              data: {
                razorpayOrderId: order.id,
                status: "pending_payment",
              },
            });
            
            subscriptionCreated = true;
            
            results.push({
              userId: subscription.userId,
              email: subscription.user.email,
              status: "order_created",
              orderId: order.id,
              amount: amount / 100,
              note: "Payment order created. User needs to complete payment.",
            });
          } catch (subError) {
            console.error(`[Charge Trial] Failed to create subscription for user ${subscription.userId}:`, subError);
            // Fall through to create regular order
          }
        }
        
        if (!subscriptionCreated) {
          // Create regular payment order
          const order = await createRazorpayOrder(amount);

          // Update subscription with new order ID
          await prisma.subscription.update({
            where: { userId: subscription.userId },
            data: {
              razorpayOrderId: order.id,
              // Mark as pending payment
              status: "pending_payment",
            },
          });

        console.log(`[Charge Trial] Created order ${order.id} for user ${subscription.userId} (${subscription.user.email})`);

        results.push({
          userId: subscription.userId,
          email: subscription.user.email,
          status: "order_created",
          orderId: order.id,
          amount: amount / 100, // Convert paise to rupees
        });

        // TODO: Send email notification to user about payment due
        // You can integrate with an email service here

      } catch (error) {
        console.error(`[Charge Trial] Error processing subscription for user ${subscription.userId}:`, error);
        results.push({
          userId: subscription.userId,
          status: "error",
          error: error.message,
        });
      }
    }

    return Response.json({
      success: true,
      processed: results.length,
      results,
      message: `Processed ${results.length} expired trials`,
    });
  } catch (error) {
    console.error("[Charge Trial] Webhook error:", error);
    return Response.json(
      { error: error.message || "Failed to process expired trials" },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint for manual testing
 */
export async function GET(req) {
  return Response.json({
    message: "Charge Trial Webhook",
    description: "POST to this endpoint to charge users after trial ends",
    note: "Set up a cron job to call this endpoint daily",
  });
}
