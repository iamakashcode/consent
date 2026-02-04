import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import {
  ADDON_BRANDING_PRICE_CENTS,
  ADDON_BRANDING_PRODUCT_NAME,
  getOrCreatePaddleAddonProduct,
  getOrCreatePaddleAddonPrice,
  getOrCreatePaddleCustomer,
  createPaddleAddonTransaction,
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

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true },
    });

    const paddleProduct = await getOrCreatePaddleAddonProduct(ADDON_BRANDING_PRODUCT_NAME);
    const paddlePrice = await getOrCreatePaddleAddonPrice(paddleProduct.id, ADDON_BRANDING_PRICE_CENTS);
    const paddleCustomer = await getOrCreatePaddleCustomer(
      user?.email || session.user.email,
      user?.name || "User"
    );

    const transaction = await createPaddleAddonTransaction(
      paddlePrice.id,
      paddleCustomer.id,
      site.id,
      addonType
    );

    const checkoutUrl = transaction.checkout?.url;
    if (!checkoutUrl) {
      return Response.json(
        { error: "Checkout URL not available. Please try again or contact support." },
        { status: 500 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || req.headers.get("origin") || `http://${req.headers.get("host")}`;
    const redirectTarget = `/banner?siteId=${site.siteId}&addon=success`;
    const returnUrl = `${baseUrl}/payment/return?transaction_id=${transaction.id}&siteId=${site.siteId}&addon=remove_branding&redirect=${encodeURIComponent(redirectTarget)}`;

    return Response.json({
      success: true,
      checkoutUrl,
      returnUrl,
      siteId: site.siteId,
      message: "Complete payment to hide branding on your consent banner.",
    });
  } catch (error) {
    console.error("[Create Addon Checkout] Error:", error);
    return Response.json(
      { error: error.message || "Failed to create add-on checkout" },
      { status: 500 }
    );
  }
}
