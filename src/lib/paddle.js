// Paddle API Integration
// Docs: https://developer.paddle.com/api-reference/overview

const PADDLE_API_KEY = process.env.PADDLE_API_KEY;
const PADDLE_API_TOKEN = process.env.PADDLE_API_TOKEN;

// Auto-detect environment: use sandbox in development, live in production
// Docs: https://developer.paddle.com/api-reference/overview
const isProduction = process.env.NODE_ENV === "production";

// Explicitly set URLs for testing (sandbox) and production (live)
const SANDBOX_API_URL = "https://sandbox-api.paddle.com";
const LIVE_API_URL = "https://api.paddle.com";

// Use environment variable if set, otherwise auto-detect based on NODE_ENV
// FOR TESTING: Always use sandbox unless explicitly set to live
const PADDLE_BASE_URL = process.env.PADDLE_BASE_URL ||
  (process.env.PADDLE_USE_LIVE === "true" ? LIVE_API_URL : SANDBOX_API_URL);

// Log which environment is being used (only once on module load)
if (typeof console !== "undefined") {
  const isUsingLive = PADDLE_BASE_URL === LIVE_API_URL;
  const envType = isUsingLive ? "LIVE" : "SANDBOX (Testing)"
}

// Trial: only first domain gets 14-day trial (see create-order: trialDays = 0 for upgrade + second domain)
// Plan pricing (in USD cents)
export const PLAN_PRICING = {
  basic: 500,   // $5 = 500 cents
  starter: 900, // $9 = 900 cents
  pro: 2000,    // $20 = 2000 cents
};

// Trial period in days - ALL plans get 14-day user-based free trial
export const PLAN_TRIAL_DAYS = {
  basic: 14,
  starter: 14,
  pro: 14,
};

// Add-on: Remove branding from banner ($3/month)
export const ADDON_BRANDING_PRICE_CENTS = 300; // $3
export const ADDON_BRANDING_PRODUCT_NAME = "remove_branding";

// Plan page view limits (per domain per month)
export const PLAN_PAGE_VIEW_LIMITS = {
  basic: 10,    // 100,000 page views per month
  starter: 300000,  // 300,000 page views per month
  pro: Infinity,    // Unlimited page views
};

// Plan details for display
export const PLAN_DETAILS = {
  basic: {
    name: "Basic",
    price: 5,
    pageViews: 10,
    trialDays: 14,
    features: [
      "1 domain",
      "100,000 page views/month",
      "Basic tracker detection",
      "Cookie consent banner",
      "Community support",
      "14-day free trial",
    ],
  },
  starter: {
    name: "Starter",
    price: 9,
    pageViews: 300000,
    trialDays: 14,
    features: [
      "1 domain",
      "300,000 page views/month",
      "Advanced tracker detection",
      "Customizable banner",
      "Email support",
      "Analytics dashboard",
      "14-day free trial",
    ],
  },
  pro: {
    name: "Pro",
    price: 20,
    pageViews: Infinity,
    trialDays: 14,
    features: [
      "1 domain",
      "Unlimited page views",
      "All tracker types",
      "White-label banner",
      "Priority support",
      "Advanced analytics",
      "API access",
      "14-day free trial",
    ],
  },
};

/**
 * Make Paddle API request
 */
async function paddleRequest(method, endpoint, data = null) {
  const url = `${PADDLE_BASE_URL}${endpoint}`;

  // Log request details in development
  if (!isProduction && typeof console !== "undefined") {
    console.log(`[Paddle API] ${method} ${endpoint} → ${PADDLE_BASE_URL}`);
  }

  const headers = {
    "Authorization": `Bearer ${PADDLE_API_KEY}`,
    "Content-Type": "application/json",
    "Paddle-Version": "1",
  };

  const options = {
    method,
    headers,
  };

  if (data && (method === "POST" || method === "PATCH" || method === "PUT")) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, options);
    const responseData = await response.json();

    if (!response.ok) {
      console.error(`[Paddle API] Error ${response.status}:`, JSON.stringify(responseData, null, 2));
      // Log detailed error information
      if (responseData.error?.errors) {
        console.error(`[Paddle API] Validation errors:`, JSON.stringify(responseData.error.errors, null, 2));
      }
      throw new Error(responseData.error?.detail || `Paddle API error: ${response.status}`);
    }

    return responseData;
  } catch (error) {
    console.error(`[Paddle API] Request failed:`, error);
    throw error;
  }
}

/**
 * Create or get a Paddle product
 */
export async function getOrCreatePaddleProduct(planName) {
  try {
    // Check if product exists
    const products = await paddleRequest("GET", "/products");
    const existingProduct = products.data?.find(
      (p) => p.name.toLowerCase().includes(planName.toLowerCase())
    );

    if (existingProduct) {
      return existingProduct;
    }

    // Create new product
    const product = await paddleRequest("POST", "/products", {
      name: `${planName.charAt(0).toUpperCase() + planName.slice(1)} Plan`,
      description: `Monthly subscription for ${planName} plan with 14-day free trial`,
      type: "standard",
      tax_category: "standard",
    });

    return product.data;
  } catch (error) {
    console.error(`[Paddle] Error getting/creating product for ${planName}:`, error);
    throw error;
  }
}

/**
 * Get or create Paddle product for add-on (e.g. remove branding)
 */
export async function getOrCreatePaddleAddonProduct(addonName) {
  try {
    const products = await paddleRequest("GET", "/products");
    const existing = products.data?.find(
      (p) => p.name?.toLowerCase().includes(addonName.toLowerCase())
    );
    if (existing) return existing;
    const product = await paddleRequest("POST", "/products", {
      name: addonName === ADDON_BRANDING_PRODUCT_NAME ? "Remove branding" : addonName,
      description: addonName === ADDON_BRANDING_PRODUCT_NAME ? "Hide Powered by Cookie Access on consent banner" : "",
      type: "standard",
      tax_category: "standard",
    });
    return product.data;
  } catch (error) {
    console.error(`[Paddle] Error getOrCreate addon product:`, error);
    throw error;
  }
}

/**
 * Get or create Paddle price for add-on (monthly, no trial)
 */
export async function getOrCreatePaddleAddonPrice(productId, amountCents) {
  try {
    const prices = await paddleRequest("GET", `/prices?product_id=${productId}`);
    const existing = prices.data?.find(
      (p) => p.billing_cycle?.interval === "month" && p.unit_price?.amount === String(amountCents)
    );
    if (existing) return existing;
    const price = await paddleRequest("POST", "/prices", {
      product_id: productId,
      description: "Monthly",
      name: "Monthly",
      unit_price: { amount: String(amountCents), currency_code: "USD" },
      billing_cycle: { interval: "month", frequency: 1 },
      tax_mode: "account_setting",
    });
    return price.data;
  } catch (error) {
    console.error(`[Paddle] Error getOrCreate addon price:`, error);
    throw error;
  }
}

/**
 * Create or get a Paddle price for a product
 * @param {string} productId - Paddle product ID
 * @param {string} planName - Plan name (basic, starter, pro)
 * @param {number} amount - Amount in cents
 * @param {string} billingInterval - "monthly" or "yearly" (default: "monthly")
 * @param {{ trialDays?: number }} options - trialDays: 14 for first domain (default), 0 for second+ domain (no trial)
 */
export async function getOrCreatePaddlePrice(productId, planName, amount, billingInterval = "monthly", options = {}) {
  try {
    const interval = billingInterval === "yearly" ? "year" : "month";
    const frequency = billingInterval === "yearly" ? 1 : 1;

    const finalAmount = billingInterval === "yearly"
      ? Math.round(amount * 10)
      : amount;

    const trialDays = options.trialDays !== undefined ? options.trialDays : (PLAN_TRIAL_DAYS[planName] || 14);
    const withTrial = trialDays > 0;

    const prices = await paddleRequest("GET", `/prices?product_id=${productId}`);
    const existingPrice = prices.data?.find((p) => {
      if (p.billing_cycle?.interval !== interval || p.billing_cycle?.frequency !== frequency) return false;
      if (p.unit_price?.amount !== String(finalAmount)) return false;
      if (withTrial) {
        return p.trial_period?.interval === "day" && Number(p.trial_period?.frequency) === trialDays;
      }
      return !p.trial_period || !p.trial_period.frequency;
    });

    if (existingPrice) {
      return existingPrice;
    }

    const amountInCents = String(Math.round(finalAmount));
    const periodLabel = billingInterval === "yearly" ? "Yearly" : "Monthly";
    const trialLabel = withTrial ? ` (${trialDays}-day trial)` : " (no trial)";

    const priceData = {
      product_id: productId,
      description: `${planName.charAt(0).toUpperCase() + planName.slice(1)} Plan - ${periodLabel}${trialLabel}`,
      name: `${planName.charAt(0).toUpperCase() + planName.slice(1)} Plan - ${periodLabel}${trialLabel}`,
      unit_price: {
        amount: amountInCents,
        currency_code: "USD",
      },
      billing_cycle: {
        interval: interval,
        frequency: frequency,
      },
      tax_mode: "account_setting",
    };

    if (withTrial) {
      priceData.trial_period = { interval: "day", frequency: trialDays };
    }

    console.log(`[Paddle] Creating price:`, JSON.stringify(priceData, null, 2));

    const price = await paddleRequest("POST", "/prices", priceData);

    return price.data;
  } catch (error) {
    console.error(`[Paddle] Error getting/creating price for ${planName}:`, error);
    throw error;
  }
}

/**
 * Create or get Paddle customer
 */
export async function getOrCreatePaddleCustomer(email, name) {
  try {
    // Check if customer exists
    const customers = await paddleRequest("GET", `/customers?email=${encodeURIComponent(email)}`);
    if (customers.data && customers.data.length > 0) {
      return customers.data[0];
    }

    // Create new customer
    const customer = await paddleRequest("POST", "/customers", {
      email,
      name: name || email,
    });

    return customer.data;
  } catch (error) {
    console.error("[Paddle] Error getting/creating customer:", error);
    throw error;
  }
}

/**
 * Create Paddle transaction with checkout URL for subscription
 * Note: Paddle creates subscriptions automatically when customer pays via checkout.
 * Pass plan and billingInterval so webhook can update subscription only after payment success.
 * Docs: https://developer.paddle.com/api-reference/overview
 */
export async function createPaddleTransaction(priceId, customerId, siteId, domain, plan = null, billingInterval = null, isUpgrade = false) {
  try {
    const customData = { siteId, domain };
    if (plan) customData.plan = plan;
    if (billingInterval) customData.billingInterval = billingInterval;
    if (isUpgrade) customData.upgrade = true;

    // Create transaction with recurring price - Paddle will create subscription on payment
    const transaction = await paddleRequest("POST", "/transactions", {
      items: [
        {
          price_id: priceId,
          quantity: 1,
        },
      ],
      customer_id: customerId,
      collection_mode: "automatic",
      currency_code: "USD",
      custom_data: customData,
      // Optionally set checkout URL - if null, Paddle uses default
      // If we want hosted checkout, we can pass null or omit this
      // If we want embedded checkout, we pass our domain URL
      checkout: {
        url: null, // Let Paddle use default checkout URL (hosted or configured domain)
      },
    });

    console.log("[Paddle] Transaction created:", {
      id: transaction.data?.id,
      status: transaction.data?.status,
      checkoutUrl: transaction.data?.checkout?.url,
      fullCheckout: JSON.stringify(transaction.data?.checkout, null, 2),
    });

    // Transaction includes checkout URL and will create subscription when paid
    return transaction.data;
  } catch (error) {
    console.error("[Paddle] Error creating transaction:", error);

    // Enhance error message for checkout not enabled
    if (error.message?.includes("checkout_not_enabled") || error.message?.includes("Checkout has not yet been enabled")) {
      const envType = isProduction ? "LIVE" : "SANDBOX";
      const dashboardUrl = isProduction
        ? "https://vendors.paddle.com"
        : "https://sandbox-vendors.paddle.com";

      error.message = `Paddle ${envType} checkout is not enabled. Please:\n1. Go to ${dashboardUrl}\n2. Complete onboarding and enable checkout\n3. Or contact Paddle support\n\nOriginal error: ${error.message}`;
    }

    throw error;
  }
}

/**
 * Create Paddle transaction for pending domain (Site created only when payment succeeds)
 * custom_data: { pendingDomain: true, pendingDomainId, siteId, domain, plan, billingInterval }
 */
export async function createPaddleTransactionForPendingDomain(priceId, customerId, pendingDomainId, siteId, domain, plan, billingInterval) {
  try {
    const transaction = await paddleRequest("POST", "/transactions", {
      items: [{ price_id: priceId, quantity: 1 }],
      customer_id: customerId,
      collection_mode: "automatic",
      currency_code: "USD",
      custom_data: {
        pendingDomain: true,
        pendingDomainId: String(pendingDomainId),
        siteId: String(siteId),
        domain,
        plan,
        billingInterval,
      },
      checkout: { url: null },
    });
    return transaction.data;
  } catch (error) {
    console.error("[Paddle] Error creating pending domain transaction:", error);
    throw error;
  }
}

/**
 * Create Paddle transaction for add-on (e.g. remove branding) - custom_data includes addonType for webhook
 */
export async function createPaddleAddonTransaction(priceId, customerId, siteId, addonType) {
  try {
    const transaction = await paddleRequest("POST", "/transactions", {
      items: [{ price_id: priceId, quantity: 1 }],
      customer_id: customerId,
      collection_mode: "automatic",
      currency_code: "USD",
      custom_data: { siteId, addonType },
      checkout: { url: null },
    });
    return transaction.data;
  } catch (error) {
    console.error("[Paddle] Error creating addon transaction:", error);

    // Enhance error message for checkout not enabled
    if (error.message?.includes("checkout_not_enabled") || error.message?.includes("Checkout has not yet been enabled")) {
      const envType = isProduction ? "LIVE" : "SANDBOX";
      const dashboardUrl = isProduction
        ? "https://vendors.paddle.com"
        : "https://sandbox-vendors.paddle.com";

      error.message = `Paddle ${envType} checkout is not enabled. Please:\n1. Go to ${dashboardUrl}\n2. Complete onboarding and enable checkout\n3. Or contact Paddle support\n\nOriginal error: ${error.message}`;
    }

    throw error;
  }
}

/**
 * Create Paddle subscription (legacy - use createPaddleTransaction instead)
 * Note: Subscriptions are created automatically by Paddle when transaction is paid
 */
export async function createPaddleSubscription(priceId, customerId, siteId, domain) {
  // Use transaction creation instead
  return createPaddleTransaction(priceId, customerId, siteId, domain);
}

/**
 * Fetch Paddle transaction by ID (e.g. for confirming pending-domain payment on return)
 */
export async function fetchPaddleTransaction(transactionId) {
  try {
    const res = await paddleRequest("GET", `/transactions/${transactionId}`);
    return res.data;
  } catch (error) {
    console.error("[Paddle] Error fetching transaction:", error);
    throw error;
  }
}

/**
 * Fetch Paddle subscription
 */
export async function fetchPaddleSubscription(subscriptionId) {
  try {
    const subscription = await paddleRequest("GET", `/subscriptions/${subscriptionId}`);
    return subscription.data;
  } catch (error) {
    console.error("[Paddle] Error fetching subscription:", error);
    throw error;
  }
}

/**
 * Cancel Paddle subscription
 * Docs: https://developer.paddle.com/api-reference/subscriptions/cancel-a-subscription
 */
export async function cancelPaddleSubscription(subscriptionId, cancelAtPeriodEnd = true) {
  try {
    // Use POST /subscriptions/{id}/cancel endpoint
    // For cancel at period end, we need to use scheduled_change via PATCH
    if (cancelAtPeriodEnd) {
      const subscription = await paddleRequest("PATCH", `/subscriptions/${subscriptionId}`, {
        scheduled_change: {
          action: "cancel",
          effective_at: "next_billing_period",
        },
      });
      return subscription.data;
    } else {
      // Cancel immediately
      const subscription = await paddleRequest("POST", `/subscriptions/${subscriptionId}/cancel`);
      return subscription.data;
    }
  } catch (error) {
    console.error("[Paddle] Error cancelling subscription:", error);
    throw error;
  }
}

/**
 * Get subscription checkout URL or update payment method URL
 * Docs: https://developer.paddle.com/api-reference/subscriptions/get-a-transaction-to-update-payment-method
 */
export async function getSubscriptionCheckoutUrl(subscriptionId) {
  try {
    // Try to get update payment method transaction
    try {
      const updateTransaction = await paddleRequest("GET", `/subscriptions/${subscriptionId}/update-payment-method-transaction`);
      if (updateTransaction.data?.checkout?.url) {
        return updateTransaction.data.checkout.url;
      }
    } catch (error) {
      // If subscription doesn't exist yet or no update transaction, continue
    }

    // Fallback: Get subscription and use management URLs
    const subscription = await fetchPaddleSubscription(subscriptionId);
    if (subscription.management_urls?.update_payment_method) {
      return subscription.management_urls.update_payment_method;
    }

    // Last resort: Get latest transaction checkout URL
    const transactions = await paddleRequest("GET", `/transactions?subscription_id=${subscriptionId}`);
    if (transactions.data && transactions.data.length > 0) {
      const latestTransaction = transactions.data[0];
      if (latestTransaction.checkout?.url) {
        return latestTransaction.checkout.url;
      }
    }

    return null;
  } catch (error) {
    console.error("[Paddle] Error getting checkout URL:", error);
    throw error;
  }
}

/**
 * Verify webhook signature (Paddle uses HMAC SHA256)
 */
export function verifyPaddleWebhookSignature(body, signature) {
  const crypto = require("crypto");
  const secret = process.env.PADDLE_WEBHOOK_SECRET || PADDLE_API_TOKEN;

  if (!secret) {
    console.warn("PADDLE_WEBHOOK_SECRET not set, skipping verification");
    return true; // Allow in development
  }

  try {
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");

    return signature === expectedSignature;
  } catch (error) {
    console.error("Error verifying Paddle webhook signature:", error);
    return false;
  }
}
