import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import {
  PLAN_PRICING,
  getOrCreatePaddleProduct,
  getOrCreatePaddlePrice,
  getOrCreatePaddleCustomer,
  createPaddleTransaction,
  createPaddleTransactionForPendingDomain,
  fetchPaddleSubscription,
  getSubscriptionCheckoutUrl,
  cancelPaddleSubscription,
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

    const { plan, siteId, billingInterval = "monthly", upgrade = false } = await req.json();

    // Validate plan
    if (!plan || !["basic", "starter", "pro"].includes(plan)) {
      return Response.json(
        { error: "Invalid plan. Choose 'basic', 'starter', or 'pro'" },
        { status: 400 }
      );
    }

    // Validate billing interval
    if (!["monthly", "yearly"].includes(billingInterval)) {
      return Response.json(
        { error: "Invalid billing interval. Choose 'monthly' or 'yearly'" },
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

    // Find site by public siteId or database ID; or PendingDomain (domain not created until payment succeeds)
    let site = await prisma.site.findFirst({
      where: {
        OR: [
          { siteId: siteId },
          { id: siteId },
        ],
        userId: session.user.id,
      },
      include: { subscription: true },
    });

    let pendingDomain = null;
    if (!site) {
      pendingDomain = await prisma.pendingDomain.findFirst({
        where: { siteId: siteId, userId: session.user.id },
      });
      if (!pendingDomain) {
        return Response.json(
          { error: "Site not found. Please add the domain first." },
          { status: 404 }
        );
      }
      // Use a minimal "site" shape for redirect/response (no DB Site yet)
      site = {
        id: null,
        siteId: pendingDomain.siteId,
        domain: pendingDomain.domain,
        userId: pendingDomain.userId,
        subscription: null,
      };
    }

    // Check if domain already has an active subscription
    if (site.subscription) {
      const status = site.subscription.status?.toLowerCase();
      const currentPlan = (site.subscription.plan || "").toLowerCase();

      // Upgrade: cancel current subscription (immediately), then proceed to create new one
      if (upgrade && (status === "active" || status === "trial") && plan !== currentPlan) {
        if (site.subscription.paddleSubscriptionId) {
          try {
            await cancelPaddleSubscription(site.subscription.paddleSubscriptionId, false);
          } catch (err) {
            console.error("[Payment] Upgrade: Paddle cancel failed", err);
          }
        }
        await prisma.subscription.update({
          where: { siteId: site.id },
          data: {
            status: "cancelled",
            cancelAtPeriodEnd: false,
            currentPeriodEnd: new Date(),
            paddleSubscriptionId: null,
            paddleTransactionId: null,
            updatedAt: new Date(),
          },
        });
        site.subscription = { ...site.subscription, status: "cancelled" };
      } else if (status === "pending") {
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
          { error: `This domain already has an active ${site.subscription.plan} subscription. Use "Upgrade" to change plan.` },
          { status: 400 }
        );
      } else if (site.subscription && status === "cancelled" && site.subscription.currentPeriodEnd) {
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

    // Get or create Paddle price (with billing interval)
    let paddlePrice;
    try {
      paddlePrice = await getOrCreatePaddlePrice(paddleProduct.id, plan, amount, billingInterval);
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

    // Pending domain: no Site yet - create transaction; Site + Subscription created in webhook on payment success
    if (pendingDomain) {
      try {
        await prisma.pendingDomain.update({
          where: { id: pendingDomain.id },
          data: { plan, billingInterval },
        });
      } catch (e) {
        console.error("[Payment] Failed to update PendingDomain:", e);
      }
      let paddleTransaction;
      try {
        paddleTransaction = await createPaddleTransactionForPendingDomain(
          paddlePrice.id,
          paddleCustomer.id,
          pendingDomain.id,
          pendingDomain.siteId,
          pendingDomain.domain,
          plan,
          billingInterval
        );
        await prisma.pendingDomain.update({
          where: { id: pendingDomain.id },
          data: { paddleTransactionId: paddleTransaction.id },
        });
      } catch (error) {
        console.error("[Payment] Failed to create Paddle transaction (pending domain):", error);
        if (error.message?.includes("checkout_not_enabled") || error.message?.includes("Checkout has not yet been enabled")) {
          return Response.json(
            { error: "Paddle checkout is not enabled. Please complete Paddle onboarding and enable checkout.", errorCode: "PADDLE_CHECKOUT_NOT_ENABLED" },
            { status: 500 }
          );
        }
        return Response.json(
          { error: error.message || "Failed to create payment. Please try again." },
          { status: 500 }
        );
      }
      const checkoutUrl = paddleTransaction.checkout?.url;
      if (!checkoutUrl) {
        return Response.json(
          { error: "Checkout URL not available. Please try again." },
          { status: 500 }
        );
      }
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || req.headers.get("origin") || `http://${req.headers.get("host")}`;
      const redirectTarget = `/dashboard/usage?payment=success&siteId=${pendingDomain.siteId}`;
      const returnUrl = `${baseUrl}/payment/return?transaction_id=${paddleTransaction.id}&siteId=${pendingDomain.siteId}&redirect=${encodeURIComponent(redirectTarget)}`;
      return Response.json({
        success: true,
        transactionId: paddleTransaction.id,
        subscriptionAuthUrl: checkoutUrl,
        checkoutUrl,
        requiresPaymentSetup: true,
        returnUrl,
        siteId: pendingDomain.siteId,
        domain: pendingDomain.domain,
        plan,
        message: `Please complete payment for ${pendingDomain.domain}. Your domain and 14-day trial will start after payment.`,
      });
    }

    // Existing site: create Paddle transaction and Subscription (pending until payment)
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

    // Get checkout URL from transaction response
    // Paddle returns checkout.url which is the actual checkout URL
    let checkoutUrl = paddleTransaction.checkout?.url;

    console.log("[Payment] Transaction checkout response:", {
      transactionId: paddleTransaction.id,
      status: paddleTransaction.status,
      checkout: paddleTransaction.checkout,
      checkoutUrl: checkoutUrl,
    });

    // If checkout URL is not provided, transaction might not be ready for checkout
    if (!checkoutUrl) {
      console.error("[Payment] No checkout URL in transaction response");
      return Response.json(
        { error: "Checkout URL not available. Please ensure Paddle checkout is enabled in your account." },
        { status: 500 }
      );
    }

    // Paddle checkout URL format:
    // - If embedded: https://yourdomain.com?_ptxn=txn_xxx (this is valid, use as-is)
    // - If hosted: https://checkout.paddle.com/... (full Paddle URL)
    // Both formats are valid - use the URL as returned by Paddle
    console.log("[Payment] Using checkout URL from Paddle:", checkoutUrl);

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
            billingInterval: billingInterval,
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
            billingInterval: billingInterval,
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
    console.log(`[Payment] Checkout URL: ${checkoutUrl}`);

    return Response.json({
      success: true,
      transactionId: transactionId,
      subscriptionAuthUrl: checkoutUrl, // This should be the Paddle checkout URL
      checkoutUrl: checkoutUrl, // Also include as checkoutUrl for clarity
      requiresPaymentSetup: true,
      returnUrl: returnUrl,
      siteId: site.siteId,
      domain: site.domain,
      plan: plan,
      message: `Please complete payment for ${site.domain}. Your 14-day free trial will start after payment.`,
    });

  } catch (error) {
    console.error("[Payment] Error:", error);
    return Response.json(
      { error: error.message || "Failed to create payment order" },
      { status: 500 }
    );
  }
}
