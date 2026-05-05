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
// Single source for all plans – used by plans page, billing, create-order, start-trial, Paddle, views API

export const PLAN_CURRENCY = "EUR";

// Plan pricing in cents (for Paddle API): Basic EUR 7, Starter EUR 15, Pro EUR 20
export const PLAN_PRICING = {
  basic: 700,    // EUR 7
  starter: 1500, // EUR 15
  pro: 2000,     // EUR 20
};

export const PLAN_TRIAL_DAYS = {
  basic: 14,
  starter: 14,
  pro: 14,
};

// Add-on: Remove branding – EUR 3/month, available with any plan
export const ADDON_BRANDING_PRICE_CENTS = 300; // EUR 3
export const ADDON_BRANDING_PRICE_EUR = 3;
export const ADDON_BRANDING_PRODUCT_NAME = "remove_branding";

// Single PLAN_DETAILS for display everywhere (plans, billing, start-trial, landing, pricing)
export const PLAN_DETAILS = {
  basic: {
    name: "Basic",
    price: 7,
    monthly: 7,
    yearly: 70, // 10 months price
    pageViews: 300000,
    trialDays: 14,
    description: "Perfect for getting started",
    popular: false,
    features: [
      "1 domain",
      "10 page views/month",
      "Basic tracker detection",
      "Cookie consent banner",
      "Community support",
      "14-day free trial (first domain only)",
    ],
  },
  starter: {
    name: "Starter",
    price: 15,
    monthly: 15,
    yearly: 150,
    pageViews: 700000,
    trialDays: 14,
    description: "For growing businesses",
    popular: true,
    features: [
      "1 domain",
      "700,000 page views/month",
      "Advanced tracker detection",
      "Customizable banner",
      "Email support",
      "Analytics dashboard",
      "14-day free trial (first domain only)",
    ],
  },
  pro: {
    name: "Pro",
    price: 20,
    monthly: 20,
    yearly: 200,
    pageViews: Infinity,
    trialDays: 14,
    description: "For agencies and enterprises",
    popular: false,
    features: [
      "1 domain",
      "Unlimited page views",
      "All tracker types",
      "White-label banner",
      "Priority support",
      "Advanced analytics",
      "API access",
      "14-day free trial (first domain only)",
    ],
  },
};

/** Enforced monthly caps — derived from `PLAN_DETAILS[*].pageViews` so billing UI and script limits stay aligned */
export const PLAN_PAGE_VIEW_LIMITS = {
  basic: PLAN_DETAILS.basic.pageViews,
  starter: PLAN_DETAILS.starter.pageViews,
  pro: PLAN_DETAILS.pro.pageViews,
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
 * Get or create Paddle price for add-on.
 * @param {{ trialDays?: number }} options - trialDays: 14 for first-domain trial (addon free for 14 days), 0 otherwise
 */
export async function getOrCreatePaddleAddonPrice(productId, amountCents, billingInterval = "monthly", options = {}) {
  try {
    const interval = billingInterval === "yearly" ? "year" : "month";
    const frequency = 1;
    const finalAmount = billingInterval === "yearly"
      ? Math.round(amountCents * 10)
      : amountCents;
    const trialDays = options.trialDays !== undefined ? options.trialDays : 0;
    const withTrial = trialDays > 0;

    const prices = await paddleRequest("GET", `/prices?product_id=${productId}`);
    const existing = prices.data?.find((p) => {
      if (p.tax_mode !== "external") return false;
      if (p.billing_cycle?.interval !== interval || p.billing_cycle?.frequency !== frequency) return false;
      if (p.unit_price?.amount !== String(finalAmount)) return false;
      if (withTrial) {
        return p.trial_period?.interval === "day" && Number(p.trial_period?.frequency) === trialDays;
      }
      return !p.trial_period || !p.trial_period.frequency;
    });
    if (existing) return existing;

    const priceData = {
      product_id: productId,
      description: withTrial ? `Monthly (${trialDays}-day trial)` : (billingInterval === "yearly" ? "Yearly" : "Monthly"),
      name: withTrial ? `Monthly (${trialDays}-day trial)` : (billingInterval === "yearly" ? "Yearly" : "Monthly"),
      unit_price: { amount: String(finalAmount), currency_code: PLAN_CURRENCY },
      billing_cycle: { interval: interval, frequency: frequency },
      tax_mode: "external", // Price is final; no Paddle-added tax.
    };
    if (withTrial) {
      priceData.trial_period = { interval: "day", frequency: trialDays };
    }
    const price = await paddleRequest("POST", "/prices", priceData);
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
      if (p.tax_mode !== "external") return false; // only reuse prices that show exact EUR (no Paddle tax)
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
        currency_code: PLAN_CURRENCY,
      },
      billing_cycle: {
        interval: interval,
        frequency: frequency,
      },
      tax_mode: "external", // Price is final; no Paddle-added tax. If checkout still shows extra, set Paddle Dashboard → Tax to inclusive/off.
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
export async function createPaddleTransaction(priceId, customerId, siteId, domain, plan = null, billingInterval = null, isUpgrade = false, options = {}) {
  try {
    const customData = { siteId, domain };
    if (plan) customData.plan = plan;
    if (billingInterval) customData.billingInterval = billingInterval;
    if (isUpgrade) customData.upgrade = true;
    if (options.addonRemoveBranding) customData.addonRemoveBranding = true;

    const items = [{ price_id: priceId, quantity: 1 }];
    if (options.addonPriceId) {
      items.push({ price_id: options.addonPriceId, quantity: 1 });
    }

    // Create transaction with recurring price - Paddle will create subscription on payment
    const transaction = await paddleRequest("POST", "/transactions", {
      items,
      customer_id: customerId,
      collection_mode: "automatic",
      currency_code: PLAN_CURRENCY,
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
export async function createPaddleTransactionForPendingDomain(priceId, customerId, pendingDomainId, siteId, domain, plan, billingInterval, options = {}) {
  try {
    const items = [{ price_id: priceId, quantity: 1 }];
    if (options.addonPriceId) {
      items.push({ price_id: options.addonPriceId, quantity: 1 });
    }
    const transaction = await paddleRequest("POST", "/transactions", {
      items,
      customer_id: customerId,
      collection_mode: "automatic",
      currency_code: PLAN_CURRENCY,
      custom_data: {
        pendingDomain: true,
        pendingDomainId: String(pendingDomainId),
        siteId: String(siteId),
        domain,
        plan,
        billingInterval,
        ...(options.addonRemoveBranding ? { addonRemoveBranding: true } : {}),
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
      currency_code: PLAN_CURRENCY,
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

function isBrandingAddonLineItem(item) {
  const amount = Number(item?.price?.unit_price?.amount || 0);
  // EUR 3 monthly or EUR 30 yearly (10x yearly pricing convention in this app)
  return amount === ADDON_BRANDING_PRICE_CENTS || amount === ADDON_BRANDING_PRICE_CENTS * 10;
}

function mapSubscriptionItemForUpdate(item) {
  const priceId = item?.price?.id || item?.price_id;
  const quantity = Number(item?.quantity || 1);
  if (!priceId) return null;
  return { price_id: priceId, quantity };
}

/**
 * Add remove-branding addon as an item on an existing Paddle subscription.
 * This keeps billing co-termed with the same subscription cycle.
 */
export async function addBrandingAddonToSubscription(subscriptionId, addonPriceId) {
  const full = await fetchPaddleSubscription(subscriptionId);
  const existingItems = Array.isArray(full?.items) ? full.items : [];
  const hasAddonAlready = existingItems.some((item) => {
    const itemPriceId = item?.price?.id || item?.price_id;
    return itemPriceId === addonPriceId || isBrandingAddonLineItem(item);
  });
  if (hasAddonAlready) return full;

  const nextItems = existingItems
    .map(mapSubscriptionItemForUpdate)
    .filter(Boolean);
  nextItems.push({ price_id: addonPriceId, quantity: 1 });

  const updated = await paddleRequest("PATCH", `/subscriptions/${encodeURIComponent(subscriptionId)}`, {
    items: nextItems,
    proration_billing_mode: "prorated_immediately",
  });
  return updated.data;
}

/**
 * Remove remove-branding addon from an existing Paddle subscription.
 */
export async function removeBrandingAddonFromSubscription(subscriptionId) {
  const full = await fetchPaddleSubscription(subscriptionId);
  const existingItems = Array.isArray(full?.items) ? full.items : [];
  const filteredItems = existingItems.filter((item) => !isBrandingAddonLineItem(item));
  if (filteredItems.length === existingItems.length) return full;

  const nextItems = filteredItems
    .map(mapSubscriptionItemForUpdate)
    .filter(Boolean);

  const updated = await paddleRequest("PATCH", `/subscriptions/${encodeURIComponent(subscriptionId)}`, {
    items: nextItems,
    proration_billing_mode: "prorated_immediately",
  });
  return updated.data;
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
  const id = encodeURIComponent(transactionId);
  try {
    const res = await paddleRequest("GET", `/transactions/${id}?include=items`);
    return res.data;
  } catch (error) {
    try {
      const res = await paddleRequest("GET", `/transactions/${id}`);
      return res.data;
    } catch (e2) {
      console.error("[Paddle] Error fetching transaction:", e2);
      throw e2;
    }
  }
}

/**
 * Fetch recent Paddle transactions for admin reporting.
 * @param {number} limit
 */
export async function fetchRecentPaddleTransactions(limit = 100) {
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
  const query = `/transactions?include=address,business,customer,discount,items&per_page=${safeLimit}`;
  try {
    const res = await paddleRequest("GET", query);
    return Array.isArray(res?.data) ? res.data : [];
  } catch (error) {
    console.error("[Paddle] Error fetching recent transactions:", error);
    throw error;
  }
}

/**
 * Normalize Paddle `custom_data` (webhooks may use snake_case keys).
 * @param {object|null|undefined} raw
 */
export function normalizePaddleTransactionCustomData(raw) {
  if (!raw || typeof raw !== "object") return {};
  const c = raw;
  return {
    siteId: c.siteId ?? c.site_id,
    domain: c.domain,
    plan: c.plan,
    billingInterval: c.billingInterval ?? c.billing_interval,
    upgrade: c.upgrade === true || c.upgrade === "true",
    addonRemoveBranding:
      c.addonRemoveBranding === true ||
      c.addonRemoveBranding === "true" ||
      c.addon_remove_branding === true ||
      c.addon_remove_branding === "true",
    addonType: c.addonType ?? c.addon_type,
    pendingDomain: c.pendingDomain === true || c.pendingDomain === "true" || c.pending_domain === true || c.pending_domain === "true",
    pendingDomainId: c.pendingDomainId ?? c.pending_domain_id,
  };
}

function matchPlanFromAmount(amountCents, yearly) {
  for (const plan of ["basic", "starter", "pro"]) {
    const monthly = PLAN_PRICING[plan];
    const yearlyAmt = Math.round(monthly * 10);
    const expected = yearly ? yearlyAmt : monthly;
    if (amountCents === expected) return plan;
  }
  return null;
}

/**
 * Infer plan from Paddle `items`-shaped arrays (subscription items or transaction items).
 * @param {Array<{ price?: object, price_id?: string, billing_cycle?: object }>} items
 * @returns {{ plan: string, billingInterval: string, paddlePriceId: string | null } | null}
 */
export function inferPlanFromPaddleItems(items) {
  if (!items?.length) return null;

  for (const item of items) {
    const price = item.price || null;
    const amountRaw = price?.unit_price?.amount ?? null;
    const amount = amountRaw != null ? Number(amountRaw) : 0;
    if (!amount || amount === ADDON_BRANDING_PRICE_CENTS) continue;

    const interval =
      price?.billing_cycle?.interval ??
      item.billing_cycle?.interval ??
      null;
    const yearly = interval === "year";
    const plan = matchPlanFromAmount(amount, yearly);
    if (plan) {
      return {
        plan,
        billingInterval: yearly ? "yearly" : "monthly",
        paddlePriceId: price?.id || item.price_id || null,
      };
    }
  }
  return null;
}

/**
 * Infer local plan + billing interval from a Paddle subscription (API or webhook `data`).
 * Matches the main recurring line item by unit price (EUR cents); skips the remove-branding add-on price.
 * @param {object} paddleSub - Paddle subscription object with `items` array
 * @returns {{ plan: string, billingInterval: string, paddlePriceId: string | null } | null}
 */
export function inferPlanFromPaddleSubscription(paddleSub) {
  return inferPlanFromPaddleItems(paddleSub?.items);
}

/**
 * Infer plan from a transaction entity (webhook `data` or GET /transactions response).
 */
export function inferPlanFromPaddleTransaction(transaction) {
  if (!transaction) return null;
  let found = inferPlanFromPaddleItems(transaction.items);
  if (found) return found;

  const lineItems = transaction.details?.line_items;
  if (lineItems?.length) {
    const mapped = lineItems.map((li) => ({
      price: li.price,
      price_id: li.price_id,
      billing_cycle: li.billing_cycle,
    }));
    found = inferPlanFromPaddleItems(mapped);
  }
  return found || null;
}

/**
 * Fetch a Paddle price and infer plan (checkout stores `paddlePriceId` on Subscription while pending).
 */
export async function inferPlanFromPaddlePriceById(priceId) {
  if (!priceId) return null;
  try {
    const res = await paddleRequest("GET", `/prices/${encodeURIComponent(priceId)}`);
    const price = res.data;
    return inferPlanFromPaddleItems([{ price }]);
  } catch (e) {
    console.warn("[Paddle] inferPlanFromPaddlePriceById failed:", e?.message);
    return null;
  }
}

/**
 * Resolve plan + billing for a successful transaction: custom_data, line items, full transaction fetch,
 * then `Subscription.paddlePriceId` from checkout (reliable when Paddle omits custom_data on webhooks).
 * @param {object} transaction - Paddle transaction (event.data or API)
 * @param {{ plan?: string, billingInterval?: string, paddlePriceId?: string | null }} dbSubscription
 */
export async function resolvePlanAndBillingFromTransaction(transaction, dbSubscription) {
  const cd = normalizePaddleTransactionCustomData(transaction.custom_data);
  let plan = cd.plan || null;
  let billingInterval = cd.billingInterval || null;

  let inferred = inferPlanFromPaddleTransaction(transaction);
  if (inferred) {
    plan = plan || inferred.plan;
    billingInterval = billingInterval || inferred.billingInterval;
  }

  const txnId = transaction?.id;
  if ((!plan || !billingInterval) && txnId) {
    try {
      const full = await fetchPaddleTransaction(txnId);
      const i2 = inferPlanFromPaddleTransaction(full);
      if (i2) {
        plan = plan || i2.plan;
        billingInterval = billingInterval || i2.billingInterval;
      }
    } catch (_) {
      /* ignore */
    }
  }

  if ((!plan || !billingInterval) && dbSubscription?.paddlePriceId) {
    const i3 = await inferPlanFromPaddlePriceById(dbSubscription.paddlePriceId);
    if (i3) {
      plan = plan || i3.plan;
      billingInterval = billingInterval || i3.billingInterval;
    }
  }

  const rawPlan = plan || dbSubscription?.plan || "basic";
  const planKey = String(rawPlan).toLowerCase();
  const fallbackPlanKey = String(dbSubscription?.plan || "basic").toLowerCase();
  const safePlan = ["basic", "starter", "pro"].includes(planKey)
    ? planKey
    : (["basic", "starter", "pro"].includes(fallbackPlanKey) ? fallbackPlanKey : "basic");

  const rawInterval = billingInterval || dbSubscription?.billingInterval || "monthly";
  const intervalKey = String(rawInterval).toLowerCase();
  const safeInterval = ["monthly", "yearly"].includes(intervalKey) ? intervalKey : "monthly";
  const dbPlan = String(dbSubscription?.plan || "").toLowerCase();
  const dbInterval = String(dbSubscription?.billingInterval || "").toLowerCase();
  const inferredUpgradeFromDiff =
    !!dbPlan &&
    !!dbInterval &&
    (safePlan !== dbPlan || safeInterval !== dbInterval);

  return {
    plan: safePlan,
    billingInterval: safeInterval,
    upgrade: cd.upgrade || inferredUpgradeFromDiff,
  };
}

/**
 * Fetch Paddle subscription
 */
export async function fetchPaddleSubscription(subscriptionId) {
  const id = encodeURIComponent(subscriptionId);
  try {
    const subscription = await paddleRequest("GET", `/subscriptions/${id}?include=items`);
    return subscription.data;
  } catch (error) {
    try {
      const subscription = await paddleRequest("GET", `/subscriptions/${id}`);
      return subscription.data;
    } catch (e2) {
      console.error("[Paddle] Error fetching subscription:", e2);
      throw e2;
    }
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
    const encodedId = encodeURIComponent(subscriptionId);
    if (cancelAtPeriodEnd) {
      const subscription = await paddleRequest("PATCH", `/subscriptions/${encodedId}`, {
        scheduled_change: {
          action: "cancel",
          effective_at: "next_billing_period",
        },
      });
      return subscription.data;
    } else {
      // Cancel immediately
      const subscription = await paddleRequest("POST", `/subscriptions/${encodedId}/cancel`, {});
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
 * Verify Paddle Billing webhook signature.
 * Paddle sends a structured header: "ts=<timestamp>;h1=<hmac>"
 * The signed payload is "<timestamp>:<raw_body>".
 * Docs: https://developer.paddle.com/webhooks/signature-verification
 */
export function verifyPaddleWebhookSignature(body, signature) {
  const crypto = require("crypto");
  const secret = process.env.PADDLE_WEBHOOK_SECRET;

  if (!secret) {
    console.warn("[Paddle] PADDLE_WEBHOOK_SECRET not set, skipping signature verification");
    return true; // Allow in development when secret is not configured
  }

  if (!signature) {
    console.warn("[Paddle] Missing Paddle-Signature header");
    return false;
  }

  try {
    // Parse "ts=<timestamp>;h1=<hmac>" format
    const parts = {};
    for (const part of signature.split(";")) {
      const [key, value] = part.split("=");
      if (key && value) parts[key.trim()] = value.trim();
    }

    const ts = parts["ts"];
    const h1 = parts["h1"];

    if (!ts || !h1) {
      console.warn("[Paddle] Malformed Paddle-Signature header (missing ts or h1):", signature);
      return false;
    }

    // Signed payload = "<timestamp>:<raw_body>"
    const signedPayload = `${ts}:${body}`;
    const expectedHmac = crypto
      .createHmac("sha256", secret)
      .update(signedPayload)
      .digest("hex");

    return crypto.timingSafeEqual(
      Buffer.from(expectedHmac, "hex"),
      Buffer.from(h1, "hex")
    );
  } catch (error) {
    console.error("[Paddle] Error verifying webhook signature:", error);
    return false;
  }
}
