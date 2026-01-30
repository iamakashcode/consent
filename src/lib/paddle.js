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
  const envType = isUsingLive ? "LIVE" : "SANDBOX (Testing)";
  console.log(`[Paddle] Environment: ${envType}`);
  console.log(`[Paddle] API URL: ${PADDLE_BASE_URL}`);
  console.log(`[Paddle] NODE_ENV: ${process.env.NODE_ENV || "undefined"}`);
  console.log(`[Paddle] PADDLE_BASE_URL: ${process.env.PADDLE_BASE_URL || "auto-detected"}`);
  console.log(`[Paddle] PADDLE_USE_LIVE: ${process.env.PADDLE_USE_LIVE || "false"}`);
}

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
 * Create or get a Paddle price for a product
 * @param {string} productId - Paddle product ID
 * @param {string} planName - Plan name (basic, starter, pro)
 * @param {number} amount - Amount in cents
 * @param {string} billingInterval - "monthly" or "yearly" (default: "monthly")
 */
export async function getOrCreatePaddlePrice(productId, planName, amount, billingInterval = "monthly") {
  try {
    const interval = billingInterval === "yearly" ? "year" : "month";
    const frequency = billingInterval === "yearly" ? 1 : 1;
    
    // Calculate yearly amount (10 months price for yearly - 2 months discount)
    const finalAmount = billingInterval === "yearly" 
      ? Math.round(amount * 10) // 10 months price for yearly
      : amount;

    // Check if price exists for this interval
    const prices = await paddleRequest("GET", `/prices?product_id=${productId}`);
    const existingPrice = prices.data?.find(
      (p) => p.billing_cycle?.interval === interval && 
            p.billing_cycle?.frequency === frequency &&
            p.unit_price?.amount === String(finalAmount)
    );

    if (existingPrice) {
      return existingPrice;
    }

    // Create new price with trial
    const trialDays = PLAN_TRIAL_DAYS[planName] || 14;

    // Ensure amount is a string integer (in cents)
    const amountInCents = String(Math.round(finalAmount));
    const periodLabel = billingInterval === "yearly" ? "Yearly" : "Monthly";

    const priceData = {
      product_id: productId,
      description: `${planName.charAt(0).toUpperCase() + planName.slice(1)} Plan - ${periodLabel}`,
      name: `${planName.charAt(0).toUpperCase() + planName.slice(1)} Plan - ${periodLabel}`,
      unit_price: {
        amount: amountInCents,
        currency_code: "USD",
      },
      billing_cycle: {
        interval: interval,
        frequency: frequency,
      },
      trial_period: {
        interval: "day",
        frequency: trialDays,
      },
      tax_mode: "account_setting",
    };

    console.log(`[Paddle] Creating price with data:`, JSON.stringify(priceData, null, 2));

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
 * Note: Paddle creates subscriptions automatically when customer pays via checkout
 * Docs: https://developer.paddle.com/api-reference/overview
 */
export async function createPaddleTransaction(priceId, customerId, siteId, domain) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

    // Create transaction with recurring price - Paddle will create subscription on payment
    // Note: Paddle returns checkout.url in the response which is the actual checkout URL
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
      custom_data: {
        siteId,
        domain,
      },
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
 * Create Paddle subscription (legacy - use createPaddleTransaction instead)
 * Note: Subscriptions are created automatically by Paddle when transaction is paid
 */
export async function createPaddleSubscription(priceId, customerId, siteId, domain) {
  // Use transaction creation instead
  return createPaddleTransaction(priceId, customerId, siteId, domain);
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
