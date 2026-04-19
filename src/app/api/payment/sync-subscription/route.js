import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { fetchPaddleSubscription, fetchPaddleTransaction, inferPlanFromPaddleSubscription } from "@/lib/paddle";
import { prisma } from "@/lib/prisma";
import { startUserTrial, clearUserTrialFields } from "@/lib/subscription";

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
    if (siteId) {
      const site = await prisma.site.findFirst({
        where: {
          OR: [{ siteId: siteId }, { id: siteId }],
          userId: session.user.id,
        },
        include: { subscription: true },
      });

      if (site?.subscription) {
        dbSubscription = site.subscription;
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
    if (dbSubscription.site.userId !== session.user.id) {
      return Response.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    // Resolve Paddle subscription: we may have been given a transaction ID (return URL)
    let paddleSubId = dbSubscription.paddleSubscriptionId;
    if (!paddleSubId) {
      try {
        const txn = await fetchPaddleTransaction(subscriptionId);
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
      console.error("[Sync] Error fetching from Paddle:", error);
      return Response.json(
        { error: "Could not fetch subscription from Paddle" },
        { status: 500 }
      );
    }

    // Map Paddle status to our status
    let newStatus = dbSubscription.status;
    let shouldStartTrial = false;

    // Get site and user info first
    const site = await prisma.site.findUnique({
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

    switch (paddleStatus) {
      case "active":
        // Do not map Paddle "active" back to DB "trial" just because user.trialEndAt is still set (post-upgrade bug).
        if (dbSubscription.status === "pending") {
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

    const inferred = inferPlanFromPaddleSubscription(paddleSub);
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

    if (newStatus === "active" && dbSubscription.status !== "pending") {
      await clearUserTrialFields(site.userId).catch((err) =>
        console.warn("[Sync] clearUserTrialFields:", err?.message)
      );
    }

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
