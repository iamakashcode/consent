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

    const { plan, siteId } = await req.json();

    if (!plan || !["basic", "starter", "pro"].includes(plan)) {
      return Response.json(
        { error: "Invalid plan. Choose 'basic', 'starter', or 'pro'" },
        { status: 400 }
      );
    }

    if (!siteId) {
      return Response.json(
        { error: "Site ID is required. Please select a domain first." },
        { status: 400 }
      );
    }

    // Verify site belongs to user
    // siteId parameter can be either the public siteId (from site.siteId) or the database ID
    // Try finding by public siteId first
    let site = await prisma.site.findFirst({
      where: {
        siteId: siteId, // Public siteId field
        userId: session.user.id,
      },
      include: { subscription: true },
    });

    // If not found by public siteId, try finding by database ID
    if (!site) {
      site = await prisma.site.findUnique({
        where: { id: siteId }, // Try as database ID
        include: { subscription: true },
      });
      
      // Verify it belongs to the user
      if (site && site.userId !== session.user.id) {
        site = null;
      }
    }

    if (!site) {
      return Response.json(
        { error: "Site not found. Please add the domain first." },
        { status: 404 }
      );
    }

    if (site.userId !== session.user.id) {
      return Response.json(
        { error: "Unauthorized: This site does not belong to you" },
        { status: 403 }
      );
    }

    // Use the database ID for subscription creation
    const siteDbId = site.id;

    // Check if site already has a subscription
    const currentSubscription = site.subscription;
    const planHierarchy = { basic: 0, starter: 1, pro: 2 };
    
    console.log("Plan check for site:", {
      siteId,
      siteDbId,
      domain: site.domain,
      currentPlan: currentSubscription?.plan,
      requestedPlan: plan,
      userId: session.user.id,
    });
    
    // If site already has a subscription, check if it's an upgrade
    if (currentSubscription) {
      const currentPlanLevel = planHierarchy[currentSubscription.plan] || 0;
      const requestedPlanLevel = planHierarchy[plan] || 0;
      
      if (currentPlanLevel >= requestedPlanLevel) {
        return Response.json(
          { error: `This domain already has ${currentSubscription.plan} plan or higher. Cannot downgrade.` },
          { status: 400 }
        );
      }
      // Allow upgrade
    }

    const amount = PLAN_PRICING[plan];
    const trialDays = PLAN_TRIAL_DAYS[plan] || 0;
    
    // For basic plan with trial, set up Razorpay subscription with trial period
    // This requires user to add payment method, then Razorpay will auto-charge after trial
    if (plan === "basic" && trialDays > 0) {
      const trialEndAt = calculateTrialEndDate(plan);
      
      // Check if subscription already exists for this site with active trial
      const existingSubscription = await prisma.subscription.findUnique({
        where: { siteId: siteDbId },
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
          siteId: site.siteId, // Return public siteId
          siteDbId: siteDbId, // Internal ID
          domain: site.domain,
          message: `Your ${trialDays}-day free trial for ${site.domain} is already active! Payment will be automatically deducted after the trial period.`,
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
          where: { siteId: siteDbId },
          create: {
            siteId: siteDbId,
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
          siteId: site.siteId, // Return public siteId
          siteDbId: siteDbId, // Internal ID
          domain: site.domain,
          requiresSetup: true,
          message: `Your ${trialDays}-day free trial for ${site.domain} has started! Please set up payment method to enable automatic billing after trial.`,
        });
      }
      
      // Get user info for Razorpay subscription
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { name: true, email: true },
      });
      
      // Create Razorpay subscription with trial
      let razorpaySubscription;
      try {
        razorpaySubscription = await createRazorpaySubscription(
          razorpayPlan.id,
          {
            name: user?.name || "User",
            email: user?.email || session.user.email,
            contact: undefined,
          },
          trialDays
        );
        
        console.log("Created Razorpay subscription:", razorpaySubscription.id);
      } catch (error) {
        console.error("Failed to create Razorpay subscription:", error);
        // Fallback: create subscription in database
        await prisma.subscription.upsert({
          where: { siteId: siteDbId },
          create: {
            siteId: siteDbId,
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
          siteId: site.siteId, // Return public siteId
          siteDbId: siteDbId, // Internal ID
          domain: site.domain,
          requiresSetup: true,
          message: `Your ${trialDays}-day free trial for ${site.domain} has started! Please set up payment method to enable automatic billing after trial.`,
        });
      }
      
      // Store subscription in database for this site
      await prisma.subscription.upsert({
        where: { siteId: siteDbId },
        create: {
          siteId: siteDbId,
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
      
      if (!authUrl) {
        console.warn("No auth URL in subscription response, fetching from Razorpay...");
        // Fetch subscription again to get auth URL
        try {
          const fetchedSub = await razorpay.subscriptions.fetch(razorpaySubscription.id);
          const fetchedAuthUrl = fetchedSub.authenticate_url || fetchedSub.short_url;
          if (fetchedAuthUrl) {
            return Response.json({
              success: true,
              trial: true,
              trialDays: trialDays,
              trialEndAt: trialEndAt.toISOString(),
              subscriptionId: razorpaySubscription.id,
              subscriptionAuthUrl: fetchedAuthUrl,
              requiresPaymentSetup: true,
              siteId: site.siteId, // Return public siteId
              siteDbId: siteDbId, // Internal ID
              domain: site.domain,
              message: `Please add a payment method to start your ${trialDays}-day free trial for ${site.domain}. Payment will be automatically deducted after the trial period.`,
            });
          }
        } catch (error) {
          console.error("Error fetching subscription auth URL:", error);
        }
      }
      
      return Response.json({
        success: true,
        trial: true,
        trialDays: trialDays,
        trialEndAt: trialEndAt.toISOString(),
        subscriptionId: razorpaySubscription.id,
        subscriptionAuthUrl: authUrl,
        requiresPaymentSetup: true,
        redirectToRazorpay: true, // Force redirect
        siteId: site.siteId, // Return public siteId
        siteDbId: siteDbId, // Internal ID
        domain: site.domain,
        message: `Please add a payment method to start your ${trialDays}-day free trial for ${site.domain}. Payment will be automatically deducted after the trial period.`,
      });
    }
    
    if (amount === 0) {
      return Response.json({ error: "Invalid plan" }, { status: 400 });
    }

    // For Starter and Pro plans, create Razorpay SUBSCRIPTION (not one-time order)
    // This ensures recurring monthly payments
    console.log(`Creating Razorpay subscription for ${plan} plan for site ${siteId}...`);
    
    // Get user info for Razorpay subscription
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true },
    });
    
    // Get or create Razorpay plan for this plan type
    let razorpayPlan;
    try {
      razorpayPlan = await getOrCreateRazorpayPlan(plan, amount, 0); // No trial for starter/pro
    } catch (error) {
      console.error("Failed to get/create Razorpay plan:", error);
      return Response.json(
        { error: "Failed to set up subscription plan. Please try again." },
        { status: 500 }
      );
    }
    
    // Create Razorpay subscription (recurring monthly)
    let razorpaySubscription;
    try {
      razorpaySubscription = await createRazorpaySubscription(
        razorpayPlan.id,
        {
          name: user?.name || "User",
          email: user?.email || session.user.email,
          contact: undefined,
        },
        0 // No trial for starter/pro
      );
      
      console.log("Created Razorpay subscription:", razorpaySubscription.id);
    } catch (error) {
      console.error("Failed to create Razorpay subscription:", error);
      return Response.json(
        { error: "Failed to create subscription. Please try again." },
        { status: 500 }
      );
    }
    
    // Get authentication URL for payment method setup
    let authUrl = razorpaySubscription.authenticate_url || razorpaySubscription.short_url;
    
    if (!authUrl) {
      // Try fetching subscription to get auth URL
      try {
        const fetchedSub = await razorpay.subscriptions.fetch(razorpaySubscription.id);
        authUrl = fetchedSub.authenticate_url || fetchedSub.short_url;
      } catch (error) {
        console.error("Error fetching subscription auth URL:", error);
      }
    }
    
    // Store subscription in database for this site
    await prisma.subscription.upsert({
      where: { siteId: siteDbId },
      create: {
        siteId: siteDbId,
        plan: plan,
        status: "pending", // Will be activated after payment method is added
        razorpayPlanId: razorpayPlan.id,
        razorpaySubscriptionId: razorpaySubscription.id,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
      update: {
        plan: plan,
        status: "pending",
        razorpayPlanId: razorpayPlan.id,
        razorpaySubscriptionId: razorpaySubscription.id,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    
    return Response.json({
      success: true,
      subscription: true,
      subscriptionId: razorpaySubscription.id,
      subscriptionAuthUrl: authUrl,
      requiresPaymentSetup: true,
      redirectToRazorpay: true,
      plan: plan,
      siteId: site.siteId, // Return public siteId
      siteDbId: siteDbId, // Internal ID
      domain: site.domain,
      amount: amount,
      amountInRupees: amount / 100,
      message: `Set up your ${plan.charAt(0).toUpperCase() + plan.slice(1)} plan subscription for ${site.domain}. This is a recurring monthly subscription.`,
    });
  } catch (error) {
    console.error("Payment order creation error:", error);
    return Response.json(
      { error: error.message || "Failed to create payment order" },
      { status: 500 }
    );
  }
}
