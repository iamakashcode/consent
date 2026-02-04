import { prisma } from "./prisma";
import { PLAN_PAGE_VIEW_LIMITS, PLAN_TRIAL_DAYS } from "./paddle";

/**
 * Check if a domain/site has an active subscription or trial.
 * Free trial applies only to the user's first domain (oldest by createdAt); other domains require a paid subscription.
 * @param {string} siteId - Can be public siteId or database ID
 * @returns {Promise<{isActive: boolean, reason: string, subscription?: object, site?: object, user?: object}>}
 */
export async function isDomainActive(siteId) {
  try {
    // Find site by public siteId or database ID, include user for trial check
    const site = await prisma.site.findFirst({
      where: {
        OR: [
          { siteId: siteId },
          { id: siteId },
        ],
      },
      include: {
        subscription: true,
        user: {
          select: {
            id: true,
            trialStartedAt: true,
            trialEndAt: true,
          },
        },
      },
    });

    if (!site) {
      return { isActive: false, reason: "Site not found" };
    }

    const subscription = site.subscription;
    const user = site.user;
    const now = new Date();

    // User trial applies only to the user's first domain (oldest site by createdAt)
    const userTrialActive = user?.trialEndAt && now < new Date(user.trialEndAt);
    let isFirstDomain = false;
    if (userTrialActive && user?.id) {
      const firstSite = await prisma.site.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: "asc" },
        select: { id: true },
      });
      isFirstDomain = firstSite?.id === site.id;
    }

    // Check user-level trial only for first domain (14 days for new users)
    if (userTrialActive && isFirstDomain) {
      const trialEnd = new Date(user.trialEndAt);
      const daysLeft = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));
      return {
        isActive: true,
        reason: "user_trial",
        site,
        subscription,
        user,
        trialDaysLeft: daysLeft,
        trialEndAt: user.trialEndAt,
      };
    }

    // No subscription at all
    if (!subscription) {
      return { isActive: false, reason: "No subscription", site, user };
    }

    // Check subscription status
    const status = subscription.status?.toLowerCase();

    // Pending - payment method not yet added
    // BUT: Allow access if user trial is active for this (first) domain OR if payment was recently completed (within last 5 minutes)
    if (status === "pending") {
      if (userTrialActive && isFirstDomain) {
        return {
          isActive: true,
          reason: "user_trial (pending payment activation)",
          site,
          subscription,
          user,
          trialDaysLeft: Math.ceil((new Date(user.trialEndAt) - now) / (1000 * 60 * 60 * 24)),
          trialEndAt: user.trialEndAt,
        };
      }

      // Check if subscription was recently created (within last 5 minutes) - payment might be processing
      const subscriptionAge = now - new Date(subscription.createdAt || subscription.updatedAt || 0);
      const fiveMinutesAgo = 5 * 60 * 1000; // 5 minutes in milliseconds

      if (subscriptionAge < fiveMinutesAgo && (subscription.paddleTransactionId || subscription.paddleSubscriptionId)) {
        // Payment was recently initiated, allow access temporarily while webhook processes
        return {
          isActive: true,
          reason: "Payment processing (recent transaction)",
          site,
          subscription,
          user,
        };
      }

      return { isActive: false, reason: "Payment setup required", site, subscription, user };
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
          user,
          expiresAt: subscription.currentPeriodEnd,
        };
      }
      return { isActive: false, reason: `Subscription ${status}`, site, subscription, user };
    }

    // Payment failed
    if (status === "payment_failed") {
      return { isActive: false, reason: "Payment failed", site, subscription, user };
    }

    // Active subscription - check period
    if (status === "active") {
      if (subscription.currentPeriodEnd && now > new Date(subscription.currentPeriodEnd)) {
        return { isActive: false, reason: "Period expired", site, subscription, user };
      }
      return { isActive: true, reason: "active", site, subscription, user };
    }

    // Trial status (for backward compatibility, but user trial only for first domain)
    if (status === "trial") {
      if (userTrialActive && isFirstDomain) {
        const trialEnd = new Date(user.trialEndAt);
        const daysLeft = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));
        return {
          isActive: true,
          reason: "user_trial",
          site,
          subscription,
          user,
          trialDaysLeft: daysLeft,
          trialEndAt: user.trialEndAt,
        };
      }
      // If subscription is trial but user trial ended, check subscription period
      if (subscription.currentPeriodEnd && now < new Date(subscription.currentPeriodEnd)) {
        return { isActive: true, reason: "active", site, subscription, user };
      }
    }

    // Default: allow access if status is unknown (fail-open)
    return { isActive: true, reason: "active", site, subscription, user };

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
    const statusCheck = await isDomainActive(siteId);

    if (!statusCheck.site) {
      return { subscription: null, isActive: false, site: null, user: null };
    }

    return {
      subscription: statusCheck.subscription,
      site: statusCheck.site,
      user: statusCheck.user,
      isActive: statusCheck.isActive,
      reason: statusCheck.reason,
      trialDaysLeft: statusCheck.trialDaysLeft,
      trialEndAt: statusCheck.trialEndAt,
    };
  } catch (error) {
    console.error("Error getting subscription:", error);
    return { subscription: null, isActive: false, site: null, user: null };
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

    // Get period start/end (use subscription period or default to 30 days ago)
    const periodStart = subscription.currentPeriodStart ||
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const periodEnd = subscription.currentPeriodEnd || new Date();
    const periodStartMonth = new Date(Date.UTC(periodStart.getUTCFullYear(), periodStart.getUTCMonth(), 1));

    // Sum view counts from SiteViewCount (one row per site per month; no per-view rows)
    const counts = await prisma.siteViewCount.findMany({
      where: {
        siteId: site.id,
        periodStart: { gte: periodStartMonth, lte: periodEnd },
      },
      select: { count: true },
    });
    const currentViews = counts.reduce((sum, row) => sum + (row.count || 0), 0);

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
 * Start user-level trial (14 days for new users)
 * All domains share this trial period
 * @param {string} userId - User ID
 * @returns {Promise<{trialStartedAt: Date, trialEndAt: Date, trialDays: number}>}
 */
export async function startUserTrial(userId) {
  try {
    const trialDays = 14; // 14-day trial for all new users
    const now = new Date();
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + trialDays);

    // Check if user already has a trial
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { trialEndAt: true },
    });

    // If user already has an active trial, don't start a new one
    if (user?.trialEndAt && new Date() < new Date(user.trialEndAt)) {
      console.log(`[Subscription] User ${userId} already has an active trial`);
      return {
        trialStartedAt: user.trialStartedAt || now,
        trialEndAt: user.trialEndAt,
        trialDays: Math.ceil((new Date(user.trialEndAt) - now) / (1000 * 60 * 60 * 24)),
      };
    }

    // Update user with trial dates
    await prisma.user.update({
      where: { id: userId },
      data: {
        trialStartedAt: now,
        trialEndAt: trialEnd,
      },
    });

    console.log(`[Subscription] Started ${trialDays}-day user trial for user ${userId}, ends: ${trialEnd.toISOString()}`);

    return { trialStartedAt: now, trialEndAt: trialEnd, trialDays };
  } catch (error) {
    console.error("Error starting user trial:", error);
    throw error;
  }
}

/**
 * Start trial for a domain (DEPRECATED - now using user-level trial)
 * Kept for backward compatibility
 * @param {string} siteDbId - Database ID of the site
 * @param {string} plan - Plan name
 */
export async function startDomainTrial(siteDbId, plan) {
  try {
    // Get site to find user
    const site = await prisma.site.findUnique({
      where: { id: siteDbId },
      select: { userId: true },
    });

    if (!site) {
      throw new Error("Site not found");
    }

    // Start user-level trial instead
    const userTrial = await startUserTrial(site.userId);

    // Update subscription status to trial
    await prisma.subscription.update({
      where: { siteId: siteDbId },
      data: {
        status: "trial",
        currentPeriodStart: userTrial.trialStartedAt,
        currentPeriodEnd: userTrial.trialEndAt,
      },
    });

    console.log(`[Subscription] Updated subscription ${siteDbId} to trial status (using user trial)`);

    return userTrial;
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
  const trialDays = PLAN_TRIAL_DAYS[plan] || 14;
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
 * Get all subscriptions for a user (across all their domains).
 * Free trial applies only to the user's first domain (oldest by createdAt).
 * @param {string} userId - User ID
 */
export async function getUserSubscriptions(userId) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { trialStartedAt: true, trialEndAt: true },
    });

    const sites = await prisma.site.findMany({
      where: { userId },
      include: { subscription: true },
      orderBy: { createdAt: "desc" },
    });

    const now = new Date();
    // First domain = oldest by createdAt (only that one gets user trial benefit)
    const firstSite = await prisma.site.findFirst({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    const firstSiteId = firstSite?.id ?? null;
    const userTrialInFuture = user?.trialEndAt && now < new Date(user.trialEndAt);

    const subscriptions = sites
      .filter(site => site.subscription)
      .map(site => {
        const subscription = site.subscription;
        const status = subscription.status?.toLowerCase();
        const isFirstDomain = site.id === firstSiteId;

        let isActive = false;
        // User trial counts as active only for the first domain
        if (userTrialInFuture && isFirstDomain) {
          isActive = true;
        } else if (status === "active") {
          if (subscription.currentPeriodEnd && now < new Date(subscription.currentPeriodEnd)) {
            isActive = true;
          }
        } else if (status === "trial") {
          if (subscription.currentPeriodEnd && now < new Date(subscription.currentPeriodEnd)) {
            isActive = true;
          }
        }

        return {
          siteId: site.siteId,
          siteDbId: site.id,
          domain: site.domain,
          subscription: site.subscription,
          trialEndAt: user?.trialEndAt || null,
          trialStartedAt: user?.trialStartedAt || null,
          isActive,
        };
      });

    // Only show user trial on billing when first domain has an active subscription – no plan = no trial banner
    const firstDomainHasActiveTrial =
      firstSiteId &&
      user?.trialEndAt &&
      now < new Date(user.trialEndAt) &&
      subscriptions.some(s => s.siteDbId === firstSiteId && s.isActive);
    const userTrialActive = Boolean(firstDomainHasActiveTrial);
    const userTrialEndAt = userTrialActive ? user.trialEndAt : null;
    const userTrialDaysLeft =
      userTrialActive && user?.trialEndAt
        ? Math.max(0, Math.ceil((new Date(user.trialEndAt) - now) / (1000 * 60 * 60 * 24)))
        : null;

    return {
      subscriptions,
      count: subscriptions.length,
      activeCount: subscriptions.filter(s => s.isActive).length,
      userTrialActive,
      userTrialEndAt,
      userTrialDaysLeft,
    };
  } catch (error) {
    console.error("Error getting user subscriptions:", error);
    return { subscriptions: [], count: 0, activeCount: 0, userTrialActive: false, userTrialEndAt: null, userTrialDaysLeft: null };
  }
}
