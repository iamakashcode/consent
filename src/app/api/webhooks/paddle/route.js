import { verifyPaddleWebhookSignature } from "@/lib/paddle";
import { prisma } from "@/lib/prisma";
import { startUserTrial, activateSubscription } from "@/lib/subscription";
import { activatePendingDomain } from "@/lib/activate-pending-domain";

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
      case "transaction.paid":
        await handleTransactionPaid(event);
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
    include: { site: { include: { user: true } } },
  });

  if (!dbSubscription) {
    console.warn(`[Webhook] Subscription not found in DB: ${subscriptionId}`);
    return;
  }

  // Start user-level trial (14 days) if not already started
  const userId = dbSubscription.site.userId;
  const { startUserTrial } = await import("@/lib/subscription");
  await startUserTrial(userId);

  // Update subscription status to trial
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

  // Sync CDN script so real script is uploaded (trial/active)
  const siteId = dbSubscription.site?.siteId;
  if (siteId) {
    import("@/lib/script-generator")
      .then(({ syncSiteScriptWithSubscription }) => syncSiteScriptWithSubscription(siteId))
      .catch((err) => console.error("[Webhook] CDN sync failed:", err));
  }

  console.log(`[Webhook] Subscription ${subscriptionId} activated and user trial started`);
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
    include: { site: true },
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

  // Sync CDN script: real script when active/trial, blank when cancelled/failed
  const siteId = dbSubscription.site?.siteId;
  if (siteId) {
    import("@/lib/script-generator")
      .then(({ syncSiteScriptWithSubscription }) => syncSiteScriptWithSubscription(siteId))
      .catch((err) => console.error("[Webhook] CDN sync failed:", err));
  }
}

/**
 * Process payment for a pending domain: create Site + Subscription when payment succeeds.
 * Used by both transaction.paid and transaction.completed so domain is added as soon as payment is captured.
 * Finds PendingDomain by paddleTransactionId first (reliable); falls back to custom_data if needed.
 * Returns true if this was a pending-domain payment (handled or already processed); false otherwise.
 */
async function processPendingDomainPayment(event) {
  const transaction = event.data;
  const transactionId = transaction.id; // Paddle txn id (e.g. txn_01h...)
  const subscriptionId = transaction.subscription_id;
  const customData = transaction.custom_data || {};

  // 1) Reliable path: find PendingDomain by the Paddle transaction ID we stored at checkout (does not depend on custom_data)
  if (transactionId) {
    const pendingByTxn = await prisma.pendingDomain.findFirst({
      where: { paddleTransactionId: transactionId },
    });
    if (pendingByTxn) {
      console.log(`[Webhook] PendingDomain found by transaction id: ${transactionId} -> ${pendingByTxn.domain}`);
      const done = await createSiteFromPendingDomain(pendingByTxn, transaction, subscriptionId);
      return done;
    }
  }

  // 2) Fallback: custom_data (Paddle may not echo it in all environments)
  const isPendingDomain =
    customData.pendingDomain === true ||
    customData.pendingDomain === "true" ||
    customData.pending_domain === true ||
    customData.pending_domain === "true";
  const pendingDomainIdRaw = customData.pendingDomainId ?? customData.pending_domain_id;
  const pendingDomainId = pendingDomainIdRaw != null ? String(pendingDomainIdRaw).trim() : null;
  const publicSiteId = customData.siteId ?? customData.site_id;

  if (!isPendingDomain || !pendingDomainId) return false;

  try {
    const pending = await prisma.pendingDomain.findUnique({
      where: { id: pendingDomainId },
    });
    if (!pending) {
      if (publicSiteId) {
        const existing = await prisma.site.findUnique({ where: { siteId: String(publicSiteId) } });
        if (existing) {
          console.log(`[Webhook] PendingDomain already converted to Site: ${existing.siteId}`);
          return true;
        }
      }
      console.warn(`[Webhook] PendingDomain not found: ${pendingDomainId}`);
      return true;
    }
    return await createSiteFromPendingDomain(pending, transaction, subscriptionId);
  } catch (err) {
    console.error("[Webhook] Failed to create Site from PendingDomain:", err);
    return true;
  }
}

/**
 * Create Site + Subscription from a PendingDomain (uses shared activatePendingDomain).
 * Returns true on success or on error (so caller doesn't fall through).
 */
async function createSiteFromPendingDomain(pending, transaction, subscriptionId) {
  try {
    await activatePendingDomain(pending, transaction);
    return true;
  } catch (err) {
    console.error("[Webhook] Failed to create Site from PendingDomain:", err);
    return true;
  }
}

/**
 * Handle transaction.paid (payment captured) – create Site from PendingDomain so domain is added immediately.
 */
async function handleTransactionPaid(event) {
  const handled = await processPendingDomainPayment(event);
  if (handled) return;
  console.log("[Webhook] transaction.paid: no pending-domain custom_data, skipping");
}

/**
 * Handle transaction completed (payment successful)
 * This creates the subscription automatically in Paddle
 */
async function handleTransactionCompleted(event) {
  const transaction = event.data;
  const subscriptionId = transaction.subscription_id;
  const customData = transaction.custom_data || {};

  const handled = await processPendingDomainPayment(event);
  if (handled) return;

  // Bundled add-on with plan checkout (remove branding) – apply only after payment success
  if ((customData.addonRemoveBranding === true || customData.addonRemoveBranding === "true") && customData.siteId) {
    try {
      await prisma.subscription.updateMany({
        where: { siteId: customData.siteId },
        data: {
          removeBrandingAddon: true,
          paddleAddonSubscriptionId: subscriptionId || undefined,
          updatedAt: new Date(),
        },
      });
      const site = await prisma.site.findUnique({
        where: { id: customData.siteId },
        select: { siteId: true },
      });
      if (site?.siteId) {
        import("@/lib/script-generator")
          .then(({ syncSiteScriptWithSubscription }) => syncSiteScriptWithSubscription(site.siteId))
          .catch((err) => console.error("[Webhook] CDN sync after bundled add-on:", err));
      }
      console.log(`[Webhook] Bundled add-on remove_branding activated for siteId: ${customData.siteId}`);
    } catch (err) {
      console.error("[Webhook] Failed to activate bundled add-on:", err);
    }
    // continue – the same transaction also activates/updates the main subscription
  }

  // Add-on purchase (e.g. remove branding) - custom_data has siteId and addonType
  if (customData.addonType === "remove_branding" && customData.siteId) {
    try {
      await prisma.subscription.updateMany({
        where: { siteId: customData.siteId },
        data: {
          removeBrandingAddon: true,
          paddleAddonSubscriptionId: subscriptionId || undefined,
          updatedAt: new Date(),
        },
      });
      const site = await prisma.site.findUnique({
        where: { id: customData.siteId },
        select: { siteId: true },
      });
      if (site?.siteId) {
        import("@/lib/script-generator")
          .then(({ syncSiteScriptWithSubscription }) => syncSiteScriptWithSubscription(site.siteId))
          .catch((err) => console.error("[Webhook] CDN sync after add-on:", err));
      }
      console.log(`[Webhook] Add-on remove_branding activated for siteId: ${customData.siteId}`);
    } catch (err) {
      console.error("[Webhook] Failed to activate add-on:", err);
    }
    return;
  }

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

  // Get site to access user
  const site = await prisma.site.findUnique({
    where: { id: dbSubscription.siteId },
    include: { user: true },
  });

  if (!site) {
    console.warn(`[Webhook] Site not found for subscription: ${dbSubscription.id}`);
    return;
  }

  const isUpgrade = customData.upgrade === true || customData.upgrade === "true";
  if (!isUpgrade) {
    await startUserTrial(site.userId);
  }

  const planFromPayment = customData.plan || dbSubscription.plan;
  const billingIntervalFromPayment = customData.billingInterval || customData.billing_interval || dbSubscription.billingInterval;

  const currentStatus = dbSubscription.status?.toLowerCase();
  let newStatus = "active";
  if (!isUpgrade && (currentStatus === "trial" || currentStatus === "pending")) {
    const user = await prisma.user.findUnique({
      where: { id: site.userId },
      select: { trialEndAt: true },
    });
    if (user?.trialEndAt && new Date() < new Date(user.trialEndAt)) {
      newStatus = "trial";
    }
  }

  await prisma.subscription.update({
    where: { id: dbSubscription.id },
    data: {
      plan: planFromPayment,
      billingInterval: billingIntervalFromPayment,
      paddleSubscriptionId: subscriptionId || dbSubscription.paddleSubscriptionId,
      paddleTransactionId: transaction.id,
      status: newStatus,
      currentPeriodStart: transaction.billing_period?.starts_at
        ? new Date(transaction.billing_period.starts_at)
        : new Date(),
      currentPeriodEnd: transaction.billing_period?.ends_at
        ? new Date(transaction.billing_period.ends_at)
        : (() => {
          const end = new Date();
          end.setMonth(end.getMonth() + 1);
          return end;
        })(),
      updatedAt: new Date(),
    },
  });

  // Sync CDN script so real script is uploaded (subscription restored/paid)
  const siteId = site.siteId;
  if (siteId) {
    import("@/lib/script-generator")
      .then(({ syncSiteScriptWithSubscription }) => syncSiteScriptWithSubscription(siteId))
      .catch((err) => console.error("[Webhook] CDN sync failed:", err));
  }

  console.log(`[Webhook] Transaction ${transaction.id} completed, subscription ${dbSubscription.id} updated to ${newStatus}`);
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

  const dbSubscriptionWithSite = await prisma.subscription.findFirst({
    where: { paddleSubscriptionId: subscriptionId },
    include: { site: true },
  });

  if (!dbSubscriptionWithSite) {
    console.warn(`[Webhook] Subscription not found: ${subscriptionId}`);
    return;
  }

  // Update status to payment_failed
  await prisma.subscription.update({
    where: { id: dbSubscriptionWithSite.id },
    data: {
      status: "payment_failed",
      updatedAt: new Date(),
    },
  });

  // Sync CDN script: upload blank so banner stops
  const siteId = dbSubscriptionWithSite.site?.siteId;
  if (siteId) {
    import("@/lib/script-generator")
      .then(({ syncSiteScriptWithSubscription }) => syncSiteScriptWithSubscription(siteId))
      .catch((err) => console.error("[Webhook] CDN sync failed:", err));
  }
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
    include: { site: true },
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

  // Sync CDN script: upload blank so banner stops
  const siteId = dbSubscription.site?.siteId;
  if (siteId) {
    import("@/lib/script-generator")
      .then(({ syncSiteScriptWithSubscription }) => syncSiteScriptWithSubscription(siteId))
      .catch((err) => console.error("[Webhook] CDN sync failed:", err));
  }
}
