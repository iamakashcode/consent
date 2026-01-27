import { verifyPaddleWebhookSignature } from "@/lib/paddle";
import { prisma } from "@/lib/prisma";
import { startDomainTrial } from "@/lib/subscription";

/**
 * Paddle Webhook Handler
 * Configure this URL in Paddle Dashboard:
 * https://yourdomain.com/api/webhooks/paddle
 */
export async function POST(req) {
  try {
    const body = await req.text();
    const signature = req.headers.get("paddle-signature");

    // Verify webhook signature
    if (!verifyPaddleWebhookSignature(body, signature)) {
      console.error("[Paddle Webhook] Invalid signature");
      return Response.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(body);
    console.log("[Paddle Webhook] Event received:", event.event_type);

    // Handle different event types
    switch (event.event_type) {
      case "subscription.created":
        await handleSubscriptionCreated(event);
        break;
      case "subscription.activated":
      case "subscription.trialing":
        await handleSubscriptionActivated(event);
        break;
      case "subscription.updated":
        await handleSubscriptionUpdated(event);
        break;
      case "transaction.completed":
        await handleTransactionCompleted(event);
        break;
      case "transaction.payment_failed":
        await handlePaymentFailed(event);
        break;
      case "subscription.canceled":
        await handleSubscriptionCanceled(event);
        break;
      default:
        console.log(`[Paddle Webhook] Unhandled event: ${event.event_type}`);
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error("[Paddle Webhook] Error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

/**
 * Handle subscription created
 */
async function handleSubscriptionCreated(event) {
  const subscription = event.data;
  const subscriptionId = subscription.id;

  console.log(`[Webhook] Subscription created: ${subscriptionId}`);

  // Find subscription in database
  const dbSubscription = await prisma.subscription.findFirst({
    where: { paddleSubscriptionId: subscriptionId },
    include: { site: true },
  });

  if (!dbSubscription) {
    console.warn(`[Webhook] Subscription not found in DB: ${subscriptionId}`);
    return;
  }

  // Update status to pending
  await prisma.subscription.update({
    where: { id: dbSubscription.id },
    data: {
      status: "pending",
      updatedAt: new Date(),
    },
  });
}

/**
 * Handle subscription activated (trial starts)
 */
async function handleSubscriptionActivated(event) {
  const subscription = event.data;
  const subscriptionId = subscription.id;

  console.log(`[Webhook] Subscription activated: ${subscriptionId}`);

  const dbSubscription = await prisma.subscription.findFirst({
    where: { paddleSubscriptionId: subscriptionId },
    include: { site: true },
  });

  if (!dbSubscription) {
    console.warn(`[Webhook] Subscription not found in DB: ${subscriptionId}`);
    return;
  }

  // Start trial
  await startDomainTrial(dbSubscription.siteId, dbSubscription.plan);

  // Update subscription status
  await prisma.subscription.update({
    where: { id: dbSubscription.id },
    data: {
      status: "trial",
      currentPeriodStart: subscription.current_billing_period?.starts_at
        ? new Date(subscription.current_billing_period.starts_at)
        : null,
      currentPeriodEnd: subscription.current_billing_period?.ends_at
        ? new Date(subscription.current_billing_period.ends_at)
        : null,
      updatedAt: new Date(),
    },
  });
}

/**
 * Handle subscription updated
 */
async function handleSubscriptionUpdated(event) {
  const subscription = event.data;
  const subscriptionId = subscription.id;

  console.log(`[Webhook] Subscription updated: ${subscriptionId}`);

  const dbSubscription = await prisma.subscription.findFirst({
    where: { paddleSubscriptionId: subscriptionId },
  });

  if (!dbSubscription) {
    console.warn(`[Webhook] Subscription not found: ${subscriptionId}`);
    return;
  }

  // Update subscription based on status
  let newStatus = dbSubscription.status;
  if (subscription.status === "active") {
    newStatus = "active";
  } else if (subscription.status === "trialing") {
    newStatus = "trial";
  } else if (subscription.status === "past_due" || subscription.status === "paused") {
    newStatus = "payment_failed";
  } else if (subscription.status === "canceled") {
    newStatus = "cancelled";
  }

  await prisma.subscription.update({
    where: { id: dbSubscription.id },
    data: {
      status: newStatus,
      currentPeriodStart: subscription.current_billing_period?.starts_at
        ? new Date(subscription.current_billing_period.starts_at)
        : null,
      currentPeriodEnd: subscription.current_billing_period?.ends_at
        ? new Date(subscription.current_billing_period.ends_at)
        : null,
      updatedAt: new Date(),
    },
  });
}

/**
 * Handle transaction completed (payment successful)
 * This creates the subscription automatically in Paddle
 */
async function handleTransactionCompleted(event) {
  const transaction = event.data;
  const subscriptionId = transaction.subscription_id;

  console.log(`[Webhook] Transaction completed: ${transaction.id}, subscription: ${subscriptionId}`);

  // Find subscription by transaction ID (before subscription is created)
  let dbSubscription = await prisma.subscription.findFirst({
    where: { paddleTransactionId: transaction.id },
  });

  // If not found by transaction, try by subscription ID
  if (!dbSubscription && subscriptionId) {
    dbSubscription = await prisma.subscription.findFirst({
      where: { paddleSubscriptionId: subscriptionId },
    });
  }

  if (!dbSubscription) {
    console.warn(`[Webhook] Subscription not found for transaction: ${transaction.id}`);
    return;
  }

  // Update subscription with subscription ID and transaction info
  await prisma.subscription.update({
    where: { id: dbSubscription.id },
    data: {
      paddleSubscriptionId: subscriptionId || dbSubscription.paddleSubscriptionId,
      paddleTransactionId: transaction.id,
      status: dbSubscription.status === "trial" ? "trial" : "pending", // Will be activated by subscription.activated webhook
      updatedAt: new Date(),
    },
  });
}

/**
 * Handle payment failed
 */
async function handlePaymentFailed(event) {
  const transaction = event.data;
  const subscriptionId = transaction.subscription_id;

  console.log(`[Webhook] Payment failed: ${transaction.id}, subscription: ${subscriptionId}`);

  if (!subscriptionId) {
    return;
  }

  const dbSubscription = await prisma.subscription.findFirst({
    where: { paddleSubscriptionId: subscriptionId },
  });

  if (!dbSubscription) {
    console.warn(`[Webhook] Subscription not found: ${subscriptionId}`);
    return;
  }

  // Update status to payment_failed
  await prisma.subscription.update({
    where: { id: dbSubscription.id },
    data: {
      status: "payment_failed",
      updatedAt: new Date(),
    },
  });
}

/**
 * Handle subscription canceled
 */
async function handleSubscriptionCanceled(event) {
  const subscription = event.data;
  const subscriptionId = subscription.id;

  console.log(`[Webhook] Subscription cancelled: ${subscriptionId}`);

  const dbSubscription = await prisma.subscription.findFirst({
    where: { paddleSubscriptionId: subscriptionId },
  });

  if (!dbSubscription) {
    console.warn(`[Webhook] Subscription not found: ${subscriptionId}`);
    return;
  }

  // Update status to cancelled
  await prisma.subscription.update({
    where: { id: dbSubscription.id },
    data: {
      status: "cancelled",
      cancelAtPeriodEnd: false,
      updatedAt: new Date(),
    },
  });
}
