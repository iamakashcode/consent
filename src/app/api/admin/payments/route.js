import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { fetchRecentPaddleTransactions, normalizePaddleTransactionCustomData } from "@/lib/paddle";

function parseAmountFromTransaction(txn) {
  const totals = txn?.details?.totals;
  const amountRaw =
    totals?.grand_total?.amount ??
    totals?.total?.amount ??
    totals?.subtotal?.amount ??
    totals?.grand_total ??
    totals?.total ??
    null;
  const amount = amountRaw != null ? Number(amountRaw) : 0;
  const currency =
    totals?.grand_total?.currency_code ||
    totals?.total?.currency_code ||
    totals?.subtotal?.currency_code ||
    txn?.currency_code ||
    "EUR";
  return { amountCents: Number.isFinite(amount) ? amount : 0, currency };
}

function derivePaymentType(txn, customData) {
  if (customData?.addonType || customData?.addonRemoveBranding) return "addon";
  if (customData?.upgrade) return "upgrade";
  if (customData?.pendingDomain) return "new_domain";
  return "subscription";
}

export async function GET(req) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "100", 10);
    const rawTransactions = await fetchRecentPaddleTransactions(limit);

    const subIds = Array.from(
      new Set(
        rawTransactions
          .map((t) => t.subscription_id || t.subscriptionId)
          .filter(Boolean)
          .map(String)
      )
    );

    const subs = subIds.length
      ? await prisma.subscription.findMany({
          where: { paddleSubscriptionId: { in: subIds } },
          select: {
            paddleSubscriptionId: true,
            site: { select: { siteId: true, domain: true } },
          },
        })
      : [];

    const siteByPaddleSubscriptionId = new Map(
      subs.map((s) => [String(s.paddleSubscriptionId), s.site])
    );

    const payments = rawTransactions.map((txn) => {
      const customData = normalizePaddleTransactionCustomData(txn.custom_data);
      const mappedSite =
        siteByPaddleSubscriptionId.get(String(txn.subscription_id || txn.subscriptionId || "")) || null;
      const { amountCents, currency } = parseAmountFromTransaction(txn);
      const paymentType = derivePaymentType(txn, customData);
      const customerEmail =
        txn?.customer?.email ||
        txn?.customer_email ||
        txn?.details?.customer?.email ||
        null;

      return {
        id: txn.id,
        status: txn.status || "unknown",
        paymentType,
        amountCents,
        amount: Number((amountCents / 100).toFixed(2)),
        currency,
        createdAt: txn.created_at || txn.createdAt || null,
        billedAt: txn.billed_at || txn.billedAt || null,
        customerId: txn.customer_id || txn.customerId || null,
        customerEmail,
        subscriptionId: txn.subscription_id || txn.subscriptionId || null,
        checkoutUrl: txn?.checkout?.url || null,
        domain: mappedSite?.domain || customData?.domain || null,
        siteId: mappedSite?.siteId || customData?.siteId || null,
      };
    });

    return Response.json({
      payments,
      count: payments.length,
    });
  } catch (error) {
    console.error("Admin payments GET error:", error);
    return Response.json(
      { error: error.message || "Failed to fetch payments" },
      { status: error.message === "Unauthorized" || error.message === "Admin access required" ? 403 : 500 }
    );
  }
}
