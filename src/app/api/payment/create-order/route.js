import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { createRazorpayOrder, PLAN_PRICING, razorpay } from "@/lib/razorpay";
import { prisma } from "@/lib/prisma";

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { plan } = await req.json();

    if (!plan || !["starter", "pro"].includes(plan)) {
      return Response.json(
        { error: "Invalid plan. Choose 'starter' or 'pro'" },
        { status: 400 }
      );
    }

    // Check if user already has this plan or higher
    // Always check database directly, not session (session might be stale)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { subscription: true },
    });

    if (!user) {
      return Response.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const currentPlan = user.subscription?.plan || "free";
    const planHierarchy = { free: 0, starter: 1, pro: 2 };
    
    console.log("Plan check:", {
      sessionPlan: session.user?.plan,
      databasePlan: currentPlan,
      requestedPlan: plan,
      sessionUserId: session.user.id,
    });
    
    if (planHierarchy[currentPlan] >= planHierarchy[plan]) {
      // If session is out of sync, suggest refreshing
      const sessionPlan = session.user?.plan || "free";
      if (sessionPlan !== currentPlan) {
        return Response.json(
          { 
            error: `You are already on ${currentPlan} plan or higher. Your session shows ${sessionPlan}. Please refresh the page.`,
            currentPlan: currentPlan,
            sessionPlan: sessionPlan,
            needsRefresh: true
          },
          { status: 400 }
        );
      }
      return Response.json(
        { error: `You are already on ${currentPlan} plan or higher` },
        { status: 400 }
      );
    }

    const amount = PLAN_PRICING[plan];
    
    if (amount === 0) {
      return Response.json({ error: "Invalid plan" }, { status: 400 });
    }

    // Check if there's a recent order (within last 5 minutes) to avoid creating duplicates
    const existingSubscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id },
    });

    // If there's an existing order and it's recent, reuse it
    if (existingSubscription?.razorpayOrderId) {
      try {
        const existingOrder = await razorpay.orders.fetch(existingSubscription.razorpayOrderId);
        const orderAge = Date.now() - (existingOrder.created_at * 1000);
        const fiveMinutes = 5 * 60 * 1000;
        
        // If order is less than 5 minutes old and not paid, reuse it
        if (orderAge < fiveMinutes && existingOrder.status === "created") {
          console.log("Reusing existing order:", { orderId: existingOrder.id, age: orderAge });
          return Response.json({
            orderId: existingOrder.id,
            amount: existingOrder.amount,
            currency: existingOrder.currency,
            key: process.env.RAZORPAY_KEY_ID || "rzp_test_1DP5mmOlF5G5ag",
          });
        }
      } catch (error) {
        // If order doesn't exist or can't be fetched, create a new one
        console.log("Existing order not found or invalid, creating new one");
      }
    }

    // Create new Razorpay order
    const order = await createRazorpayOrder(amount);
    
    console.log("Created Razorpay order:", { orderId: order.id, amount: order.amount, amountInRupees: order.amount / 100 });

    // Store order ID in subscription (temporary)
    const updated = await prisma.subscription.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        plan: "free", // Will update after payment
        status: "active",
        razorpayOrderId: order.id,
      },
      update: {
        razorpayOrderId: order.id,
      },
    });
    
    console.log("Stored order ID in subscription:", { orderId: updated.razorpayOrderId, userId: session.user.id });

    return Response.json({
      orderId: order.id,
      amount: order.amount, // Amount in paise (900 for ₹9)
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID || "rzp_test_1DP5mmOlF5G5ag",
    });
  } catch (error) {
    console.error("Payment order creation error:", error);
    return Response.json(
      { error: error.message || "Failed to create payment order" },
      { status: 500 }
    );
  }
}
