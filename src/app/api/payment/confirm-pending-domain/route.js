import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { fetchPaddleTransaction } from "@/lib/paddle";
import { activatePendingDomain } from "@/lib/activate-pending-domain";
import { prisma } from "@/lib/prisma";

/**
 * Confirm a pending-domain payment when the user returns from Paddle checkout.
 * If the webhook didn't run (e.g. local dev, URL not reachable), this creates the Site + Subscription
 * so the domain is added as soon as the user lands on the success page.
 * Call with transactionId (required); siteId is optional (we can find it from PendingDomain).
 */
export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const transactionId = body.transactionId ? String(body.transactionId).trim() : null;
    const siteIdParam = body.siteId ? String(body.siteId).trim() : null;

    if (!transactionId) {
      return Response.json(
        { error: "transactionId is required" },
        { status: 400 }
      );
    }

    console.log("[confirm-pending-domain] Called with transactionId:", transactionId, "siteId param:", siteIdParam || "(none)");

    // 1) Find PendingDomain by the Paddle transaction ID we stored at checkout (works even without siteId)
    const pending = await prisma.pendingDomain.findFirst({
      where: {
        paddleTransactionId: transactionId,
        userId: session.user.id,
      },
    });

    if (pending) {
      console.log("[confirm-pending-domain] Found PendingDomain:", pending.domain, "siteId:", pending.siteId);
      // 1b) If Site already exists for this pending's siteId (webhook already ran), return success
      const existingSite = await prisma.site.findFirst({
        where: { siteId: pending.siteId, userId: session.user.id },
        include: { subscription: true },
      });
      if (existingSite?.subscription) {
        return Response.json({
          success: true,
          alreadyActivated: true,
          site: { siteId: existingSite.siteId, domain: existingSite.domain },
          subscription: { status: existingSite.subscription.status },
        });
      }
    } else {
      console.log("[confirm-pending-domain] No PendingDomain with paddleTransactionId:", transactionId);
      // No PendingDomain for this transaction - maybe already activated or not a pending-domain flow
      if (siteIdParam) {
        const existingSite = await prisma.site.findFirst({
          where: { siteId: siteIdParam, userId: session.user.id },
          include: { subscription: true },
        });
        if (existingSite?.subscription) {
          return Response.json({
            success: true,
            alreadyActivated: true,
            site: { siteId: existingSite.siteId, domain: existingSite.domain },
            subscription: { status: existingSite.subscription.status },
          });
        }
      }
      return Response.json(
        { error: "No pending domain found for this payment. It may already be activated or the payment was for a different flow." },
        { status: 404 }
      );
    }

    // 3) Verify with Paddle that the transaction is paid
    let transaction;
    try {
      transaction = await fetchPaddleTransaction(transactionId);
    } catch (err) {
      console.error("[confirm-pending-domain] Paddle fetch failed:", err);
      return Response.json(
        { error: "Could not verify payment with Paddle" },
        { status: 502 }
      );
    }
    const txnStatus = (transaction.status || "").toLowerCase();
    console.log("[confirm-pending-domain] Paddle transaction status:", transaction.status);
    if (txnStatus !== "paid" && txnStatus !== "completed") {
      return Response.json(
        { error: `Payment not completed yet. Status: ${transaction.status}` },
        { status: 400 }
      );
    }

    // 4) Create Site + Subscription and delete PendingDomain
    try {
      console.log("[confirm-pending-domain] Activating pending domain:", pending.domain);
      const result = await activatePendingDomain(pending, transaction);
      console.log("[confirm-pending-domain] Success – Site created:", result.site.siteId);
      return Response.json({
        success: true,
        site: { siteId: result.site.siteId, domain: result.site.domain },
        subscription: { status: result.subscription.status },
      });
    } catch (err) {
      console.error("[confirm-pending-domain] Activate failed:", err);
      return Response.json(
        { error: err.message || "Failed to activate domain" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[confirm-pending-domain] Error:", error);
    return Response.json(
      { error: error.message || "Failed to confirm payment" },
      { status: 500 }
    );
  }
}
