import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { fetchPaddleTransaction } from "@/lib/paddle";
import { prisma } from "@/lib/prisma";

/**
 * Verify add-on payment with Paddle and apply addon only on success.
 * Called from payment return page so addon success is shown only after verify.
 * Body: { transactionId, siteId }
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
      return Response.json({ error: "transactionId is required" }, { status: 400 });
    }

    // Fetch transaction from Paddle
    let transaction;
    try {
      transaction = await fetchPaddleTransaction(transactionId);
    } catch (err) {
      console.error("[verify-addon] Paddle fetch failed:", err);
      return Response.json(
        { success: false, error: "Could not verify payment with Paddle" },
        { status: 502 }
      );
    }

    const txnStatus = (transaction.status || "").toLowerCase();
    const successStatuses = ["paid", "completed", "ready"];
    if (!successStatuses.includes(txnStatus)) {
      return Response.json({
        success: false,
        paid: false,
        status: transaction.status,
        message: "Payment not completed yet.",
      }, { status: 200 });
    }

    const customData = transaction.custom_data || {};
    if (customData.addonType !== "remove_branding" || !customData.siteId) {
      return Response.json({
        success: false,
        error: "Not an add-on transaction or invalid data",
      }, { status: 400 });
    }

    // Ensure user owns this site (siteId in custom_data is DB id)
    const site = await prisma.site.findFirst({
      where: {
        id: customData.siteId,
        userId: session.user.id,
      },
      include: { subscription: true },
    });

    if (!site) {
      return Response.json({ error: "Site not found" }, { status: 404 });
    }
    if (!site.subscription) {
      return Response.json({ error: "No subscription for this site" }, { status: 400 });
    }

    // Apply addon (idempotent – safe if webhook already ran)
    await prisma.subscription.update({
      where: { siteId: site.id },
      data: {
        removeBrandingAddon: true,
        paddleAddonSubscriptionId: transaction.subscription_id || undefined,
        updatedAt: new Date(),
      },
    });

    // Sync CDN script so banner hides branding
    try {
      const { syncSiteScriptWithSubscription } = await import("@/lib/script-generator");
      await syncSiteScriptWithSubscription(site.siteId);
    } catch (err) {
      console.error("[verify-addon] CDN sync after addon:", err);
    }

    return Response.json({
      success: true,
      paid: true,
      siteId: site.siteId,
      message: "Add-on activated.",
    });
  } catch (error) {
    console.error("[verify-addon] Error:", error);
    return Response.json(
      { success: false, error: error.message || "Failed to verify add-on" },
      { status: 500 }
    );
  }
}
