import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { fetchPaddleTransaction } from "@/lib/paddle";
import { activatePendingDomain } from "@/lib/activate-pending-domain";
import { prisma } from "@/lib/prisma";

/**
 * Confirm a pending-domain payment when the user returns from Paddle checkout.
 * If the webhook didn't run (e.g. local dev, URL not reachable), this creates the Site + Subscription
 * so the domain is added as soon as the user lands on the success page.
 * Call this from the payment return page when transaction_id and siteId are present.
 */
export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { transactionId, siteId } = await req.json();
    if (!transactionId || !siteId) {
      return Response.json(
        { error: "transactionId and siteId are required" },
        { status: 400 }
      );
    }

    // 1) If Site already exists for this siteId (webhook already ran), return success
    const existingSite = await prisma.site.findFirst({
      where: { siteId: String(siteId), userId: session.user.id },
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

    // 2) Find PendingDomain by the Paddle transaction ID we stored at checkout
    const pending = await prisma.pendingDomain.findFirst({
      where: {
        paddleTransactionId: String(transactionId),
        userId: session.user.id,
      },
    });
    if (!pending) {
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
    const status = (transaction.status || "").toLowerCase();
    if (status !== "paid" && status !== "completed") {
      return Response.json(
        { error: `Payment not completed yet. Status: ${transaction.status}` },
        { status: 400 }
      );
    }

    // 4) Create Site + Subscription and delete PendingDomain
    try {
      const result = await activatePendingDomain(pending, transaction);
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
