import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { createRazorpayOrder, PLAN_PRICING, PLAN_TRIAL_DAYS, razorpay, getOrCreateRazorpayPlan, createRazorpaySubscription } from "@/lib/razorpay";
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
    
    // For basic plan with trial, set up Razorpay subscription with trial period
    // This requires user to add payment method, then Razorpay will auto-charge after trial
    if (plan === "basic" && trialDays > 0) {
      const trialEndAt = calculateTrialEndDate(plan);
      
      // Check if subscription already exists with active trial
      const existingSubscription = await prisma.subscription.findUnique({
        where: { userId: session.user.id },
      });
      
      // If subscription exists with active trial, return existing info
      if (existingSubscription && 
          existingSubscription.trialEndAt && 
          new Date(existingSubscription.trialEndAt) > new Date() &&
          existingSubscription.razorpaySubscriptionId) {
        return Response.json({
          success: true,
          trial: true,
          trialDays: trialDays,
          trialEndAt: existingSubscription.trialEndAt.toISOString(),
          subscriptionId: existingSubscription.razorpaySubscriptionId,
          message: `Your ${trialDays}-day free trial is already active! Payment will be automatically deducted after the trial period.`,
        });
      }
      
      // Get or create Razorpay plan for basic
      const amount = PLAN_PRICING.basic;
      let razorpayPlan;
      try {
        razorpayPlan = await getOrCreateRazorpayPlan("basic", amount, trialDays);
      } catch (error) {
        console.error("Failed to get/create Razorpay plan:", error);
        // Fallback: create subscription in database without Razorpay subscription
        // User will need to set up payment later
        await prisma.subscription.upsert({
          where: { userId: session.user.id },
          create: {
            userId: session.user.id,
            plan: "basic",
            status: "active",
            trialEndAt: trialEndAt,
            currentPeriodStart: new Date(),
            currentPeriodEnd: trialEndAt,
          },
          update: {
            plan: "basic",
            status: "active",
            trialEndAt: trialEndAt,
            currentPeriodStart: new Date(),
            currentPeriodEnd: trialEndAt,
          },
        });
        
        return Response.json({
          success: true,
          trial: true,
          trialDays: trialDays,
          trialEndAt: trialEndAt.toISOString(),
          requiresSetup: true,
          message: `Your ${trialDays}-day free trial has started! Please set up payment method to enable automatic billing after trial.`,
        });
      }
      
      // Create Razorpay subscription with trial
      let razorpaySubscription;
      try {
        razorpaySubscription = await createRazorpaySubscription(
          razorpayPlan.id,
          {
            name: user.name || "User",
            email: user.email,
            contact: user.phone || undefined,
          },
          trialDays
        );
        
        console.log("Created Razorpay subscription:", razorpaySubscription.id);
      } catch (error) {
        console.error("Failed to create Razorpay subscription:", error);
        // Fallback: create subscription in database
        await prisma.subscription.upsert({
          where: { userId: session.user.id },
          create: {
            userId: session.user.id,
            plan: "basic",
            status: "active",
            trialEndAt: trialEndAt,
            currentPeriodStart: new Date(),
            currentPeriodEnd: trialEndAt,
            razorpayPlanId: razorpayPlan.id,
          },
          update: {
            plan: "basic",
            status: "active",
            trialEndAt: trialEndAt,
            currentPeriodStart: new Date(),
            currentPeriodEnd: trialEndAt,
            razorpayPlanId: razorpayPlan.id,
          },
        });
        
        return Response.json({
          success: true,
          trial: true,
          trialDays: trialDays,
          trialEndAt: trialEndAt.toISOString(),
          requiresSetup: true,
          message: `Your ${trialDays}-day free trial has started! Please set up payment method to enable automatic billing after trial.`,
        });
      }
      
      // Store subscription in database
      await prisma.subscription.upsert({
        where: { userId: session.user.id },
        create: {
          userId: session.user.id,
          plan: "basic",
          status: "pending", // Will be activated after user adds payment method
          trialEndAt: trialEndAt,
          currentPeriodStart: new Date(),
          currentPeriodEnd: trialEndAt,
          razorpayPlanId: razorpayPlan.id,
          razorpaySubscriptionId: razorpaySubscription.id,
        },
        update: {
          plan: "basic",
          status: "pending",
          trialEndAt: trialEndAt,
          currentPeriodStart: new Date(),
          currentPeriodEnd: trialEndAt,
          razorpayPlanId: razorpayPlan.id,
          razorpaySubscriptionId: razorpaySubscription.id,
        },
      });

      // Return subscription details for frontend to redirect to Razorpay subscription auth
      // Razorpay subscription has authenticate_url or short_url for payment method setup
      const authUrl = razorpaySubscription.authenticate_url || razorpaySubscription.short_url;
      
      return Response.json({
        success: true,
        trial: true,
        trialDays: trialDays,
        trialEndAt: trialEndAt.toISOString(),
        subscriptionId: razorpaySubscription.id,
        subscriptionAuthUrl: authUrl,
        requiresPaymentSetup: true,
        message: `Please add a payment method to start your ${trialDays}-day free trial. Payment will be automatically deducted after the trial period.`,
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
