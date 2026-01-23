import Razorpay from "razorpay";

// Initialize Razorpay with test keys
export const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_1DP5mmOlF5G5ag",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "test_secret_key",
});

// Plan pricing (in paise - 1 INR = 100 paise)
export const PLAN_PRICING = {
  free: 0,
  starter: 900, // ₹9 = 900 paise
  pro: 2900, // ₹29 = 2900 paise
};

// Plan details
export const PLAN_DETAILS = {
  free: {
    name: "Free",
    price: 0,
    sites: 1,
    features: [
      "1 website",
      "Basic tracker detection",
      "Cookie consent banner",
      "Community support",
    ],
  },
  starter: {
    name: "Starter",
    price: 9,
    sites: 5,
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
    price: 29,
    sites: Infinity,
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
