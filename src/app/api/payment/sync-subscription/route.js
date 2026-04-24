import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import {
  fetchPaddleSubscription,
  fetchPaddleTransaction,
  inferPlanFromPaddleSubscription,
  inferPlanFromPaddlePriceById,
  resolvePlanAndBillingFromTransaction,
} from "@/lib/paddle";
import { prisma } from "@/lib/prisma";
import { clearUserTrialFields, startUserTrial } from "@/lib/subscription";
import { syncSiteScriptWithSubscription } from "@/lib/script-generator";

/**
 * Sync subscription status from Paddle
 * Called after user returns from Paddle payment page
 */
export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { subscriptionId, siteId } = await req.json();

    if (!subscriptionId) {
      return Response.json(
        { error: "Subscription ID is required" },
        { status: 400 }
      );
    }

    // Find subscription by siteId, Paddle subscription ID, or Paddle transaction ID (return URL may have any of these)
    let dbSubscription = null;
    let siteFromSiteLookup = null;
    if (siteId) {
      const site = await prisma.site.findFirst({
        where: {
          OR: [{ siteId: siteId }, { id: siteId }],
          userId: session.user.id,
        },
        include: {
          subscription: true,
          user: { select: { trialEndAt: true, trialStartedAt: true } },
        },
      });

      if (site?.subscription) {
        siteFromSiteLookup = site;
        dbSubscription = {
          ...site.subscription,
          site: {
            id: site.id,
            userId: site.userId,
            siteId: site.siteId,
            domain: site.domain,
          },
        };
      }
    }

    if (!dbSubscription) {
      dbSubscription = await prisma.subscription.findFirst({
        where: {
          OR: [
            { paddleSubscriptionId: subscriptionId },
            { paddleTransactionId: subscriptionId },
          ],
        },
        include: { site: true },
      });
    }

    if (!dbSubscription) {
      return Response.json(
        { error: "Subscription not found" },
        { status: 404 }
      );
    }

    // Verify user owns this subscription
    if (dbSubscription.site?.userId !== session.user.id) {
      return Response.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    // Get site and user info first
    const site = siteFromSiteLookup
      ? siteFromSiteLookup
      : await prisma.site.findUnique({
          where: { id: dbSubscription.siteId },
          include: { user: { select: { trialEndAt: true, trialStartedAt: true } } },
        });

    if (!site) {
      return Response.json(
        { error: "Site not found" },
        { status: 404 }
      );
    }

    const firstSite = await prisma.site.findFirst({
      where: { userId: site.userId },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    const isFirstDomain = firstSite?.id === site.id;

    async function finalizeFromPaidTransaction(txn) {
      const resolved = await resolvePlanAndBillingFromTransaction(txn, dbSubscription);
      const billingPeriod = txn.billing_period || txn.billingPeriod;
      const periodStart = billingPeriod?.starts_at
        ? new Date(billingPeriod.starts_at)
        : new Date();
      const periodEnd = billingPeriod?.ends_at
        ? new Date(billingPeriod.ends_at)
        : (() => {
            const end = new Date();
            end.setMonth(end.getMonth() + 1);
            return end;
          })();

      let newStatus = "active";
      if (!resolved.upgrade && isFirstDomain && dbSubscription.status === "pending") {
        newStatus = "trial";
      }

      const updated = await prisma.subscription.update({
        where: { id: dbSubscription.id },
        data: {
          plan: resolved.plan,
          billingInterval: resolved.billingInterval,
          status: newStatus,
          paddleSubscriptionId:
            txn.subscription_id || txn.subscriptionId || dbSubscription.paddleSubscriptionId,
          paddleTransactionId: txn.id || dbSubscription.paddleTransactionId,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          updatedAt: new Date(),
        },
      });

      if (newStatus === "trial") {
        await startUserTrial(site.userId);
      } else if (resolved.upgrade && site.userId) {
        await clearUserTrialFields(site.userId).catch((e) =>
          console.warn("[Sync] Failed to clear user trial after upgrade fallback:", e?.message)
        );
      }
      await syncSiteScriptWithSubscription(site.siteId).catch((e) =>
        console.warn("[Sync] Failed to sync site script after transaction fallback:", e?.message)
      );

      return updated;
    }

    // Resolve Paddle subscription: we may have been given a transaction ID (return URL)
    let transactionForFallback = null;
    const incomingLookupId = String(subscriptionId || "").trim();
    const incomingLooksLikeTransactionId =
      incomingLookupId.startsWith("txn_") || incomingLookupId === dbSubscription.paddleTransactionId;

    // IMPORTANT: For upgrade flows we now keep old paddleSubscriptionId until payment succeeds.
    // So if return payload contains transaction_id, prefer transaction data first.
    if (incomingLooksLikeTransactionId) {
      try {
        transactionForFallback = await fetchPaddleTransaction(incomingLookupId);
        const txnStatus = String(transactionForFallback?.status || "").toLowerCase();
        const txnIsFinal = ["completed", "billed", "paid"].includes(txnStatus);
        if (txnIsFinal) {
          const updated = await finalizeFromPaidTransaction(transactionForFallback);
          return Response.json({
            success: true,
            subscription: updated,
            site: {
              siteId: site.siteId,
              domain: site.domain,
            },
            paddleStatus: transactionForFallback.status,
            message: `Subscription synced from transaction. Status: ${updated.status}`,
          });
        }
      } catch (e) {
        console.warn("[Sync] Could not fetch incoming transaction before subscription sync:", e.message);
      }
    }

    let paddleSubId = dbSubscription.paddleSubscriptionId;
    if (!paddleSubId) {
      try {
        const txn = transactionForFallback || await fetchPaddleTransaction(subscriptionId);
        transactionForFallback = txn;
        paddleSubId = txn.subscription_id || txn.subscriptionId;
        if (paddleSubId && !dbSubscription.paddleSubscriptionId) {
          await prisma.subscription.update({
            where: { id: dbSubscription.id },
            data: { paddleSubscriptionId: paddleSubId, updatedAt: new Date() },
          });
          dbSubscription = { ...dbSubscription, paddleSubscriptionId: paddleSubId };
        }
      } catch (e) {
        console.warn("[Sync] Could not resolve subscription from transaction:", e.message);
      }
    }
    if (!paddleSubId) {
      paddleSubId = subscriptionId;
    }

    let paddleStatus;
    let paddleSub;
    try {
      paddleSub = await fetchPaddleSubscription(paddleSubId);
      paddleStatus = paddleSub.status;
      console.log(`[Sync] Paddle subscription ${paddleSubId} status: ${paddleStatus}`);
    } catch (error) {
      // Fallback path for successful payments where subscription propagation lags:
      // use transaction details to finalize DB plan/status immediately.
      try {
        const txn =
          transactionForFallback ||
          await fetchPaddleTransaction(subscriptionId).catch(() => null) ||
          await fetchPaddleTransaction(paddleSubId).catch(() => null);
        const txnStatus = String(txn?.status || "").toLowerCase();
        const txnIsFinal = ["completed", "billed", "paid"].includes(txnStatus);
        const customData = txn?.custom_data || {};
        const upgradeFlagRaw =
          customData?.upgrade ??
          customData?.isUpgrade ??
          customData?.upgradeFlow;
        const isUpgradeAttempt =
          upgradeFlagRaw === true ||
          String(upgradeFlagRaw || "").toLowerCase() === "true" ||
          String(upgradeFlagRaw || "") === "1";

        // Abandoned upgrade checkout: keep user's current domain serving instead of leaving it stuck in pending.
        // This is safe because transaction is not in a paid/final state and the previous plan remains in DB.
        if (txn && !txnIsFinal && dbSubscription.status === "pending" && isUpgradeAttempt) {
          const userTrialStillValid =
            isFirstDomain &&
            !!(site.user?.trialEndAt && new Date() < new Date(site.user.trialEndAt));
          const restoredStatus = userTrialStillValid ? "trial" : "active";
          const restored = await prisma.subscription.update({
            where: { id: dbSubscription.id },
            data: {
              status: restoredStatus,
              paddleTransactionId: null,
              updatedAt: new Date(),
            },
          });
          await syncSiteScriptWithSubscription(site.siteId).catch((e) =>
            console.warn("[Sync] Failed to sync site script after abandoned-upgrade restore:", e?.message)
          );
          return Response.json({
            success: true,
            subscription: restored,
            site: {
              siteId: site.siteId,
              domain: site.domain,
            },
            paddleStatus: txn.status,
            message: "Abandoned upgrade checkout detected; restored current active subscription.",
          });
        }

        if (txn && txnIsFinal) {
          const updated = await finalizeFromPaidTransaction(txn);

          return Response.json({
            success: true,
            subscription: updated,
            site: {
              siteId: site.siteId,
              domain: site.domain,
            },
            paddleStatus: txn.status,
            message: `Subscription synced from transaction. Status: ${updated.status}`,
          });
        }
      } catch (fallbackError) {
        console.warn("[Sync] Transaction fallback failed:", fallbackError?.message);
      }

      console.error("[Sync] Error fetching from Paddle:", error);
      return Response.json(
        { error: "Could not fetch subscription from Paddle" },
        { status: 500 }
      );
    }

    let inferred = inferPlanFromPaddleSubscription(paddleSub);
    if (!inferred && dbSubscription.paddlePriceId) {
      inferred = await inferPlanFromPaddlePriceById(dbSubscription.paddlePriceId);
    }
    const currentPlan = String(dbSubscription.plan || "").toLowerCase();
    const currentInterval = String(dbSubscription.billingInterval || "").toLowerCase();
    const incomingPlan = String(inferred?.plan || "").toLowerCase();
    const incomingInterval = String(inferred?.billingInterval || "").toLowerCase();
    const planChangedOnPaidSync =
      !!incomingPlan &&
      !!currentPlan &&
      (incomingPlan !== currentPlan || (incomingInterval && incomingInterval !== currentInterval));

    // Map Paddle status to our status
    let newStatus = dbSubscription.status;
    let shouldStartTrial = false;

    switch (paddleStatus) {
      case "active":
        // Do not map Paddle "active" back to DB "trial" just because user.trialEndAt is still set (post-upgrade bug).
        if (dbSubscription.status === "pending" && !planChangedOnPaidSync) {
          // Payment just completed: first domain -> trial; second+ domain -> active
          if (isFirstDomain) {
            newStatus = "trial";
            shouldStartTrial = true;
          } else {
            newStatus = "active";
            shouldStartTrial = false;
          }
        } else {
          newStatus = "active";
        }
        break;
      case "trialing":
        newStatus = isFirstDomain ? "trial" : "active";
        shouldStartTrial = isFirstDomain;
        break;
      case "past_due":
      case "paused":
        newStatus = "payment_failed";
        break;
      case "canceled":
        newStatus = "cancelled";
        break;
      default:
        console.warn(`[Sync] Unknown Paddle status: ${paddleStatus}`);
    }

    const periodStart =
      paddleSub.current_billing_period?.starts_at ||
      paddleSub.current_period_starts_at ||
      null;
    const periodEnd =
      paddleSub.current_billing_period?.ends_at ||
      paddleSub.current_period_ends_at ||
      null;

    const updated = await prisma.subscription.update({
      where: { id: dbSubscription.id },
      data: {
        status: newStatus,
        currentPeriodStart: periodStart ? new Date(periodStart) : null,
        currentPeriodEnd: periodEnd ? new Date(periodEnd) : null,
        ...(inferred
          ? {
              plan: inferred.plan,
              billingInterval: inferred.billingInterval,
              ...(inferred.paddlePriceId ? { paddlePriceId: inferred.paddlePriceId } : {}),
            }
          : {}),
        updatedAt: new Date(),
      },
    });

    // Start user-level trial if needed (14 days for new users)
    if (shouldStartTrial) {
      await startUserTrial(site.userId);
      console.log(`[Sync] Started user trial for user ${site.userId}`);
    }
    if (site.userId && (newStatus === "active" || planChangedOnPaidSync)) {
      await clearUserTrialFields(site.userId).catch((err) =>
        console.warn("[Sync] Failed to clear user trial fields:", err?.message)
      );
    }
    await syncSiteScriptWithSubscription(site.siteId).catch((err) =>
      console.warn("[Sync] Failed to sync site script:", err?.message)
    );

    return Response.json({
      success: true,
      subscription: updated,
      site: {
        siteId: site.siteId,
        domain: site.domain,
      },
      paddleStatus,
      message: `Subscription synced. Status: ${newStatus}`,
    });
  } catch (error) {
    console.error("[Sync] Error:", error);
    return Response.json(
      { error: error.message || "Failed to sync subscription" },
      { status: 500 }
    );
  }
}
