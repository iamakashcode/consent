import { prisma } from "./prisma";
import { PLAN_TRIAL_DAYS } from "./razorpay";

/**
 * Check if a subscription is active (including trial period)
 * Returns { isActive: boolean, reason?: string }
 */
export async function isSubscriptionActive(userId) {
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
      select: {
        plan: true,
        status: true,
        currentPeriodEnd: true,
        trialEndAt: true,
      },
    });

    if (!subscription) {
      return { isActive: false, reason: "No subscription found" };
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
 * Get subscription with active status check
 */
export async function getSubscriptionWithStatus(userId) {
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription) {
      return { subscription: null, isActive: false };
    }

    const statusCheck = await isSubscriptionActive(userId);
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
