import Razorpay from "razorpay";

// Initialize Razorpay
export const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Plan pricing (in paise - 1 INR = 100 paise)
export const PLAN_PRICING = {
  basic: 500,   // ₹5 = 500 paise
  starter: 900, // ₹9 = 900 paise
  pro: 2000,    // ₹20 = 2000 paise
};

// Trial period in days - ALL plans get 7-day free trial
export const PLAN_TRIAL_DAYS = {
  basic: 7,
  starter: 7,
  pro: 7,
};

// Plan page view limits (per domain per month)
export const PLAN_PAGE_VIEW_LIMITS = {
  basic: 100000,    // 100,000 page views per month
  starter: 300000,  // 300,000 page views per month
  pro: Infinity,    // Unlimited page views
};

// Plan details for display
export const PLAN_DETAILS = {
  basic: {
    name: "Basic",
    price: 5,
    pageViews: 100000,
    trialDays: 7,
    features: [
      "1 domain",
      "100,000 page views/month",
      "Basic tracker detection",
      "Cookie consent banner",
      "Community support",
      "7-day free trial",
    ],
  },
  starter: {
    name: "Starter",
    price: 9,
    pageViews: 300000,
    trialDays: 7,
    features: [
      "1 domain",
      "300,000 page views/month",
      "Advanced tracker detection",
      "Customizable banner",
      "Email support",
      "Analytics dashboard",
      "7-day free trial",
    ],
  },
  pro: {
    name: "Pro",
    price: 20,
    pageViews: Infinity,
    trialDays: 7,
    features: [
      "1 domain",
      "Unlimited page views",
      "All tracker types",
      "White-label banner",
      "Priority support",
      "Advanced analytics",
      "API access",
      "7-day free trial",
    ],
  },
};

/**
 * Create a Razorpay order (for one-time payments)
 */
export async function createRazorpayOrder(amount, currency = "INR") {
  const options = {
    amount: amount,
    currency,
    receipt: `receipt_${Date.now()}`,
  };

  try {
    const order = await razorpay.orders.create(options);
    return order;
  } catch (error) {
    console.error("Razorpay order creation error:", error);
    throw error;
  }
}

/**
 * Create Razorpay subscription for recurring payments
 * Trial starts when subscription is activated (payment method added)
 */
export async function createRazorpaySubscription(planId, customer, siteId, domain) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    
    const subscriptionData = {
      plan_id: planId,
      customer_notify: 1,
      total_count: 120, // 10 years of monthly payments
      notes: {
        siteId: siteId,
        domain: domain,
        customer_name: customer.name,
        customer_email: customer.email,
      },
    };

    const subscription = await razorpay.subscriptions.create(subscriptionData);
    
    console.log(`[Razorpay] Created subscription ${subscription.id}`, {
      status: subscription.status,
      authenticate_url: subscription.authenticate_url ? "present" : "missing",
      short_url: subscription.short_url ? "present" : "missing",
    });
    
    return subscription;
  } catch (error) {
    console.error("Razorpay subscription creation error:", error);
    throw error;
  }
}

/**
 * Create a Razorpay plan (typically done once per plan type)
 */
export async function createRazorpayPlan(planName, amount, interval = "monthly") {
  try {
    const planData = {
      period: interval === "monthly" ? "monthly" : "yearly",
      interval: 1,
      item: {
        name: `${planName.charAt(0).toUpperCase() + planName.slice(1)} Plan`,
        amount: amount,
        currency: "INR",
        description: `Monthly subscription for ${planName} plan with 7-day free trial`,
      },
    };

    const plan = await razorpay.plans.create(planData);
    return plan;
  } catch (error) {
    console.error("Razorpay plan creation error:", error);
    throw error;
  }
}

/**
 * Get or create Razorpay plan for a given plan type
 */
export async function getOrCreateRazorpayPlan(planName, amount) {
  try {
    // Check environment for pre-configured plan ID
    const envPlanId = process.env[`RAZORPAY_${planName.toUpperCase()}_PLAN_ID`];
    
    if (envPlanId) {
      try {
        const plan = await razorpay.plans.fetch(envPlanId);
        return plan;
      } catch (error) {
        console.warn(`Plan ID ${envPlanId} not found, creating new plan`);
      }
    }

    // Create new plan
    console.log(`Creating Razorpay plan for ${planName}...`);
    const plan = await createRazorpayPlan(planName, amount);
    console.log(`Created Razorpay plan: ${plan.id} for ${planName}`);
    return plan;
  } catch (error) {
    console.error(`Error getting/creating plan for ${planName}:`, error);
    throw error;
  }
}

/**
 * Fetch subscription from Razorpay
 */
export async function fetchRazorpaySubscription(subscriptionId) {
  try {
    return await razorpay.subscriptions.fetch(subscriptionId);
  } catch (error) {
    console.error("Error fetching subscription:", error);
    throw error;
  }
}

/**
 * Cancel a Razorpay subscription
 */
export async function cancelRazorpaySubscription(subscriptionId, cancelAtCycleEnd = true) {
  try {
    return await razorpay.subscriptions.cancel(subscriptionId, cancelAtCycleEnd);
  } catch (error) {
    console.error("Error cancelling subscription:", error);
    throw error;
  }
}

/**
 * Verify payment signature
 */
export function verifyPaymentSignature(orderId, paymentId, signature) {
  const crypto = require("crypto");
  const secret = process.env.RAZORPAY_KEY_SECRET;

  if (!secret) {
    console.error("RAZORPAY_KEY_SECRET is not set");
    return false;
  }

  try {
    const generatedSignature = crypto
      .createHmac("sha256", secret)
      .update(orderId + "|" + paymentId)
      .digest("hex");

    const isValid = generatedSignature.toLowerCase() === signature.toLowerCase();

    if (!isValid) {
      console.error("Signature verification failed");
    }

    return isValid;
  } catch (error) {
    console.error("Error during signature verification:", error);
    return false;
  }
}

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(body, signature) {
  const crypto = require("crypto");
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!secret) {
    console.warn("RAZORPAY_WEBHOOK_SECRET not set, skipping verification");
    return true; // Allow in development
  }

  try {
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");

    return signature === expectedSignature;
  } catch (error) {
    console.error("Error verifying webhook signature:", error);
    return false;
  }
}
