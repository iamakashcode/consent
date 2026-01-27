import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import {
  PLAN_PRICING,
  getOrCreateRazorpayPlan,
  createRazorpaySubscription,
  fetchRazorpaySubscription
} from "@/lib/razorpay";
import { prisma } from "@/lib/prisma";


/**
 * Create a Razorpay subscription for a domain
 * Domain-first: each domain gets its own subscription
 */
export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { plan, siteId } = await req.json();

    // Validate plan
    if (!plan || !["basic", "starter", "pro"].includes(plan)) {
      return Response.json(
        { error: "Invalid plan. Choose 'basic', 'starter', or 'pro'" },
        { status: 400 }
      );
    }

    // siteId is required for domain-first subscriptions
    if (!siteId) {
      return Response.json(
        { error: "Site ID is required. Please add a domain first." },
        { status: 400 }
      );
    }

    // Find site by public siteId or database ID
    const site = await prisma.site.findFirst({
      where: {
        OR: [
          { siteId: siteId },
          { id: siteId },
        ],
        userId: session.user.id,
      },
      include: { subscription: true },
    });

    if (!site) {
      return Response.json(
        { error: "Site not found. Please add the domain first." },
        { status: 404 }
      );
    }

    // Check if domain already has an active subscription
    if (site.subscription) {
      const status = site.subscription.status?.toLowerCase();

      // If subscription is pending, allow re-attempting payment setup
      if (status === "pending") {
        // Check if we have an existing Razorpay subscription
        if (site.subscription.razorpaySubscriptionId) {
          try {
            const existingSub = await fetchRazorpaySubscription(site.subscription.razorpaySubscriptionId);
            if (existingSub.authenticate_url || existingSub.short_url) {
              return Response.json({
                success: true,
                subscriptionId: existingSub.id,
                subscriptionAuthUrl: existingSub.authenticate_url || existingSub.short_url,
                requiresPaymentSetup: true,
                siteId: site.siteId,
                domain: site.domain,
                message: "Complete payment setup for your subscription.",
              });
            }
          } catch (error) {
            console.log("[Payment] Existing subscription not fetchable, creating new one");
            // Continue to create new subscription
          }
        }
      } else if (status === "active" || status === "trial") {
        return Response.json(
          { error: `This domain already has an active ${site.subscription.plan} subscription.` },
          { status: 400 }
        );
      } else if (status === "cancelled" && site.subscription.currentPeriodEnd) {
        const periodEnd = new Date(site.subscription.currentPeriodEnd);
        if (new Date() < periodEnd) {
          return Response.json(
            { error: `This domain has a cancelled subscription that's active until ${periodEnd.toLocaleDateString()}.` },
            { status: 400 }
          );
        }
        // Period ended, allow new subscription
      }
      // For other statuses (expired, payment_failed), allow new subscription
    }

    const amount = PLAN_PRICING[plan];

    // Get user info for Razorpay
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true },
    });

    // Get or create Razorpay plan
    let razorpayPlan;
    try {
      razorpayPlan = await getOrCreateRazorpayPlan(plan, amount);
    } catch (error) {
      console.error("[Payment] Failed to get/create Razorpay plan:", error);
      return Response.json(
        { error: "Failed to set up subscription plan. Please try again." },
        { status: 500 }
      );
    }

    // Create Razorpay subscription
    let razorpaySubscription;
    try {
      razorpaySubscription = await createRazorpaySubscription(
        razorpayPlan.id,
        {
          name: user?.name || "User",
          email: user?.email || session.user.email,
        },
        site.id,
        site.domain
      );
    } catch (error) {
      console.error("[Payment] Failed to create Razorpay subscription:", error);
      return Response.json(
        { error: "Failed to create subscription. Please try again." },
        { status: 500 }
      );
    }

    // Create or update subscription in database (pending until payment method added)
    try {
      if (site.subscription) {
        // Update existing subscription
        await prisma.subscription.update({
          where: { siteId: site.id },
          data: {
            plan: plan,
            status: "pending",
            razorpayPlanId: razorpayPlan.id,
            razorpaySubscriptionId: razorpaySubscription.id,
            updatedAt: new Date(),
          },
        });
      } else {
        // Create new subscription
        await prisma.subscription.create({
          data: {
            siteId: site.id,
            plan: plan,
            status: "pending",
            razorpayPlanId: razorpayPlan.id,
            razorpaySubscriptionId: razorpaySubscription.id,
          },
        });
      }
    } catch (dbError) {
      console.error("[Payment] Database error:", dbError);
      return Response.json(
        { error: "Failed to save subscription. Please try again." },
        { status: 500 }
      );
    }

    // Get authentication URL
    let authUrl = razorpaySubscription.authenticate_url || razorpaySubscription.short_url;

    // If no auth URL, try fetching again (sometimes delayed)
    if (!authUrl) {
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const fetchedSub = await fetchRazorpaySubscription(razorpaySubscription.id);
        authUrl = fetchedSub.authenticate_url || fetchedSub.short_url;
      } catch (error) {
        console.warn("[Payment] Could not fetch auth URL:", error);
      }
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ||
      req.headers.get("origin") ||
      `http://${req.headers.get("host")}`;

    const redirectTarget = `/dashboard/usage?payment=success&siteId=${site.siteId}`;
    const returnUrl = `${baseUrl}/payment/return?subscription_id=${razorpaySubscription.id}&siteId=${site.siteId}&redirect=${encodeURIComponent(redirectTarget)}`;

    // Append return URL to auth URL if possible
    if (authUrl) {
      try {
        const urlWithReturn = new URL(authUrl);
        urlWithReturn.searchParams.set("redirect_url", returnUrl);
        authUrl = urlWithReturn.toString();
      } catch (error) {
        // Use original authUrl if URL parsing fails
      }
    }

    console.log(`[Payment] Created subscription ${razorpaySubscription.id} for ${site.domain}`);

    return Response.json({
      success: true,
      subscriptionId: razorpaySubscription.id,
      subscriptionAuthUrl: authUrl,
      requiresPaymentSetup: true,
      returnUrl: returnUrl,
      siteId: site.siteId,
      domain: site.domain,
      plan: plan,
      message: `Please complete payment setup for ${site.domain}. Your 7-day free trial will start after activation.`,
    });

  } catch (error) {
    console.error("[Payment] Error:", error);
    return Response.json(
      { error: error.message || "Failed to create payment order" },
      { status: 500 }
    );
  }
}
