import { prisma } from "@/lib/prisma";
import { startUserTrial } from "@/lib/subscription";

/**
 * Create Site + Subscription from a PendingDomain and delete the pending record.
 * Used by webhook and by confirm-pending-domain API when user returns from payment.
 * @param {object} pending - PendingDomain from DB
 * @param {object} transaction - Paddle transaction (id, subscription_id, billing_period, custom_data)
 * @returns {{ site: object, subscription: object } | null} - Created site and subscription, or null on error
 */
export async function activatePendingDomain(pending, transaction) {
  const subscriptionId = transaction.subscription_id ?? transaction.subscriptionId ?? null;
  const plan = transaction.custom_data?.plan ?? pending.plan;
  const billingInterval =
    transaction.custom_data?.billingInterval ??
    transaction.custom_data?.billing_interval ??
    pending.billingInterval;
  const periodEnd = transaction.billing_period?.ends_at
    ? new Date(transaction.billing_period.ends_at)
    : (() => {
        const end = new Date();
        end.setMonth(end.getMonth() + 1);
        return end;
      })();

  const createdSite = await prisma.site.create({
    data: {
      domain: pending.domain,
      siteId: pending.siteId,
      userId: pending.userId,
      trackers: pending.trackers,
      verificationToken: pending.verificationToken,
      isVerified: false,
    },
  });
  await startUserTrial(pending.userId);
  const user = await prisma.user.findUnique({
    where: { id: pending.userId },
    select: { trialEndAt: true },
  });
  const newStatus = user?.trialEndAt && new Date() < new Date(user.trialEndAt) ? "trial" : "active";
  const createdSubscription = await prisma.subscription.create({
    data: {
      siteId: createdSite.id,
      plan,
      billingInterval,
      status: newStatus,
      paddleSubscriptionId: subscriptionId,
      paddleTransactionId: transaction.id,
      currentPeriodStart: transaction.billing_period?.starts_at
        ? new Date(transaction.billing_period.starts_at)
        : new Date(),
      currentPeriodEnd: periodEnd,
    },
  });
  await prisma.pendingDomain.delete({ where: { id: pending.id } });
  import("@/lib/script-generator")
    .then(({ syncSiteScriptWithSubscription }) => syncSiteScriptWithSubscription(createdSite.siteId))
    .catch((err) => console.error("[activate-pending-domain] CDN sync failed:", err));
  console.log(`[activate-pending-domain] PendingDomain → Site: ${createdSite.siteId} for ${pending.domain}`);
  return { site: createdSite, subscription: createdSubscription };
}
