import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { createRazorpayOrder, PLAN_PRICING, PLAN_TRIAL_DAYS, razorpay } from "@/lib/razorpay";
import { prisma } from "@/lib/prisma";
import { calculateTrialEndDate } from "@/lib/subscription";

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { plan } = await req.json();

    if (!plan || !["basic", "starter", "pro"].includes(plan)) {
      return Response.json(
        { error: "Invalid plan. Choose 'basic', 'starter', or 'pro'" },
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

    const currentPlan = user.subscription?.plan;
    const planHierarchy = { basic: 0, starter: 1, pro: 2 };
    
    console.log("Plan check:", {
      sessionPlan: session.user?.plan,
      databasePlan: currentPlan,
      requestedPlan: plan,
      sessionUserId: session.user.id,
      hasSubscription: !!user.subscription,
    });
    
    // Special handling for basic plan: always allow if user has no plan or has basic plan
    // This allows trial setup for new users and retry for existing basic users
    if (plan === "basic") {
      if (!currentPlan) {
        // No plan - allow basic plan selection (will create trial)
        console.log("User has no plan, allowing basic plan selection");
      } else if (currentPlan === "basic") {
        // Already has basic - allow (might be retrying trial setup or checking status)
        console.log("User already has basic plan, allowing trial setup/retry");
      } else {
        // Has higher plan - block downgrade
        return Response.json(
          { error: `You are already on ${currentPlan} plan. Cannot downgrade to basic.` },
          { status: 400 }
        );
      }
    } else {
      // For starter/pro plans, check if user already has this plan or higher
      if (currentPlan) {
        if (planHierarchy[currentPlan] >= planHierarchy[plan]) {
          // If session is out of sync, suggest refreshing
          const sessionPlan = session.user?.plan;
          if (sessionPlan !== currentPlan) {
            return Response.json(
              { 
                error: `You are already on ${currentPlan} plan or higher. Your session shows ${sessionPlan || 'no plan'}. Please refresh the page.`,
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
      }
      // If no plan, allow them to select any plan
    }

    const amount = PLAN_PRICING[plan];
    const trialDays = PLAN_TRIAL_DAYS[plan] || 0;
    
    // For basic plan with trial, start trial without payment
    // Set up subscription for automatic payment after trial
    if (plan === "basic" && trialDays > 0) {
      const trialEndAt = calculateTrialEndDate(plan);
      
      // Create a Razorpay plan for recurring payments (if not exists)
      // Note: In production, create these plans in Razorpay dashboard
      let razorpayPlanId = process.env.RAZORPAY_BASIC_PLAN_ID; // Set this in .env
      
      // If no plan ID, we'll use one-time payment for now
      // In production, create plans in Razorpay dashboard and store IDs
      
      // Check if subscription already exists with trial
      const existingSubscription = await prisma.subscription.findUnique({
        where: { userId: session.user.id },
      });
      
      // Only create/update if trial hasn't been set up yet, or if trial has expired
      const shouldSetupTrial = !existingSubscription || 
                                !existingSubscription.trialEndAt || 
                                new Date(existingSubscription.trialEndAt) < new Date();
      
      if (shouldSetupTrial) {
        // Update subscription to start trial
        await prisma.subscription.upsert({
          where: { userId: session.user.id },
          create: {
            userId: session.user.id,
            plan: "basic",
            status: "active",
            trialEndAt: trialEndAt,
            currentPeriodStart: new Date(),
            // Set period end to trial end (will be extended after payment)
            currentPeriodEnd: trialEndAt,
            razorpayPlanId: razorpayPlanId || null,
          },
          update: {
            plan: "basic",
            status: "active",
            trialEndAt: trialEndAt,
            currentPeriodStart: new Date(),
            currentPeriodEnd: trialEndAt,
            cancelAtPeriodEnd: false,
            razorpayPlanId: razorpayPlanId || null,
          },
        });
      } else {
        // Trial already active, return existing trial info
        return Response.json({
          success: true,
          trial: true,
          trialDays: trialDays,
          trialEndAt: existingSubscription.trialEndAt.toISOString(),
          message: `Your ${trialDays}-day free trial is already active! Payment will be automatically deducted after the trial period.`,
        });
      }

      return Response.json({
        success: true,
        trial: true,
        trialDays: trialDays,
        trialEndAt: trialEndAt.toISOString(),
        message: `Your ${trialDays}-day free trial has started! Payment will be automatically deducted after the trial period.`,
      });
    }
    
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
        plan: "basic", // Will update after payment
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
