import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import {
  ADDON_BRANDING_PRICE_CENTS,
  ADDON_BRANDING_PRODUCT_NAME,
  getOrCreatePaddleAddonProduct,
  getOrCreatePaddleAddonPrice,
  addBrandingAddonToSubscription,
} from "@/lib/paddle";
import { prisma } from "@/lib/prisma";

/**
 * Create checkout for add-on (e.g. Remove branding - EUR 3/mo)
 * Body: { siteId, addonType: 'remove_branding' }
 */
export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { siteId, addonType = "remove_branding" } = await req.json();

    if (addonType !== "remove_branding") {
      return Response.json({ error: "Invalid add-on type" }, { status: 400 });
    }

    if (!siteId) {
      return Response.json({ error: "Site ID is required" }, { status: 400 });
    }

    const site = await prisma.site.findFirst({
      where: {
        OR: [{ siteId }, { id: siteId }],
        userId: session.user.id,
      },
      include: { subscription: true },
    });

    if (!site) {
      return Response.json({ error: "Site not found" }, { status: 404 });
    }

    if (!site.subscription) {
      return Response.json(
        { error: "Subscribe to a plan first, then you can add the branding removal add-on." },
        { status: 400 }
      );
    }

    const subStatus = (site.subscription.status || "").toLowerCase();
    if (subStatus !== "active" && subStatus !== "trial") {
      return Response.json(
        { error: "Your plan subscription must be active (or in trial) to add the branding removal add-on." },
        { status: 400 }
      );
    }

    if (site.subscription.removeBrandingAddon) {
      return Response.json(
        { error: "You already have the branding removal add-on for this domain." },
        { status: 400 }
      );
    }

    const paddleProduct = await getOrCreatePaddleAddonProduct(ADDON_BRANDING_PRODUCT_NAME);
    const billingInterval = String(site.subscription.billingInterval || "monthly").toLowerCase();
    const paddlePrice = await getOrCreatePaddleAddonPrice(
      paddleProduct.id,
      ADDON_BRANDING_PRICE_CENTS,
      billingInterval === "yearly" ? "yearly" : "monthly"
    );

    if (!site.subscription.paddleSubscriptionId) {
      return Response.json(
        { error: "Primary Paddle subscription not ready yet for this domain. Please try again in a moment." },
        { status: 409 }
      );
    }

    await addBrandingAddonToSubscription(site.subscription.paddleSubscriptionId, paddlePrice.id);

    await prisma.subscription.update({
      where: { siteId: site.id },
      data: {
        removeBrandingAddon: true,
        // No separate addon subscription now; addon is attached to the main subscription for co-termed billing.
        paddleAddonSubscriptionId: null,
        updatedAt: new Date(),
      },
    });

    try {
      const { syncSiteScriptWithSubscription } = await import("@/lib/script-generator");
      await syncSiteScriptWithSubscription(site.siteId);
    } catch (err) {
      console.error("[Create Addon Checkout] CDN sync after addon:", err);
    }

    return Response.json({
      success: true,
      addonActivated: true,
      siteId: site.siteId,
      message: "White-label addon activated on your current subscription cycle.",
    });
  } catch (error) {
    console.error("[Create Addon Checkout] Error:", error);
    return Response.json(
      { error: error.message || "Failed to create add-on checkout" },
      { status: 500 }
    );
  }
}
