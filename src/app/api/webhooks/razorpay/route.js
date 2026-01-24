import { prisma } from "@/lib/prisma";
import { razorpay } from "@/lib/razorpay";
import { calculateTrialEndDate } from "@/lib/subscription";
import { PLAN_PRICING } from "@/lib/razorpay";
import crypto from "crypto";

/**
 * Razorpay Webhook Handler
 * Handles subscription events: payment.success, payment.failed, subscription.charged, etc.
 * 
 * Configure this URL in Razorpay Dashboard:
 * https://yourdomain.com/api/webhooks/razorpay
 */
export async function POST(req) {
  try {
    const body = await req.text();
    const signature = req.headers.get("x-razorpay-signature");
    
    if (!signature) {
      return Response.json({ error: "Missing signature" }, { status: 400 });
    }

    // Verify webhook signature
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.warn("⚠️ RAZORPAY_WEBHOOK_SECRET not set, skipping signature verification");
    } else {
      const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(body)
        .digest("hex");
      
      if (signature !== expectedSignature) {
        console.error("Invalid webhook signature");
        return Response.json({ error: "Invalid signature" }, { status: 401 });
      }
    }

    const event = JSON.parse(body);
    console.log("[Razorpay Webhook] Received event:", event.event);

    // Handle different event types
    switch (event.event) {
      case "payment.captured":
      case "payment.authorized":
        await handlePaymentSuccess(event);
        break;
      
      case "payment.failed":
        await handlePaymentFailed(event);
        break;
      
      case "subscription.charged":
        await handleSubscriptionCharged(event);
        break;
      
      case "subscription.activated":
        await handleSubscriptionActivated(event);
        break;
      
      case "subscription.cancelled":
        await handleSubscriptionCancelled(event);
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
 * Handle successful payment
 */
async function handlePaymentSuccess(event) {
  const payment = event.payload.payment.entity;
  const orderId = payment.order_id;
  
  console.log(`[Razorpay Webhook] Payment successful: ${payment.id} for order ${orderId}`);
  
  // Find subscription by order ID
  const subscription = await prisma.subscription.findFirst({
    where: { razorpayOrderId: orderId },
    include: { site: { include: { user: true } } },
  });

  if (!subscription) {
    console.warn(`[Razorpay Webhook] Subscription not found for order ${orderId}`);
    return;
  }

  // Update subscription
  const now = new Date();
  const periodEnd = new Date();
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  await prisma.subscription.update({
    where: { siteId: subscription.siteId },
    data: {
      status: "active",
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      razorpayPaymentId: payment.id,
      razorpaySignature: payment.notes?.signature || null,
    },
  });

  console.log(`[Razorpay Webhook] Subscription activated for site ${subscription.siteId}`);
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(event) {
  const payment = event.payload.payment.entity;
  const orderId = payment.order_id;
  
  console.log(`[Razorpay Webhook] Payment failed: ${payment.id} for order ${orderId}`);
  
  // Find subscription by order ID
  const subscription = await prisma.subscription.findFirst({
    where: { razorpayOrderId: orderId },
  });

  if (!subscription) {
    return;
  }

  // Mark subscription as inactive/cancelled
  await prisma.subscription.update({
    where: { siteId: subscription.siteId },
    data: {
      status: "cancelled",
      cancelAtPeriodEnd: false,
    },
  });

  console.log(`[Razorpay Webhook] Subscription cancelled for site ${subscription.siteId} due to payment failure`);
  
  // TODO: Send email notification to user about payment failure
}

/**
 * Handle subscription charged (recurring payment)
 */
async function handleSubscriptionCharged(event) {
  const subscription = event.payload.subscription.entity;
  const payment = event.payload.payment.entity;
  
  console.log(`[Razorpay Webhook] Subscription charged: ${subscription.id}, payment: ${payment.id}`);
  
  // Find subscription by Razorpay subscription ID
  const dbSubscription = await prisma.subscription.findFirst({
    where: { razorpaySubscriptionId: subscription.id },
  });

  if (!dbSubscription) {
    console.warn(`[Razorpay Webhook] Subscription not found for Razorpay subscription ${subscription.id}`);
    return;
  }

  // Update subscription period
  const now = new Date();
  const periodEnd = new Date();
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  await prisma.subscription.update({
    where: { siteId: dbSubscription.siteId },
    data: {
      status: "active",
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      razorpayPaymentId: payment.id,
    },
  });

  console.log(`[Razorpay Webhook] Subscription period extended for site ${dbSubscription.siteId}`);
}

/**
 * Handle subscription activated
 */
async function handleSubscriptionActivated(event) {
  const subscription = event.payload.subscription.entity;
  
  console.log(`[Razorpay Webhook] Subscription activated: ${subscription.id}`);
  
  const dbSubscription = await prisma.subscription.findFirst({
    where: { razorpaySubscriptionId: subscription.id },
  });

  if (dbSubscription) {
    await prisma.subscription.update({
      where: { siteId: dbSubscription.siteId },
      data: {
        status: "active",
      },
    });
  }
}

/**
 * Handle subscription cancelled
 */
async function handleSubscriptionCancelled(event) {
  const subscription = event.payload.subscription.entity;
  
  console.log(`[Razorpay Webhook] Subscription cancelled: ${subscription.id}`);
  
  const dbSubscription = await prisma.subscription.findFirst({
    where: { razorpaySubscriptionId: subscription.id },
  });

  if (dbSubscription) {
    await prisma.subscription.update({
      where: { siteId: dbSubscription.siteId },
      data: {
        status: "cancelled",
        cancelAtPeriodEnd: false,
      },
    });
  }
}
