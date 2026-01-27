import { prisma } from "@/lib/prisma";
import { verifyWebhookSignature } from "@/lib/razorpay";
import { 
  startDomainTrial, 
  activateSubscription, 
  markPaymentFailed, 
  cancelSubscription,
  extendSubscriptionPeriod 
} from "@/lib/subscription";

/**
 * Razorpay Webhook Handler
 * 
 * Configure this URL in Razorpay Dashboard:
 * https://yourdomain.com/api/webhooks/razorpay
 * 
 * Events handled:
 * - subscription.activated: Payment method added, start trial
 * - subscription.charged: Successful payment (after trial or recurring)
 * - payment.failed: Payment failed
 * - subscription.cancelled: Subscription cancelled
 * - subscription.completed: Subscription ended
 */
export async function POST(req) {
  try {
    const body = await req.text();
    const signature = req.headers.get("x-razorpay-signature");

    // Verify webhook signature
    if (!verifyWebhookSignature(body, signature)) {
      console.error("[Razorpay Webhook] Invalid signature");
      return Response.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(body);
    console.log("[Razorpay Webhook] Event received:", event.event);

    switch (event.event) {
      case "subscription.authenticated":
        // User has authenticated/added payment method but subscription not yet activated
        await handleSubscriptionAuthenticated(event);
        break;

      case "subscription.activated":
        // Payment method added and subscription activated - START TRIAL HERE
        await handleSubscriptionActivated(event);
        break;

      case "subscription.charged":
        // Successful payment (after trial ends or recurring monthly)
        await handleSubscriptionCharged(event);
        break;

      case "payment.captured":
      case "payment.authorized":
        // Payment successful
        await handlePaymentSuccess(event);
        break;

      case "payment.failed":
        // Payment failed
        await handlePaymentFailed(event);
        break;

      case "subscription.pending":
        // Subscription is pending (retry phase)
        await handleSubscriptionPending(event);
        break;

      case "subscription.halted":
        // All payment retries failed
        await handleSubscriptionHalted(event);
        break;

      case "subscription.cancelled":
        // Subscription cancelled
        await handleSubscriptionCancelled(event);
        break;

      case "subscription.completed":
        // Subscription ended (all billing cycles completed)
        await handleSubscriptionCompleted(event);
        break;

      default:
        console.log(`[Razorpay Webhook] Unhandled event: ${event.event}`);
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error("[Razorpay Webhook] Error:", error);
    return Response.json(
      { error: error.message || "Webhook processing failed" },
      { status: 500 }
    );
  }
}

/**
 * Handle subscription authenticated (payment method added but not yet active)
 */
async function handleSubscriptionAuthenticated(event) {
  const subscription = event.payload.subscription.entity;
  console.log(`[Webhook] Subscription authenticated: ${subscription.id}`);
  
  // Usually followed by subscription.activated, no action needed here
}

/**
 * Handle subscription activated
 * This is when the payment method is successfully added
 * START THE 7-DAY TRIAL HERE
 */
async function handleSubscriptionActivated(event) {
  const razorpaySubscription = event.payload.subscription.entity;
  const razorpaySubId = razorpaySubscription.id;

  console.log(`[Webhook] Subscription activated: ${razorpaySubId}`);

  // Find subscription in our database
  const dbSubscription = await prisma.subscription.findFirst({
    where: { razorpaySubscriptionId: razorpaySubId },
    include: { site: true },
  });

  if (!dbSubscription) {
    console.warn(`[Webhook] Subscription not found in DB: ${razorpaySubId}`);
    return;
  }

  // Start 7-day trial for this domain
  const plan = dbSubscription.plan || "basic";
  
  try {
    await startDomainTrial(dbSubscription.siteId, plan);
    console.log(`[Webhook] Started 7-day trial for site ${dbSubscription.siteId}, domain: ${dbSubscription.site?.domain}`);
  } catch (error) {
    console.error(`[Webhook] Error starting trial:`, error);
  }
}

/**
 * Handle subscription charged (successful payment)
 * Called after trial ends (first real payment) or monthly recurring
 */
async function handleSubscriptionCharged(event) {
  const razorpaySubscription = event.payload.subscription.entity;
  const payment = event.payload.payment?.entity;
  const razorpaySubId = razorpaySubscription.id;

  console.log(`[Webhook] Subscription charged: ${razorpaySubId}, payment: ${payment?.id}`);

  // Find subscription in our database
  const dbSubscription = await prisma.subscription.findFirst({
    where: { razorpaySubscriptionId: razorpaySubId },
  });

  if (!dbSubscription) {
    console.warn(`[Webhook] Subscription not found: ${razorpaySubId}`);
    return;
  }

  // Extend subscription period (activates if was in trial)
  try {
    await extendSubscriptionPeriod(dbSubscription.siteId);
    
    // Update payment ID
    if (payment?.id) {
      await prisma.subscription.update({
        where: { siteId: dbSubscription.siteId },
        data: { razorpayPaymentId: payment.id },
      });
    }

    console.log(`[Webhook] Subscription period extended for site ${dbSubscription.siteId}`);
  } catch (error) {
    console.error(`[Webhook] Error extending subscription:`, error);
  }
}

/**
 * Handle successful payment (for one-time orders)
 */
async function handlePaymentSuccess(event) {
  const payment = event.payload.payment.entity;
  const orderId = payment.order_id;

  console.log(`[Webhook] Payment success: ${payment.id} for order ${orderId}`);

  // Find subscription by order ID
  const subscription = await prisma.subscription.findFirst({
    where: { razorpayOrderId: orderId },
  });

  if (!subscription) {
    // Might be a subscription payment, not a one-time order
    console.log(`[Webhook] No subscription found for order ${orderId}`);
    return;
  }

  // Activate subscription
  try {
    await activateSubscription(subscription.siteId);
    
    await prisma.subscription.update({
      where: { siteId: subscription.siteId },
      data: {
        razorpayPaymentId: payment.id,
        razorpaySignature: payment.notes?.signature || null,
      },
    });

    console.log(`[Webhook] Subscription activated for site ${subscription.siteId}`);
  } catch (error) {
    console.error(`[Webhook] Error activating subscription:`, error);
  }
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(event) {
  const payment = event.payload.payment.entity;
  const orderId = payment.order_id;
  
  // Try to find by subscription ID from notes
  const razorpaySubId = payment.notes?.subscription_id;

  console.log(`[Webhook] Payment failed: ${payment.id}`);

  let subscription;
  
  if (razorpaySubId) {
    subscription = await prisma.subscription.findFirst({
      where: { razorpaySubscriptionId: razorpaySubId },
    });
  } else if (orderId) {
    subscription = await prisma.subscription.findFirst({
      where: { razorpayOrderId: orderId },
    });
  }

  if (!subscription) {
    console.warn(`[Webhook] Subscription not found for failed payment`);
    return;
  }

  // Mark as payment failed
  try {
    await markPaymentFailed(subscription.siteId);
    console.log(`[Webhook] Marked payment failed for site ${subscription.siteId}`);
  } catch (error) {
    console.error(`[Webhook] Error marking payment failed:`, error);
  }
}

/**
 * Handle subscription pending (payment retry phase)
 */
async function handleSubscriptionPending(event) {
  const razorpaySubscription = event.payload.subscription.entity;
  console.log(`[Webhook] Subscription pending (retry): ${razorpaySubscription.id}`);
  
  // Don't change status yet - Razorpay will retry
}

/**
 * Handle subscription halted (all retries failed)
 */
async function handleSubscriptionHalted(event) {
  const razorpaySubscription = event.payload.subscription.entity;
  const razorpaySubId = razorpaySubscription.id;

  console.log(`[Webhook] Subscription halted: ${razorpaySubId}`);

  const dbSubscription = await prisma.subscription.findFirst({
    where: { razorpaySubscriptionId: razorpaySubId },
  });

  if (!dbSubscription) return;

  // Mark as payment failed - domain will be disabled
  try {
    await markPaymentFailed(dbSubscription.siteId);
    console.log(`[Webhook] Marked subscription halted for site ${dbSubscription.siteId}`);
  } catch (error) {
    console.error(`[Webhook] Error marking halted:`, error);
  }
}

/**
 * Handle subscription cancelled
 */
async function handleSubscriptionCancelled(event) {
  const razorpaySubscription = event.payload.subscription.entity;
  const razorpaySubId = razorpaySubscription.id;

  console.log(`[Webhook] Subscription cancelled: ${razorpaySubId}`);

  const dbSubscription = await prisma.subscription.findFirst({
    where: { razorpaySubscriptionId: razorpaySubId },
  });

  if (!dbSubscription) return;

  // Cancel subscription (access until period end)
  try {
    await cancelSubscription(dbSubscription.siteId, true);
    console.log(`[Webhook] Cancelled subscription for site ${dbSubscription.siteId}`);
  } catch (error) {
    console.error(`[Webhook] Error cancelling:`, error);
  }
}

/**
 * Handle subscription completed (all cycles done)
 */
async function handleSubscriptionCompleted(event) {
  const razorpaySubscription = event.payload.subscription.entity;
  const razorpaySubId = razorpaySubscription.id;

  console.log(`[Webhook] Subscription completed: ${razorpaySubId}`);

  const dbSubscription = await prisma.subscription.findFirst({
    where: { razorpaySubscriptionId: razorpaySubId },
  });

  if (!dbSubscription) return;

  // Mark as expired
  try {
    await prisma.subscription.update({
      where: { siteId: dbSubscription.siteId },
      data: { status: "expired" },
    });
    console.log(`[Webhook] Marked subscription expired for site ${dbSubscription.siteId}`);
  } catch (error) {
    console.error(`[Webhook] Error marking expired:`, error);
  }
}
