import { prisma } from "./prisma";
import { PLAN_TRIAL_DAYS } from "./razorpay";

/**
 * Check if a subscription is active for a site (including trial period)
 * Returns { isActive: boolean, reason?: string }
 * @param {string} siteId - Can be either public siteId or database ID
 */
export async function isSubscriptionActive(siteId) {
  try {
    // First, try to find the site to get the database ID
    // siteId can be either the public siteId or the database ID
    let siteDbId = siteId;
    
    // Try to find site by public siteId first
    const site = await prisma.site.findFirst({
      where: {
        OR: [
          { siteId: siteId }, // Public siteId
          { id: siteId },     // Database ID
        ],
      },
      select: { id: true, siteId: true },
    });

    if (site) {
      // Use the database ID for subscription lookup
      siteDbId = site.id;
    }

    // Now look up subscription using database ID
    const subscription = await prisma.subscription.findUnique({
      where: { siteId: siteDbId },
      select: {
        plan: true,
        status: true,
        currentPeriodEnd: true,
        trialEndAt: true,
      },
    });

    if (!subscription) {
      return { isActive: false, reason: "No subscription found for this domain" };
    }

    // Check if status is active
    if (subscription.status !== "active") {
      return { isActive: false, reason: `Subscription status: ${subscription.status}` };
    }

    const now = new Date();

    // Check if in trial period (for basic plan)
    if (subscription.trialEndAt && subscription.plan === "basic") {
      if (now < subscription.trialEndAt) {
        return { isActive: true, reason: "In trial period" };
      } else {
        // Trial expired - check if payment period is active
        if (subscription.currentPeriodEnd && now < subscription.currentPeriodEnd) {
          return { isActive: true, reason: "Trial expired but payment period active" };
        } else {
          return { isActive: false, reason: "Trial expired and no active payment period" };
        }
      }
    }

    // For non-trial plans, check if payment period is active
    if (subscription.currentPeriodEnd) {
      if (now < subscription.currentPeriodEnd) {
        return { isActive: true, reason: "Payment period active" };
      } else {
        return { isActive: false, reason: "Payment period expired" };
      }
    }

    // If no period end date, assume active (legacy subscriptions)
    return { isActive: true, reason: "No period end date (legacy)" };
  } catch (error) {
    console.error("Error checking subscription status:", error);
    // On error, allow access (fail open) but log the error
    return { isActive: true, reason: "Error checking subscription (allowed)" };
  }
}

/**
 * Get subscription with active status check for a site
 * @param {string} siteId - Can be either public siteId or database ID
 */
export async function getSubscriptionWithStatus(siteId) {
  try {
    // First, try to find the site to get the database ID
    let siteDbId = siteId;
    
    const site = await prisma.site.findFirst({
      where: {
        OR: [
          { siteId: siteId }, // Public siteId
          { id: siteId },     // Database ID
        ],
      },
      select: { id: true, siteId: true },
    });

    if (site) {
      siteDbId = site.id;
    }

    const subscription = await prisma.subscription.findUnique({
      where: { siteId: siteDbId },
    });

    if (!subscription) {
      return { subscription: null, isActive: false };
    }

    const statusCheck = await isSubscriptionActive(siteId);
    return {
      subscription,
      isActive: statusCheck.isActive,
      reason: statusCheck.reason,
    };
  } catch (error) {
    console.error("Error getting subscription:", error);
    return { subscription: null, isActive: false };
  }
}

/**
 * Check if site has exceeded page view limit for current period
 * Returns { exceeded: boolean, currentViews: number, limit: number }
 * @param {string} siteId - Can be either public siteId or database ID
 */
export async function checkPageViewLimit(siteId) {
  try {
    // First, try to find the site to get the database ID
    // siteId can be either the public siteId or the database ID
    let siteDbId = siteId;
    
    // Try to find site by public siteId first
    const site = await prisma.site.findFirst({
      where: {
        OR: [
          { siteId: siteId }, // Public siteId
          { id: siteId },     // Database ID
        ],
      },
      select: { id: true, siteId: true },
    });

    if (site) {
      // Use the database ID for subscription lookup
      siteDbId = site.id;
    }

    // Now look up subscription using database ID
    const subscription = await prisma.subscription.findUnique({
      where: { siteId: siteDbId },
      select: {
        plan: true,
        currentPeriodStart: true,
        currentPeriodEnd: true,
      },
    });

    if (!subscription) {
      return { exceeded: true, currentViews: 0, limit: 0, reason: "No subscription found" };
    }

    const { PLAN_PAGE_VIEW_LIMITS } = await import("./razorpay");
    const limit = PLAN_PAGE_VIEW_LIMITS[subscription.plan] || 0;

    if (limit === Infinity) {
      return { exceeded: false, currentViews: 0, limit: Infinity };
    }

    // Count page views for current period
    const periodStart = subscription.currentPeriodStart || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const periodEnd = subscription.currentPeriodEnd || new Date();

    // Use database ID for page view count
    const currentViews = await prisma.pageView.count({
      where: {
        siteId: siteDbId,
        viewedAt: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
    });

    return {
      exceeded: currentViews >= limit,
      currentViews,
      limit,
      remaining: limit - currentViews,
    };
  } catch (error) {
    console.error("Error checking page view limit:", error);
    return { exceeded: false, currentViews: 0, limit: 0, reason: "Error checking limit" };
  }
}

/**
 * Calculate trial end date based on plan
 */
export function calculateTrialEndDate(plan) {
  const trialDays = PLAN_TRIAL_DAYS[plan] || 0;
  if (trialDays === 0) {
    return null;
  }

  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + trialDays);
  return trialEnd;
}
