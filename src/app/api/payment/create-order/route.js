import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import {
  PLAN_PRICING,
  getOrCreatePaddleProduct,
  getOrCreatePaddlePrice,
  getOrCreatePaddleCustomer,
  createPaddleTransaction,
  fetchPaddleSubscription,
  getSubscriptionCheckoutUrl,
} from "@/lib/paddle";
import { prisma } from "@/lib/prisma";


/**
 * Create a Paddle subscription for a domain
 * Domain-first: each domain gets its own subscription
 */
export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { plan, siteId } = await req.json();

    // Validate plan
    if (!plan || !["basic", "starter", "pro"].includes(plan)) {
      return Response.json(
        { error: "Invalid plan. Choose 'basic', 'starter', or 'pro'" },
        { status: 400 }
      );
    }

    // siteId is required for domain-first subscriptions
    if (!siteId) {
      return Response.json(
        { error: "Site ID is required. Please add a domain first." },
        { status: 400 }
      );
    }

    // Find site by public siteId or database ID
    const site = await prisma.site.findFirst({
      where: {
        OR: [
          { siteId: siteId },
          { id: siteId },
        ],
        userId: session.user.id,
      },
      include: { subscription: true },
    });

    if (!site) {
      return Response.json(
        { error: "Site not found. Please add the domain first." },
        { status: 404 }
      );
    }

    // Check if domain already has an active subscription
    if (site.subscription) {
      const status = site.subscription.status?.toLowerCase();

      // If subscription is pending, allow re-attempting payment setup
      if (status === "pending") {
        // Check if we have an existing Paddle subscription or transaction
        if (site.subscription.paddleSubscriptionId || site.subscription.paddleTransactionId) {
          try {
            // Try subscription first
            if (site.subscription.paddleSubscriptionId) {
              const existingSub = await fetchPaddleSubscription(site.subscription.paddleSubscriptionId);
              const checkoutUrl = await getSubscriptionCheckoutUrl(existingSub.id);
              if (checkoutUrl) {
                return Response.json({
                  success: true,
                  subscriptionId: existingSub.id,
                  subscriptionAuthUrl: checkoutUrl,
                  requiresPaymentSetup: true,
                  siteId: site.siteId,
                  domain: site.domain,
                  message: "Complete payment setup for your subscription.",
                });
              }
            }
            // If no subscription, transaction might still be pending
            if (site.subscription.paddleTransactionId) {
              // Transaction checkout URLs are one-time, need to create new transaction
              console.log("[Payment] Existing transaction found, will create new checkout");
            }
          } catch (error) {
            console.log("[Payment] Existing subscription not fetchable, creating new one");
            // Continue to create new transaction
          }
        }
      } else if (status === "active" || status === "trial") {
        return Response.json(
          { error: `This domain already has an active ${site.subscription.plan} subscription.` },
          { status: 400 }
        );
      } else if (status === "cancelled" && site.subscription.currentPeriodEnd) {
        const periodEnd = new Date(site.subscription.currentPeriodEnd);
        if (new Date() < periodEnd) {
          return Response.json(
            { error: `This domain has a cancelled subscription that's active until ${periodEnd.toLocaleDateString()}.` },
            { status: 400 }
          );
        }
        // Period ended, allow new subscription
      }
      // For other statuses (expired, payment_failed), allow new subscription
    }

    const amount = PLAN_PRICING[plan];

    // Get user info for Paddle
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true },
    });

    // Get or create Paddle product
    let paddleProduct;
    try {
      paddleProduct = await getOrCreatePaddleProduct(plan);
    } catch (error) {
      console.error("[Payment] Failed to get/create Paddle product:", error);
      return Response.json(
        { error: "Failed to set up subscription product. Please try again." },
        { status: 500 }
      );
    }

    // Get or create Paddle price
    let paddlePrice;
    try {
      paddlePrice = await getOrCreatePaddlePrice(paddleProduct.id, plan, amount);
    } catch (error) {
      console.error("[Payment] Failed to get/create Paddle price:", error);
      return Response.json(
        { error: "Failed to set up subscription price. Please try again." },
        { status: 500 }
      );
    }

    // Get or create Paddle customer
    let paddleCustomer;
    try {
      paddleCustomer = await getOrCreatePaddleCustomer(
        user?.email || session.user.email,
        user?.name || "User"
      );
    } catch (error) {
      console.error("[Payment] Failed to get/create Paddle customer:", error);
      return Response.json(
        { error: "Failed to set up customer. Please try again." },
        { status: 500 }
      );
    }

    // Create Paddle transaction (subscription will be created automatically on payment)
    let paddleTransaction;
    try {
      paddleTransaction = await createPaddleTransaction(
        paddlePrice.id,
        paddleCustomer.id,
        site.id,
        site.domain
      );
    } catch (error) {
      console.error("[Payment] Failed to create Paddle transaction:", error);
      
      // Check for specific Paddle account configuration errors
      if (error.message?.includes("checkout_not_enabled") || error.message?.includes("Checkout has not yet been enabled")) {
        return Response.json(
          { 
            error: "Paddle checkout is not enabled for your account. Please complete Paddle onboarding and enable checkout in your Paddle dashboard, or contact Paddle support.",
            errorCode: "PADDLE_CHECKOUT_NOT_ENABLED",
            details: error.message
          },
          { status: 500 }
        );
      }
      
      return Response.json(
        { 
          error: "Failed to create payment transaction. Please try again.",
          details: error.message
        },
        { status: 500 }
      );
    }

    // Get checkout URL from transaction
    const checkoutUrl = paddleTransaction.checkout?.url;
    if (!checkoutUrl) {
      return Response.json(
        { error: "Failed to get checkout URL. Please try again." },
        { status: 500 }
      );
    }

    // Store transaction ID temporarily (subscription will be created after payment)
    const transactionId = paddleTransaction.id;

    // Create or update subscription in database (pending until payment)
    // Note: paddleSubscriptionId will be set via webhook after payment
    try {
      if (site.subscription) {
        // Update existing subscription
        await prisma.subscription.update({
          where: { siteId: site.id },
          data: {
            plan: plan,
            status: "pending",
            paddleProductId: paddleProduct.id,
            paddlePriceId: paddlePrice.id,
            paddleCustomerId: paddleCustomer.id,
            paddleTransactionId: transactionId, // Store transaction ID temporarily
            updatedAt: new Date(),
          },
        });
      } else {
        // Create new subscription
        await prisma.subscription.create({
          data: {
            siteId: site.id,
            plan: plan,
            status: "pending",
            paddleProductId: paddleProduct.id,
            paddlePriceId: paddlePrice.id,
            paddleCustomerId: paddleCustomer.id,
            paddleTransactionId: transactionId, // Store transaction ID temporarily
          },
        });
      }
    } catch (dbError) {
      console.error("[Payment] Database error:", dbError);
      return Response.json(
        { error: "Failed to save subscription. Please try again." },
        { status: 500 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ||
      req.headers.get("origin") ||
      `http://${req.headers.get("host")}`;

    const redirectTarget = `/dashboard/usage?payment=success&siteId=${site.siteId}`;
    const returnUrl = `${baseUrl}/payment/return?transaction_id=${transactionId}&siteId=${site.siteId}&redirect=${encodeURIComponent(redirectTarget)}`;

    console.log(`[Payment] Created transaction ${transactionId} for ${site.domain}`);

    return Response.json({
      success: true,
      transactionId: transactionId,
      subscriptionAuthUrl: checkoutUrl,
      requiresPaymentSetup: true,
      returnUrl: returnUrl,
      siteId: site.siteId,
      domain: site.domain,
      plan: plan,
      message: `Please complete payment for ${site.domain}. Your 7-day free trial will start after payment.`,
    });

  } catch (error) {
    console.error("[Payment] Error:", error);
    return Response.json(
      { error: error.message || "Failed to create payment order" },
      { status: 500 }
    );
  }
}
