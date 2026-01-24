import Razorpay from "razorpay";

// Initialize Razorpay with test keys
export const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_1DP5mmOlF5G5ag",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "test_secret_key",
});

// Plan pricing (in paise - 1 INR = 100 paise)
export const PLAN_PRICING = {
  basic: 500, // ₹5 = 500 paise
  starter: 900, // ₹9 = 900 paise
  pro: 2000, // ₹20 = 2000 paise
};

// Trial period in days (only for basic plan)
export const PLAN_TRIAL_DAYS = {
  basic: 7,
  starter: 0,
  pro: 0,
};

// Plan details
export const PLAN_DETAILS = {
  basic: {
    name: "Basic",
    price: 5,
    sites: 1,
    trialDays: 7,
    features: [
      "1 website",
      "Basic tracker detection",
      "Cookie consent banner",
      "Community support",
      "7-day free trial",
    ],
  },
  starter: {
    name: "Starter",
    price: 9,
    sites: 5,
    trialDays: 0,
    features: [
      "5 websites",
      "Advanced tracker detection",
      "Customizable banner",
      "Email support",
      "Analytics dashboard",
    ],
  },
  pro: {
    name: "Pro",
    price: 20,
    sites: Infinity,
    trialDays: 0,
    features: [
      "Unlimited websites",
      "All tracker types",
      "White-label banner",
      "Priority support",
      "Advanced analytics",
      "API access",
    ],
  },
};

export async function createRazorpayOrder(amount, currency = "INR") {
  // Amount is already in paise (from PLAN_PRICING)
  // No need to multiply by 100
  const options = {
    amount: amount, // Amount is already in paise
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
 * Create Razorpay subscription for recurring payments with trial
 * @param {string} planId - Razorpay plan ID
 * @param {Object} customer - Customer details { name, email, contact }
 * @param {number} trialDays - Number of trial days (0 for no trial)
 * @returns {Promise<Object>} Razorpay subscription object
 */
export async function createRazorpaySubscription(planId, customer, trialDays = 0) {
  try {
    // Calculate start_at timestamp (after trial period)
    const startAt = trialDays > 0 
      ? Math.floor(Date.now() / 1000) + (trialDays * 24 * 60 * 60)
      : Math.floor(Date.now() / 1000);
    
    const subscriptionData = {
      plan_id: planId,
      customer_notify: 1,
      total_count: 12, // 12 months of recurring payments
      start_at: startAt,
      notes: {
        customer_name: customer.name,
        customer_email: customer.email,
      },
    };

    // If trial period, add offer_id for trial (or handle via plan settings)
    // Note: Razorpay plans can have trial periods built-in
    // For now, we'll use start_at to delay first charge
    
    const subscription = await razorpay.subscriptions.create(subscriptionData);
    return subscription;
  } catch (error) {
    console.error("Razorpay subscription creation error:", error);
    throw error;
  }
}

/**
 * Create a Razorpay plan (one-time setup, can be done manually in dashboard)
 * @param {string} planName - Name of the plan (basic, starter, pro)
 * @param {number} amount - Amount in paise
 * @param {number} trialDays - Trial period in days (0 for no trial)
 * @param {string} interval - "monthly" or "yearly"
 * @returns {Promise<Object>} Razorpay plan object
 */
export async function createRazorpayPlan(planName, amount, trialDays = 0, interval = "monthly") {
  try {
    const planData = {
      period: interval === "monthly" ? "monthly" : "yearly",
      interval: 1,
      item: {
        name: `${planName.charAt(0).toUpperCase() + planName.slice(1)} Plan`,
        amount: amount, // in paise
        currency: "INR",
        description: `Monthly subscription for ${planName} plan`,
      },
    };

    // Add trial period if specified
    if (trialDays > 0) {
      planData.trial_period = trialDays;
    }

    const plan = await razorpay.plans.create(planData);
    return plan;
  } catch (error) {
    console.error("Razorpay plan creation error:", error);
    throw error;
  }
}

/**
 * Get or create Razorpay plan for a given plan type
 * This ensures the plan exists before creating subscriptions
 */
export async function getOrCreateRazorpayPlan(planName, amount, trialDays = 0) {
  try {
    // Check if plan ID is set in environment
    const envPlanId = process.env[`RAZORPAY_${planName.toUpperCase()}_PLAN_ID`];
    if (envPlanId) {
      // Verify plan exists
      try {
        const plan = await razorpay.plans.fetch(envPlanId);
        return plan;
      } catch (error) {
        console.warn(`Plan ID ${envPlanId} not found, creating new plan`);
      }
    }

    // Create new plan if not found
    console.log(`Creating Razorpay plan for ${planName}...`);
    const plan = await createRazorpayPlan(planName, amount, trialDays);
    console.log(`✅ Created Razorpay plan: ${plan.id} for ${planName}`);
    return plan;
  } catch (error) {
    console.error(`Error getting/creating plan for ${planName}:`, error);
    throw error;
  }
}

export function verifyPaymentSignature(orderId, paymentId, signature) {
  const crypto = require("crypto");
  const secret = process.env.RAZORPAY_KEY_SECRET;
  
  if (!secret || secret === "test_secret_key") {
    console.error("⚠️ RAZORPAY_KEY_SECRET is not set or using placeholder. Signature verification will fail.");
    console.error("⚠️ Please add your actual Razorpay secret key to .env file");
    // For development/testing, we can skip verification if no real secret is set
    // But this should be fixed in production
    if (process.env.NODE_ENV === "development" && !secret) {
      console.warn("⚠️ Skipping signature verification in development mode (no secret key)");
      return true; // Skip verification in dev if no secret is set
    }
    return false;
  }
  
  try {
    // Use Razorpay's signature verification method
    // Signature format: HMAC SHA256 of orderId|paymentId
    const generatedSignature = crypto
      .createHmac("sha256", secret)
      .update(orderId + "|" + paymentId)
      .digest("hex");

    const isValid = generatedSignature.toLowerCase() === signature.toLowerCase();
    
    if (!isValid) {
      console.error("Signature verification failed:", {
        orderId,
        paymentId,
        expectedSignature: generatedSignature,
        receivedSignature: signature,
        secretLength: secret.length,
      });
    } else {
      console.log("✅ Signature verification successful");
    }
    
    return isValid;
  } catch (error) {
    console.error("Error during signature verification:", error);
    return false;
  }
}
