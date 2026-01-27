import { prisma } from "./prisma";
import { PLAN_PAGE_VIEW_LIMITS, PLAN_TRIAL_DAYS } from "./paddle";

/**
 * Check if a domain/site has an active subscription or trial
 * @param {string} siteId - Can be public siteId or database ID
 * @returns {Promise<{isActive: boolean, reason: string, subscription?: object, site?: object}>}
 */
export async function isDomainActive(siteId) {
  try {
    // Find site by public siteId or database ID
    const site = await prisma.site.findFirst({
      where: {
        OR: [
          { siteId: siteId },
          { id: siteId },
        ],
      },
      include: { subscription: true },
    });

    if (!site) {
      return { isActive: false, reason: "Site not found" };
    }

    const subscription = site.subscription;
    const now = new Date();

    // No subscription at all
    if (!subscription) {
      return { isActive: false, reason: "No subscription", site };
    }

    // Check subscription status
    const status = subscription.status?.toLowerCase();

    // Pending - payment method not yet added
    if (status === "pending") {
      return { isActive: false, reason: "Payment setup required", site, subscription };
    }

    // Cancelled or expired
    if (status === "cancelled" || status === "expired") {
      // Check if still within paid period
      if (subscription.currentPeriodEnd && now < new Date(subscription.currentPeriodEnd)) {
        return { 
          isActive: true, 
          reason: "Active until period end", 
          site, 
          subscription,
          expiresAt: subscription.currentPeriodEnd,
        };
      }
      return { isActive: false, reason: `Subscription ${status}`, site, subscription };
    }

    // Payment failed
    if (status === "payment_failed") {
      return { isActive: false, reason: "Payment failed", site, subscription };
    }

    // Check if in trial period
    if (status === "trial" || (site.trialEndAt && now < new Date(site.trialEndAt))) {
      const trialEnd = new Date(site.trialEndAt);
      const daysLeft = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));
      return { 
        isActive: true, 
        reason: "trial", 
        site, 
        subscription,
        trialDaysLeft: daysLeft,
        trialEndAt: site.trialEndAt,
      };
    }

    // Active subscription - check period
    if (status === "active") {
      if (subscription.currentPeriodEnd && now > new Date(subscription.currentPeriodEnd)) {
        return { isActive: false, reason: "Period expired", site, subscription };
      }
      return { isActive: true, reason: "active", site, subscription };
    }

    // Default: allow access if status is unknown (fail-open)
    return { isActive: true, reason: "active", site, subscription };

  } catch (error) {
    console.error("Error checking domain status:", error);
    // Fail open on errors to avoid blocking legitimate users
    return { isActive: true, reason: "Error (allowed)", error: error.message };
  }
}

/**
 * Alias for isDomainActive for backward compatibility
 */
export async function isSubscriptionActive(siteId) {
  return isDomainActive(siteId);
}

/**
 * Get subscription with full status for a site
 * @param {string} siteId - Public siteId or database ID
 */
export async function getSubscriptionWithStatus(siteId) {
  try {
    const site = await prisma.site.findFirst({
      where: {
        OR: [
          { siteId: siteId },
          { id: siteId },
        ],
      },
      include: { subscription: true },
    });

    if (!site) {
      return { subscription: null, isActive: false, site: null };
    }

    const statusCheck = await isDomainActive(siteId);
    
    return {
      subscription: site.subscription,
      site: site,
      isActive: statusCheck.isActive,
      reason: statusCheck.reason,
      trialDaysLeft: statusCheck.trialDaysLeft,
      trialEndAt: statusCheck.trialEndAt,
    };
  } catch (error) {
    console.error("Error getting subscription:", error);
    return { subscription: null, isActive: false, site: null };
  }
}

/**
 * Check if site has exceeded page view limit
 * @param {string} siteId - Public siteId or database ID
 */
export async function checkPageViewLimit(siteId) {
  try {
    const site = await prisma.site.findFirst({
      where: {
        OR: [
          { siteId: siteId },
          { id: siteId },
        ],
      },
      include: { subscription: true },
    });

    if (!site) {
      return { exceeded: true, currentViews: 0, limit: 0, reason: "Site not found" };
    }

    const subscription = site.subscription;
    if (!subscription) {
      return { exceeded: true, currentViews: 0, limit: 0, reason: "No subscription" };
    }

    const plan = subscription.plan || "basic";
    const limit = PLAN_PAGE_VIEW_LIMITS[plan] || 100000;

    // Unlimited plan
    if (limit === Infinity) {
      return { exceeded: false, currentViews: 0, limit: Infinity };
    }

    // Get period start (use subscription period or default to 30 days ago)
    const periodStart = subscription.currentPeriodStart || 
                        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Count page views in current period
    const currentViews = await prisma.pageView.count({
      where: {
        siteId: site.id,
        viewedAt: { gte: periodStart },
      },
    });

    return {
      exceeded: currentViews >= limit,
      currentViews,
      limit,
      remaining: Math.max(0, limit - currentViews),
      plan,
    };
  } catch (error) {
    console.error("Error checking page view limit:", error);
    return { exceeded: false, currentViews: 0, limit: 0, reason: "Error" };
  }
}

/**
 * Start trial for a domain (called when subscription is activated)
 * @param {string} siteDbId - Database ID of the site
 * @param {string} plan - Plan name
 */
export async function startDomainTrial(siteDbId, plan) {
  try {
    const trialDays = PLAN_TRIAL_DAYS[plan] || 7;
    const now = new Date();
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + trialDays);

    // Update site with trial dates
    await prisma.site.update({
      where: { id: siteDbId },
      data: {
        trialStartedAt: now,
        trialEndAt: trialEnd,
      },
    });

    // Update subscription status to trial
    await prisma.subscription.update({
      where: { siteId: siteDbId },
      data: {
        status: "trial",
        currentPeriodStart: now,
        currentPeriodEnd: trialEnd,
      },
    });

    console.log(`[Subscription] Started ${trialDays}-day trial for site ${siteDbId}, ends: ${trialEnd.toISOString()}`);

    return { trialStartedAt: now, trialEndAt: trialEnd, trialDays };
  } catch (error) {
    console.error("Error starting domain trial:", error);
    throw error;
  }
}

/**
 * Activate subscription after trial ends (when first payment succeeds)
 * @param {string} siteDbId - Database ID of the site
 */
export async function activateSubscription(siteDbId) {
  try {
    const now = new Date();
    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    await prisma.subscription.update({
      where: { siteId: siteDbId },
      data: {
        status: "active",
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
    });

    console.log(`[Subscription] Activated subscription for site ${siteDbId}`);

    return { currentPeriodStart: now, currentPeriodEnd: periodEnd };
  } catch (error) {
    console.error("Error activating subscription:", error);
    throw error;
  }
}

/**
 * Mark subscription as payment failed
 * @param {string} siteDbId - Database ID of the site
 */
export async function markPaymentFailed(siteDbId) {
  try {
    await prisma.subscription.update({
      where: { siteId: siteDbId },
      data: {
        status: "payment_failed",
      },
    });

    console.log(`[Subscription] Marked payment failed for site ${siteDbId}`);
  } catch (error) {
    console.error("Error marking payment failed:", error);
    throw error;
  }
}

/**
 * Cancel subscription
 * @param {string} siteDbId - Database ID of the site
 * @param {boolean} atPeriodEnd - If true, access continues until period end
 */
export async function cancelSubscription(siteDbId, atPeriodEnd = true) {
  try {
    const data = atPeriodEnd
      ? { cancelAtPeriodEnd: true }
      : { status: "cancelled", cancelAtPeriodEnd: false };

    await prisma.subscription.update({
      where: { siteId: siteDbId },
      data,
    });

    console.log(`[Subscription] Cancelled subscription for site ${siteDbId}, atPeriodEnd: ${atPeriodEnd}`);
  } catch (error) {
    console.error("Error cancelling subscription:", error);
    throw error;
  }
}

/**
 * Extend subscription period after successful recurring payment
 * @param {string} siteDbId - Database ID of the site
 */
export async function extendSubscriptionPeriod(siteDbId) {
  try {
    const now = new Date();
    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    await prisma.subscription.update({
      where: { siteId: siteDbId },
      data: {
        status: "active",
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false, // Reset cancellation if they renewed
      },
    });

    console.log(`[Subscription] Extended period for site ${siteDbId} until ${periodEnd.toISOString()}`);

    return { currentPeriodStart: now, currentPeriodEnd: periodEnd };
  } catch (error) {
    console.error("Error extending subscription period:", error);
    throw error;
  }
}

/**
 * Calculate trial end date
 * @param {string} plan - Plan name
 */
export function calculateTrialEndDate(plan) {
  const trialDays = PLAN_TRIAL_DAYS[plan] || 7;
  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + trialDays);
  return trialEnd;
}

/**
 * Check if domain is currently in trial
 * @param {string} siteId - Public siteId or database ID
 */
export async function isDomainInTrial(siteId) {
  try {
    const site = await prisma.site.findFirst({
      where: {
        OR: [
          { siteId: siteId },
          { id: siteId },
        ],
      },
      select: { trialEndAt: true },
    });

    if (!site || !site.trialEndAt) {
      return false;
    }

    return new Date() < new Date(site.trialEndAt);
  } catch (error) {
    console.error("Error checking domain trial:", error);
    return false;
  }
}

/**
 * Get all subscriptions for a user (across all their domains)
 * @param {string} userId - User ID
 */
export async function getUserSubscriptions(userId) {
  try {
    const sites = await prisma.site.findMany({
      where: { userId },
      include: { subscription: true },
      orderBy: { createdAt: "desc" },
    });

    const subscriptions = sites
      .filter(site => site.subscription)
      .map(site => ({
        siteId: site.siteId,
        siteDbId: site.id,
        domain: site.domain,
        subscription: site.subscription,
        trialEndAt: site.trialEndAt,
        trialStartedAt: site.trialStartedAt,
        isActive: site.subscription?.status === "active" || 
                  site.subscription?.status === "trial" ||
                  (site.trialEndAt && new Date() < new Date(site.trialEndAt)),
      }));

    return {
      subscriptions,
      count: subscriptions.length,
      activeCount: subscriptions.filter(s => s.isActive).length,
    };
  } catch (error) {
    console.error("Error getting user subscriptions:", error);
    return { subscriptions: [], count: 0, activeCount: 0 };
  }
}
