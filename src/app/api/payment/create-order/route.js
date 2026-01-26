import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { createRazorpayOrder, PLAN_PRICING, PLAN_TRIAL_DAYS, razorpay, getOrCreateRazorpayPlan, createRazorpaySubscription } from "@/lib/razorpay";
import { prisma } from "@/lib/prisma";
import { calculateTrialEndDate } from "@/lib/subscription";

// Helper function to ensure siteId column exists and is properly configured in subscriptions table
async function ensureSubscriptionSiteIdColumn() {
  try {
    // Check if column exists and its properties
    const result = await prisma.$queryRaw`
      SELECT 
        column_name, 
        data_type, 
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'subscriptions' AND column_name = 'siteId'
    `;
    
    if (!result || result.length === 0) {
      console.warn("[Payment] siteId column missing in subscriptions table, attempting to add it");
      // Try to add the column
      try {
        await prisma.$executeRaw`
          ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS "siteId" TEXT;
        `;
        console.log("[Payment] Added siteId column");
      } catch (alterError) {
        console.error("[Payment] Failed to add siteId column:", alterError.message);
        throw new Error("Database schema issue: siteId column missing. Please run migrations.");
      }
    } else {
      const column = result[0];
      console.log("[Payment] siteId column exists:", {
        dataType: column.data_type,
        isNullable: column.is_nullable,
      });
      
      // Check if it's nullable - if so, we need to fix it
      if (column.is_nullable === 'YES') {
        console.warn("[Payment] siteId column is nullable, checking for null values...");
        
        // Check for null values
        const nullCount = await prisma.$queryRaw`
          SELECT COUNT(*)::int as count FROM subscriptions WHERE "siteId" IS NULL
        `;
        
        if (nullCount[0].count > 0) {
          console.warn(`[Payment] Found ${nullCount[0].count} subscriptions with null siteId, deleting them...`);
          await prisma.$executeRaw`
            DELETE FROM subscriptions WHERE "siteId" IS NULL
          `;
        }
        
        // Make it NOT NULL
        try {
          await prisma.$executeRaw`
            ALTER TABLE subscriptions ALTER COLUMN "siteId" SET NOT NULL
          `;
          console.log("[Payment] Made siteId NOT NULL");
        } catch (notNullError) {
          console.error("[Payment] Failed to make siteId NOT NULL:", notNullError.message);
        }
      }
    }
    
    // Check and add unique constraint
    const constraintCheck = await prisma.$queryRaw`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'subscriptions' 
      AND constraint_name = 'subscriptions_siteId_key'
    `;
    
    if (!constraintCheck || constraintCheck.length === 0) {
      console.warn("[Payment] siteId unique constraint missing, adding it...");
      try {
        await prisma.$executeRaw`
          ALTER TABLE subscriptions ADD CONSTRAINT "subscriptions_siteId_key" UNIQUE ("siteId")
        `;
        console.log("[Payment] Added siteId unique constraint");
      } catch (constraintError) {
        console.error("[Payment] Failed to add unique constraint:", constraintError.message);
      }
    }
    
    // Check and add foreign key
    const fkCheck = await prisma.$queryRaw`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'subscriptions' 
      AND constraint_name = 'subscriptions_siteId_fkey'
    `;
    
    if (!fkCheck || fkCheck.length === 0) {
      console.warn("[Payment] siteId foreign key missing, adding it...");
      try {
        await prisma.$executeRaw`
          ALTER TABLE subscriptions 
          ADD CONSTRAINT "subscriptions_siteId_fkey" 
          FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE
        `;
        console.log("[Payment] Added siteId foreign key");
      } catch (fkError) {
        console.error("[Payment] Failed to add foreign key:", fkError.message);
      }
    }
    
  } catch (error) {
    console.error("[Payment] Error checking/fixing siteId column:", error.message);
    // Don't throw - let the upsert operations handle it with their fallbacks
  }
}

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
    console.log("[Payment] Looking up site with siteId parameter:", siteId, "for user:", session.user.id);
    
    let site = null;
    let currentSubscription = null;
    
    try {
      // Try with subscription relation first
      site = await prisma.site.findFirst({
        where: {
          siteId: siteId, // Public siteId field
          userId: session.user.id,
        },
        include: { subscription: true },
      });
      
      if (site) {
        console.log("[Payment] Found site by public siteId:", {
          id: site.id,
          siteId: site.siteId,
          domain: site.domain,
          hasSubscription: !!site.subscription,
        });
        currentSubscription = site.subscription;
      } else {
        console.log("[Payment] Site not found by public siteId:", siteId);
      }
    } catch (relationError) {
      console.error("[Payment] Error fetching site with subscription relation:", relationError.message);
      // If relation fails (e.g., schema mismatch), try without it
      try {
        site = await prisma.site.findFirst({
          where: {
            siteId: siteId,
            userId: session.user.id,
          },
        });
        
        if (site) {
          console.log("[Payment] Found site by public siteId (without relation):", {
            id: site.id,
            siteId: site.siteId,
            domain: site.domain,
          });
        }
        
        // If found, try to get subscription separately
        if (site) {
          try {
            currentSubscription = await prisma.subscription.findUnique({
              where: { siteId: site.id },
            });
          } catch (subError) {
            console.error("[Payment] Error fetching subscription:", subError.message);
            // Continue without subscription - will create new one
            currentSubscription = null;
          }
        }
      } catch (siteError) {
        console.error("[Payment] Error fetching site:", siteError.message);
      }
    }

    // If not found by public siteId, try finding by database ID
    if (!site) {
      console.log("[Payment] Trying to find site by database ID:", siteId);
      try {
        site = await prisma.site.findUnique({
          where: { id: siteId }, // Try as database ID
        });
        
        if (site) {
          console.log("[Payment] Found site by database ID:", {
            id: site.id,
            siteId: site.siteId,
            domain: site.domain,
            userId: site.userId,
          });
        }
        
        // Verify it belongs to the user
        if (site && site.userId !== session.user.id) {
          console.error("[Payment] Site belongs to different user:", {
            siteUserId: site.userId,
            sessionUserId: session.user.id,
          });
          site = null;
        } else if (site) {
          // Try to get subscription separately
          try {
            currentSubscription = await prisma.subscription.findUnique({
              where: { siteId: site.id },
            });
          } catch (subError) {
            console.error("[Payment] Error fetching subscription for site:", subError.message);
            currentSubscription = null;
          }
        }
      } catch (dbError) {
        console.error("[Payment] Error fetching site by ID:", dbError.message);
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

    // CRITICAL: Validate site.id exists before using it
    console.log("[Payment] Validating site object:", {
      hasId: !!site.id,
      id: site.id,
      idType: typeof site.id,
      siteId: site.siteId,
      domain: site.domain,
      userId: site.userId,
    });
    
    if (!site.id || typeof site.id !== 'string' || site.id.trim().length === 0) {
      console.error("[Payment] FATAL: site.id is invalid:", {
        siteId: site.siteId,
        domain: site.domain,
        siteIdValue: site.id,
        siteIdType: typeof site.id,
        fullSite: JSON.stringify(site, null, 2),
      });
      return Response.json(
        { error: "Invalid site data. Please add the domain again." },
        { status: 400 }
      );
    }

    // Use the database ID for subscription creation
    const siteDbId = site.id;
    console.log("[Payment] Using siteDbId (database ID):", siteDbId, "for site with public siteId:", site.siteId, "domain:", site.domain);

    // CRITICAL: Validate siteDbId is not null/undefined/empty
    if (!siteDbId || siteDbId === 'null' || siteDbId === 'undefined' || String(siteDbId).trim().length === 0) {
      console.error("[Payment] FATAL: siteDbId is invalid after assignment:", {
        siteDbId,
        type: typeof siteDbId,
        site: {
          id: site.id,
          siteId: site.siteId,
          domain: site.domain,
        },
      });
      return Response.json(
        { error: "Invalid site. Please add the domain again." },
        { status: 400 }
      );
    }

    // Log siteDbId for debugging
    console.log("[Payment] Using siteDbId:", siteDbId, "type:", typeof siteDbId, "stringified:", String(siteDbId), "length:", String(siteDbId).length);

    // Verify the site actually exists in database with this ID
    try {
      const verifySite = await prisma.site.findUnique({
        where: { id: siteDbId },
        select: { id: true, domain: true, userId: true },
      });
      
      if (!verifySite) {
        console.error("[Payment] FATAL: Site not found in database with ID:", siteDbId);
        return Response.json(
          { error: "Site not found in database. Please add the domain again." },
          { status: 404 }
        );
      }
      
      if (verifySite.userId !== session.user.id) {
        console.error("[Payment] FATAL: Site belongs to different user:", {
          siteUserId: verifySite.userId,
          sessionUserId: session.user.id,
        });
        return Response.json(
          { error: "Unauthorized: This site does not belong to you" },
          { status: 403 }
        );
      }
      
      console.log("[Payment] Verified site exists:", verifySite.domain, "with ID:", verifySite.id);
    } catch (verifyError) {
      console.error("[Payment] Error verifying site:", verifyError.message);
      return Response.json(
        { error: "Error verifying site. Please try again." },
        { status: 500 }
      );
    }

    // Ensure siteId column exists in subscriptions table
    await ensureSubscriptionSiteIdColumn();

    // Check if site already has a subscription (already fetched above)
    const planHierarchy = { basic: 0, starter: 1, pro: 2 };
    
    console.log("Plan check for site:", {
      siteId,
      siteDbId,
      domain: site.domain,
      currentPlan: currentSubscription?.plan,
      currentStatus: currentSubscription?.status,
      requestedPlan: plan,
      userId: session.user.id,
    });
    
    // If site already has a subscription, check if it's an upgrade or renewal
    if (currentSubscription) {
      const currentPlanLevel = planHierarchy[currentSubscription.plan] || 0;
      const requestedPlanLevel = planHierarchy[plan] || 0;
      const subscriptionStatus = currentSubscription.status?.toLowerCase() || 'active';
      
      console.log("Subscription check:", {
        currentPlan: currentSubscription.plan,
        currentStatus: subscriptionStatus,
        requestedPlan: plan,
        currentLevel: currentPlanLevel,
        requestedLevel: requestedPlanLevel,
      });
      
      // Always allow if subscription is pending - user needs to complete payment setup
      if (subscriptionStatus === 'pending') {
        console.log("Subscription is pending - allowing plan selection to complete payment");
        // Continue - will update the existing pending subscription
      }
      // Always allow if subscription is cancelled or expired
      else if (['cancelled', 'expired'].includes(subscriptionStatus)) {
        console.log("Subscription is inactive - allowing plan selection");
        // Continue - will create/update subscription
      }
      // For active subscriptions, check plan levels
      else if (subscriptionStatus === 'active') {
        const isUpgrade = requestedPlanLevel > currentPlanLevel;
        const isSamePlan = requestedPlanLevel === currentPlanLevel;
        const isDowngrade = requestedPlanLevel < currentPlanLevel;
        
        if (isSamePlan) {
          // Same plan and already active - block
          return Response.json(
            { error: `This domain already has an active ${currentSubscription.plan} plan. To change plans, please cancel the current subscription first.` },
            { status: 400 }
          );
        }
        
        if (isDowngrade) {
          // Trying to downgrade - block
          return Response.json(
            { error: `This domain already has ${currentSubscription.plan} plan. Cannot downgrade to ${plan}.` },
            { status: 400 }
          );
        }
        
        // It's an upgrade - allow
        console.log("Upgrade detected - allowing");
      }
      // For any other status, allow (to be safe)
      else {
        console.log("Unknown subscription status - allowing plan selection");
      }
    }

    const amount = PLAN_PRICING[plan];
    
    // Validate amount
    if (amount === 0) {
      return Response.json({ error: "Invalid plan" }, { status: 400 });
    }
    
    // IMPORTANT: Trial is NOT given at subscription creation
    // Trial will start ONLY AFTER subscription is activated (payment method added)
    // This is handled in the webhook handler when subscription.activated event is received
    
    // Handle Basic plan
    if (plan === "basic") {
      // Always create Razorpay plan WITHOUT trial initially
      // Trial will be started in webhook when subscription is activated
      let razorpayPlan;
      try {
        razorpayPlan = await getOrCreateRazorpayPlan(plan, amount, 0); // Always 0 trial days initially
    } catch (error) {
        console.error("Failed to get/create Razorpay plan:", error);
        // Fallback: create subscription in database without Razorpay subscription
        // User will need to set up payment later
        // Trial will NOT be set here - it will be set when subscription is activated
        try {
          await prisma.subscription.upsert({
            where: { siteId: siteDbId },
            create: {
              siteId: siteDbId,
              plan: plan,
              status: "pending", // Pending until payment method is added
              trialEndAt: null, // Trial starts only after activation
              currentPeriodStart: new Date(),
              currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default 30 days
            },
            update: {
              plan: plan,
              status: "pending",
              trialEndAt: null, // Don't set trial until activation
              currentPeriodStart: new Date(),
              currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
          });
        } catch (upsertError) {
          console.error("[Payment] Subscription upsert failed, trying raw SQL:", upsertError.message);
          // Validate parameters
          if (!siteDbId) {
            throw new Error("Invalid site ID. Please try again.");
          }
          
          // Fallback to raw SQL - delete existing then insert fresh
          // CRITICAL: Validate siteDbId before using it
          if (!siteDbId || String(siteDbId).trim() === '' || String(siteDbId) === 'null' || String(siteDbId) === 'undefined') {
            console.error("[Payment] FATAL: siteDbId is invalid in raw SQL fallback:", siteDbId);
            throw new Error("Invalid site ID. Cannot create subscription.");
          }
          
          const { randomUUID } = await import('crypto');
          const subscriptionId = randomUUID();
          const now = new Date();
          const siteDbIdStr = String(siteDbId).trim();
          const escapedSiteDbId = siteDbIdStr.replace(/'/g, "''");
          const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
          const periodEndStr = periodEnd.toISOString();
          const nowStr = now.toISOString();
          
          // Final validation
          if (!escapedSiteDbId || escapedSiteDbId.length === 0) {
            throw new Error("Invalid site ID after escaping. Cannot create subscription.");
          }
          
          try {
            // Delete any existing subscription for this site
            await prisma.$executeRaw`
              DELETE FROM subscriptions WHERE "siteId" = ${siteDbIdStr}::text
            `;
            
            // Insert fresh subscription - no trial, status pending
            await prisma.$executeRaw`
              INSERT INTO subscriptions (id, "siteId", plan, status, "trialEndAt", "currentPeriodStart", "currentPeriodEnd", "createdAt", "updatedAt")
              VALUES (${subscriptionId}::text, ${siteDbIdStr}::text, ${plan}::text, 'pending', NULL::timestamp, ${now}::timestamp, ${periodEnd}::timestamp, ${now}::timestamp, ${now}::timestamp)
            `;
          } catch (rawError) {
            console.error("[Payment] Raw SQL with $executeRaw failed:", rawError.message);
            // Last resort: use $executeRawUnsafe
            const planStr = String(plan).replace(/'/g, "''");
            
            // Delete existing
            await prisma.$executeRawUnsafe(`
              DELETE FROM subscriptions WHERE "siteId" = '${escapedSiteDbId}'
            `);
            
            // Insert fresh - ensure escapedSiteDbId is valid
            if (!escapedSiteDbId || escapedSiteDbId.length === 0) {
              throw new Error("Cannot insert: siteId is empty after escaping");
            }
            
            // No trial - trial starts after activation
            await prisma.$executeRawUnsafe(`
              INSERT INTO subscriptions (id, "siteId", plan, status, "trialEndAt", "currentPeriodStart", "currentPeriodEnd", "createdAt", "updatedAt")
              VALUES ('${subscriptionId}', '${escapedSiteDbId}', '${planStr}', 'pending', NULL::timestamp, '${nowStr}'::timestamp, '${periodEndStr}'::timestamp, '${nowStr}'::timestamp, '${nowStr}'::timestamp)
            `);
          }
        }
        
        return Response.json({
          success: true,
          trial: false,
          trialDays: 0,
          trialEndAt: null,
          siteId: site.siteId, // Return public siteId
          siteDbId: siteDbId, // Internal ID
          domain: site.domain,
          requiresSetup: true,
          message: `Setting up subscription for ${site.domain}. Please add a payment method to activate your subscription. Your 7-day free trial will start after activation.`,
        });
      }
    
    // Get user info for Razorpay subscription
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true },
    });
    
    // Create Razorpay subscription WITHOUT trial
    // Trial will start automatically when subscription is activated (payment method added)
    // This is handled in the webhook handler
    let razorpaySubscription;
    try {
        // Get base URL for redirect
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
          (req.headers.get("origin") || `http://${req.headers.get("host")}`);
        
        // Create subscription first, then we'll use its ID in the return URL
        razorpaySubscription = await createRazorpaySubscription(
          razorpayPlan.id,
          {
            name: user?.name || "User",
            email: user?.email || session.user.email,
            contact: undefined,
          },
          0, // Always 0 trial days - trial starts after activation
          `${baseUrl}/payment/return` // Base return URL (subscription ID will be added by return page via sessionStorage or query params)
        );
        
        // Now we have the subscription ID, create the full return URL
        const returnUrl = `${baseUrl}/payment/return?subscription_id=${razorpaySubscription.id}&siteId=${site.siteId}`;
        
        console.log("Created Razorpay subscription:", razorpaySubscription.id);
      } catch (error) {
        console.error("Failed to create Razorpay subscription:", error);
        // Fallback: create subscription in database
        // No trial - trial starts after activation
        try {
          await prisma.subscription.upsert({
            where: { siteId: siteDbId },
            create: {
              siteId: siteDbId,
              plan: plan,
              status: "pending", // Pending until payment method added
              trialEndAt: null, // Trial starts after activation
              currentPeriodStart: new Date(),
              currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              razorpayPlanId: razorpayPlan.id,
            },
            update: {
              plan: plan,
              status: "pending",
              trialEndAt: null, // Don't set trial until activation
              currentPeriodStart: new Date(),
              currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              razorpayPlanId: razorpayPlan.id,
            },
          });
        } catch (upsertError) {
          console.error("[Payment] Subscription upsert failed, trying raw SQL:", upsertError.message);
          // Validate parameters
          if (!siteDbId) {
            throw new Error("Invalid site ID. Please try again.");
          }
          if (!razorpayPlan?.id) {
            throw new Error("Invalid Razorpay plan. Please try again.");
          }
          
          // Fallback to raw SQL - delete existing then insert fresh
          // CRITICAL: Validate siteDbId before using it
          if (!siteDbId || String(siteDbId).trim() === '' || String(siteDbId) === 'null' || String(siteDbId) === 'undefined') {
            console.error("[Payment] FATAL: siteDbId is invalid in raw SQL fallback:", siteDbId);
            throw new Error("Invalid site ID. Cannot create subscription.");
          }
          
          const { randomUUID } = await import('crypto');
          const subscriptionId = randomUUID();
          const now = new Date();
          const siteDbIdStr = String(siteDbId).trim();
          const escapedSiteDbId = siteDbIdStr.replace(/'/g, "''");
          const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
          
          // Final validation
          if (!escapedSiteDbId || escapedSiteDbId.length === 0) {
            throw new Error("Invalid site ID after escaping. Cannot create subscription.");
          }
          
          try {
            // Delete any existing subscription for this site
            await prisma.$executeRaw`
              DELETE FROM subscriptions WHERE "siteId" = ${siteDbIdStr}::text
            `;
            
            // Insert fresh subscription - no trial, status pending
            await prisma.$executeRaw`
              INSERT INTO subscriptions (id, "siteId", plan, status, "trialEndAt", "currentPeriodStart", "currentPeriodEnd", "razorpayPlanId", "createdAt", "updatedAt")
              VALUES (${subscriptionId}::text, ${siteDbIdStr}::text, ${plan}::text, 'pending', NULL::timestamp, ${now}::timestamp, ${periodEnd}::timestamp, ${String(razorpayPlan.id)}::text, ${now}::timestamp, ${now}::timestamp)
            `;
          } catch (rawError) {
            console.error("[Payment] Raw SQL with $executeRaw failed:", rawError.message);
            // Last resort: use $executeRawUnsafe
            const planStr = String(plan).replace(/'/g, "''");
            const periodEndStr = periodEnd.toISOString();
            const planIdStr = String(razorpayPlan.id).replace(/'/g, "''");
            const nowStr = now.toISOString();
            
            // Delete existing
            await prisma.$executeRawUnsafe(`
              DELETE FROM subscriptions WHERE "siteId" = '${escapedSiteDbId}'
            `);
            
            // Insert fresh - ensure escapedSiteDbId is valid
            if (!escapedSiteDbId || escapedSiteDbId.length === 0) {
              throw new Error("Cannot insert: siteId is empty after escaping");
            }
            
            // No trial - trial starts after activation
            await prisma.$executeRawUnsafe(`
              INSERT INTO subscriptions (id, "siteId", plan, status, "trialEndAt", "currentPeriodStart", "currentPeriodEnd", "razorpayPlanId", "createdAt", "updatedAt")
              VALUES ('${subscriptionId}', '${escapedSiteDbId}', '${planStr}', 'pending', NULL::timestamp, '${nowStr}'::timestamp, '${periodEndStr}'::timestamp, '${planIdStr}', '${nowStr}'::timestamp, '${nowStr}'::timestamp)
            `);
          }
        }
        
        return Response.json({
          success: true,
          trial: false,
          trialDays: 0,
          trialEndAt: null,
          siteId: site.siteId, // Return public siteId
          siteDbId: siteDbId, // Internal ID
          domain: site.domain,
          requiresSetup: true,
          message: `Setting up subscription for ${site.domain}. Please add a payment method to activate. Your 7-day free trial will start after activation.`,
        });
      }
    
    // Store subscription in database for this site
    // No trial - trial starts after activation
    try {
      await prisma.subscription.upsert({
        where: { siteId: siteDbId },
        create: {
          siteId: siteDbId,
          plan: plan,
          status: "pending", // Will be activated after user adds payment method
          trialEndAt: null, // Trial starts only after activation
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default 30 days
          razorpayPlanId: razorpayPlan.id,
          razorpaySubscriptionId: razorpaySubscription.id,
        },
        update: {
          plan: plan,
          status: "pending",
          trialEndAt: null, // Don't set trial until activation
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          razorpayPlanId: razorpayPlan.id,
          razorpaySubscriptionId: razorpaySubscription.id,
        },
      });
    } catch (upsertError) {
      console.error("[Payment] Subscription upsert failed, trying raw SQL:", upsertError.message);
      // Validate all required parameters before raw SQL
      if (!siteDbId) {
        console.error("[Payment] siteDbId is null in raw SQL fallback");
        throw new Error("Invalid site ID. Please try again.");
      }
      // No trial validation needed - trial starts after activation
      if (!razorpayPlan?.id) {
        console.error("[Payment] razorpayPlan.id is null in raw SQL fallback");
        throw new Error("Invalid Razorpay plan. Please try again.");
      }
      if (!razorpaySubscription?.id) {
        console.error("[Payment] razorpaySubscription.id is null in raw SQL fallback");
        throw new Error("Invalid Razorpay subscription. Please try again.");
      }
      
      // Fallback: Try Prisma create with explicit siteId, then raw SQL if that fails
      try {
        // First delete any existing subscription
        try {
          await prisma.subscription.deleteMany({
            where: { siteId: siteDbId },
          });
        } catch (deleteError) {
          // If delete fails, try raw SQL with string interpolation
          const siteDbIdForDelete = String(siteDbId).replace(/'/g, "''");
          await prisma.$executeRawUnsafe(`
            DELETE FROM subscriptions WHERE "siteId" = '${siteDbIdForDelete}'
          `);
        }
        
        // Try Prisma create first (most reliable)
        // Validate siteDbId one more time before Prisma create
        if (!siteDbId) {
          console.error("[Payment] FATAL: siteDbId is null/undefined before Prisma create");
          throw new Error("Invalid site ID. Cannot create subscription.");
        }
        
        console.log("[Payment] Attempting Prisma create with siteDbId:", siteDbId);
        await prisma.subscription.create({
          data: {
            siteId: siteDbId, // Use siteDbId directly - Prisma will handle it
            plan: plan,
            status: "pending",
            trialEndAt: null, // Trial starts only after activation
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            razorpayPlanId: razorpayPlan.id,
            razorpaySubscriptionId: razorpaySubscription.id,
          },
        });
        console.log("[Payment] Successfully created subscription via Prisma");
      } catch (prismaError) {
        console.error("[Payment] Prisma create failed, trying raw SQL:", prismaError.message);
        console.error("[Payment] Prisma error details:", {
          code: prismaError.code,
          meta: prismaError.meta,
          siteDbId: siteDbId,
          siteDbIdType: typeof siteDbId,
          siteDbIdString: String(siteDbId),
        });
        
        // CRITICAL: Re-fetch site to ensure we have the correct database ID
        // This prevents any scope or variable issues
        let currentSiteDbId = siteDbId; // Start with existing value
        
        try {
          // Re-fetch the site to ensure we have the latest data
          const refreshedSite = await prisma.site.findFirst({
            where: {
              OR: [
                { siteId: siteId }, // Public siteId
                { id: siteDbId },    // Database ID
              ],
              userId: session.user.id,
            },
            select: { id: true, siteId: true, domain: true },
          });
          
          if (refreshedSite && refreshedSite.id) {
            currentSiteDbId = refreshedSite.id;
            console.log("[Payment] Re-fetched site, using database ID:", currentSiteDbId, "for domain:", refreshedSite.domain);
          } else {
            console.error("[Payment] WARNING: Could not re-fetch site, using original siteDbId:", siteDbId);
          }
        } catch (refreshError) {
          console.error("[Payment] Error re-fetching site, using original siteDbId:", refreshError.message);
          // Continue with original siteDbId
        }
        
        if (!currentSiteDbId || currentSiteDbId === 'null' || currentSiteDbId === 'undefined' || String(currentSiteDbId).trim().length === 0) {
          console.error("[Payment] FATAL: siteDbId is invalid in raw SQL fallback:", {
            currentSiteDbId,
            type: typeof currentSiteDbId,
            originalSiteDbId: siteDbId,
          });
          throw new Error(`Invalid site ID: ${currentSiteDbId}. Cannot create subscription.`);
        }
        
        // Last resort: use raw SQL with proper parameter binding
        const { randomUUID } = await import('crypto');
        const subscriptionId = randomUUID();
        const now = new Date();
        
        // Convert to string and validate - use the captured value
        const siteDbIdStr = String(currentSiteDbId).trim();
        if (!siteDbIdStr || siteDbIdStr === 'null' || siteDbIdStr === 'undefined' || siteDbIdStr.length === 0) {
          console.error("[Payment] FATAL: siteDbIdStr is invalid after conversion:", {
            siteDbIdStr,
            original: currentSiteDbId,
            type: typeof currentSiteDbId,
          });
          throw new Error(`Invalid site ID string: ${siteDbIdStr}. Cannot create subscription.`);
        }
        
        const escapedSiteDbId = siteDbIdStr.replace(/'/g, "''");
        
        // Final validation - ensure escaped value is valid
        if (!escapedSiteDbId || escapedSiteDbId.length === 0 || escapedSiteDbId === 'null' || escapedSiteDbId === 'undefined') {
          console.error("[Payment] FATAL: escapedSiteDbId is invalid:", {
            escapedSiteDbId,
            escapedSiteDbIdType: typeof escapedSiteDbId,
            escapedSiteDbIdLength: escapedSiteDbId?.length,
            siteDbIdStr,
            siteDbIdStrType: typeof siteDbIdStr,
            original: currentSiteDbId,
            originalType: typeof currentSiteDbId,
          });
          throw new Error(`Invalid site ID after escaping: ${escapedSiteDbId}. Cannot create subscription.`);
        }
        
        // CRITICAL: Ensure siteDbIdStr is still valid (don't use escaped version for $executeRaw)
        if (!siteDbIdStr || siteDbIdStr.length === 0 || siteDbIdStr === 'null' || siteDbIdStr === 'undefined') {
          console.error("[Payment] FATAL: siteDbIdStr is invalid:", {
            siteDbIdStr,
            original: currentSiteDbId,
          });
          throw new Error(`Invalid site ID string: ${siteDbIdStr}. Cannot create subscription.`);
        }
        
        // No trial - trial starts after activation
        const periodEndDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        const periodEndStr = periodEndDate.toISOString();
        const planIdStr = String(razorpayPlan.id).replace(/'/g, "''");
        const subIdStr = String(razorpaySubscription.id).replace(/'/g, "''");
        const nowStr = now.toISOString();
        
        // Log all values before SQL execution
        console.log("[Payment] Raw SQL values before execution:", {
          subscriptionId,
          escapedSiteDbId,
          escapedSiteDbIdLength: escapedSiteDbId.length,
          escapedSiteDbIdType: typeof escapedSiteDbId,
          siteDbIdStr,
          siteDbIdStrLength: siteDbIdStr.length,
          siteDbIdStrType: typeof siteDbIdStr,
          originalSiteDbId: currentSiteDbId,
          originalSiteDbIdType: typeof currentSiteDbId,
          periodEndStr,
          planIdStr,
          subIdStr,
          nowStr,
        });
        
        // Verify escapedSiteDbId one more time right before use
        if (!escapedSiteDbId || escapedSiteDbId.trim().length === 0) {
          throw new Error(`FATAL: escapedSiteDbId is empty right before SQL execution. Original: ${currentSiteDbId}`);
        }
        
        // Delete existing first
        try {
          await prisma.$executeRawUnsafe(`
            DELETE FROM subscriptions WHERE "siteId" = '${escapedSiteDbId}'
          `);
          console.log("[Payment] Deleted existing subscription for site:", escapedSiteDbId);
        } catch (deleteErr) {
          console.error("[Payment] Delete failed in raw SQL fallback (continuing anyway):", deleteErr.message);
          // Continue anyway - might not exist
        }
        
        // Insert with explicit siteId - ensure it's the second column and NOT NULL
        // Final check before SQL execution
        if (!escapedSiteDbId || escapedSiteDbId.length === 0) {
          throw new Error(`Cannot insert subscription: siteId is empty after escaping. Original: ${currentSiteDbId}`);
        }
        
        // Try using $executeRaw with tagged template first (safer parameter binding)
        // This uses Prisma's built-in parameter binding which is more reliable
        try {
          console.log("[Payment] Attempting INSERT with $executeRaw (tagged template) using siteDbIdStr:", siteDbIdStr);
          const periodEndForRaw = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
          await prisma.$executeRaw`
            INSERT INTO subscriptions (
              id, 
              "siteId", 
              plan, 
              status, 
              "trialEndAt", 
              "currentPeriodStart", 
              "currentPeriodEnd", 
              "razorpayPlanId", 
              "razorpaySubscriptionId", 
              "createdAt", 
              "updatedAt"
            )
            VALUES (
              ${subscriptionId}::text, 
              ${siteDbIdStr}::text, 
              ${plan}::text, 
              'pending', 
              NULL::timestamp, 
              ${nowStr}::timestamp, 
              ${periodEndForRaw}::timestamp, 
              ${planIdStr}::text, 
              ${subIdStr}::text, 
              ${nowStr}::timestamp, 
              ${nowStr}::timestamp
            )
          `;
          console.log("[Payment] Successfully inserted subscription via $executeRaw with siteId:", siteDbIdStr);
        } catch (executeRawError) {
          console.error("[Payment] $executeRaw failed, using $executeRawUnsafe:", executeRawError.message);
          console.error("[Payment] $executeRaw error details:", {
            code: executeRawError.code,
            message: executeRawError.message,
            siteDbIdStr,
            escapedSiteDbId,
          });
          
          // Build SQL query for $executeRawUnsafe fallback
          // Use escapedSiteDbId for string interpolation
          // No trial - trial starts after activation
          const planStr = String(plan).replace(/'/g, "''");
          const insertQuery = `
            INSERT INTO subscriptions (
              id, 
              "siteId", 
              plan, 
              status, 
              "trialEndAt", 
              "currentPeriodStart", 
              "currentPeriodEnd", 
              "razorpayPlanId", 
              "razorpaySubscriptionId", 
              "createdAt", 
              "updatedAt"
            )
            VALUES (
              '${subscriptionId}', 
              '${escapedSiteDbId}', 
              '${planStr}', 
              'pending', 
              NULL::timestamp, 
              '${nowStr}'::timestamp, 
              '${periodEndStr}'::timestamp, 
              '${planIdStr}', 
              '${subIdStr}', 
              '${nowStr}'::timestamp, 
              '${nowStr}'::timestamp
            )
          `;
          
          // Log the actual query to see what's being sent
          console.log("[Payment] Full INSERT query for $executeRawUnsafe:", insertQuery);
          console.log("[Payment] Executing INSERT with $executeRawUnsafe, escapedSiteDbId:", escapedSiteDbId, "type:", typeof escapedSiteDbId, "length:", escapedSiteDbId?.length);
          
          // Final validation right before execution
          if (!escapedSiteDbId || escapedSiteDbId.length === 0) {
            throw new Error(`FATAL: escapedSiteDbId is empty in $executeRawUnsafe fallback. siteDbIdStr: ${siteDbIdStr}`);
          }
          
          await prisma.$executeRawUnsafe(insertQuery);
          console.log("[Payment] Successfully inserted subscription via $executeRawUnsafe with siteId:", escapedSiteDbId);
        }
      }
    }

    // Return subscription details for frontend to redirect to Razorpay subscription auth
    // Razorpay subscription has authenticate_url or short_url for payment method setup
    console.log("[Payment] Razorpay subscription created:", {
      id: razorpaySubscription.id,
      status: razorpaySubscription.status,
      authenticate_url: razorpaySubscription.authenticate_url,
      short_url: razorpaySubscription.short_url,
      start_at: razorpaySubscription.start_at,
    });
    
    let authUrl = razorpaySubscription.authenticate_url || razorpaySubscription.short_url;
    
    // If no auth URL, try fetching the subscription again (sometimes it's not in initial response)
    if (!authUrl) {
      console.warn("[Payment] No auth URL in subscription response, fetching from Razorpay...");
      try {
        // Wait a moment for Razorpay to process
        await new Promise(resolve => setTimeout(resolve, 1000));
        const fetchedSub = await razorpay.subscriptions.fetch(razorpaySubscription.id);
        console.log("[Payment] Fetched subscription:", {
          id: fetchedSub.id,
          status: fetchedSub.status,
          authenticate_url: fetchedSub.authenticate_url,
          short_url: fetchedSub.short_url,
        });
        authUrl = fetchedSub.authenticate_url || fetchedSub.short_url;
      } catch (error) {
        console.error("[Payment] Error fetching subscription auth URL:", error);
      }
    }
    
    // If still no auth URL, try using the subscription link format
    if (!authUrl) {
      console.warn("[Payment] Still no auth URL, trying subscription link format...");
      // Razorpay subscription links are typically: https://rzp.io/i/<subscription_id>
      // But for authentication, we might need to use the subscription's authenticate_url
      // Let's try one more fetch with a longer delay
      try {
        await new Promise(resolve => setTimeout(resolve, 2000));
        const fetchedSub = await razorpay.subscriptions.fetch(razorpaySubscription.id);
        authUrl = fetchedSub.authenticate_url || fetchedSub.short_url;
        console.log("[Payment] Second fetch result:", { authUrl, status: fetchedSub.status });
      } catch (error) {
        console.error("[Payment] Error in second fetch:", error);
      }
    }
    
    // If we have auth URL, append callback URL to it
    if (authUrl) {
      // Get base URL for callback and return page
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
        (req.headers.get("origin") || `http://${req.headers.get("host")}`);
      const returnUrl = `${baseUrl}/payment/return?subscription_id=${razorpaySubscription.id}&siteId=${site.siteId}`;
      const callbackUrl = `${baseUrl}/api/payment/callback?subscription_id=${razorpaySubscription.id}`;
      
      // Try to append return URL to authenticate_url
      // Note: Razorpay might not support these parameters, but we'll try
      // The return page will handle checking subscription status when user returns
      try {
        const urlWithReturn = new URL(authUrl);
        // Try different parameter names that Razorpay might support
        urlWithReturn.searchParams.set('callback_url', callbackUrl);
        urlWithReturn.searchParams.set('redirect_url', returnUrl);
        urlWithReturn.searchParams.set('return_url', returnUrl);
        const finalAuthUrl = urlWithReturn.toString();
        
        console.log("[Payment] Auth URL with return URL:", finalAuthUrl);
        return Response.json({
          success: true,
          trial: false,
          trialDays: 0,
          trialEndAt: null,
          subscriptionId: razorpaySubscription.id,
          subscriptionAuthUrl: finalAuthUrl,
          requiresPaymentSetup: true,
          redirectToRazorpay: true,
          returnUrl: returnUrl, // Return URL for manual navigation
          siteId: site.siteId,
          siteDbId: siteDbId,
          domain: site.domain,
          message: `Please add a payment method to activate your subscription for ${site.domain}. Your 7-day free trial will start after activation. After completing payment, you'll be redirected back.`,
        });
      } catch (urlError) {
        // If URL parsing fails, use original authUrl
        console.warn("[Payment] Could not append return URL:", urlError);
        return Response.json({
          success: true,
          trial: false,
          trialDays: 0,
          trialEndAt: null,
          subscriptionId: razorpaySubscription.id,
          subscriptionAuthUrl: authUrl,
          requiresPaymentSetup: true,
          redirectToRazorpay: true,
          returnUrl: returnUrl, // Return URL for manual navigation
          callbackUrl: callbackUrl,
          siteId: site.siteId,
          siteDbId: siteDbId,
          domain: site.domain,
          message: `Please add a payment method to activate your subscription for ${site.domain}. Your 7-day free trial will start after activation. After completing payment, visit: ${returnUrl}`,
        });
      }
    }
    
    // If no auth URL, still return success but indicate it needs to be fetched
    console.warn("[Payment] No auth URL available, returning subscription ID for client-side fetch");
    return Response.json({
      success: true,
      trial: false,
      trialDays: 0,
      trialEndAt: null,
      subscriptionId: razorpaySubscription.id,
      subscriptionAuthUrl: null, // Will be fetched client-side
      requiresPaymentSetup: true,
      redirectToRazorpay: true,
      siteId: site.siteId,
      siteDbId: siteDbId,
      domain: site.domain,
      message: `Please add a payment method to activate your subscription for ${site.domain}. Your 7-day free trial will start after activation.`,
    });
    } else {
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
      // Get base URL for redirect
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
        (req.headers.get("origin") || `http://${req.headers.get("host")}`);
      
      // Create subscription first, then we'll use its ID in the return URL
      razorpaySubscription = await createRazorpaySubscription(
        razorpayPlan.id,
        {
          name: user?.name || "User",
          email: user?.email || session.user.email,
          contact: undefined,
        },
        0, // No trial for starter/pro
        `${baseUrl}/payment/return` // Base return URL (subscription ID will be added by return page via sessionStorage or query params)
      );
      
      // Now we have the subscription ID, create the full return URL
      const returnUrl = `${baseUrl}/payment/return?subscription_id=${razorpaySubscription.id}&siteId=${site.siteId}`;
        
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
      
      // Append return URL to auth URL if available
      if (authUrl) {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
          (req.headers.get("origin") || `http://${req.headers.get("host")}`);
        const returnUrl = `${baseUrl}/payment/return?subscription_id=${razorpaySubscription.id}&siteId=${site.siteId}`;
        const callbackUrl = `${baseUrl}/api/payment/callback?subscription_id=${razorpaySubscription.id}`;
        try {
          const urlWithReturn = new URL(authUrl);
          urlWithReturn.searchParams.set('callback_url', callbackUrl);
          urlWithReturn.searchParams.set('redirect_url', returnUrl);
          urlWithReturn.searchParams.set('return_url', returnUrl);
          authUrl = urlWithReturn.toString();
        } catch (urlError) {
          console.warn("[Payment] Could not append return URL:", urlError);
        }
      }
      
      // Store subscription in database for this site
      try {
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
      } catch (upsertError) {
        console.error("[Payment] Subscription upsert failed, trying raw SQL:", upsertError.message);
        // Validate parameters
        if (!siteDbId) {
          throw new Error("Invalid site ID. Please try again.");
        }
        if (!razorpayPlan?.id) {
          throw new Error("Invalid Razorpay plan. Please try again.");
        }
        if (!razorpaySubscription?.id) {
          throw new Error("Invalid Razorpay subscription. Please try again.");
        }
        
        // CRITICAL: Validate siteDbId before using it
        if (!siteDbId || String(siteDbId).trim() === '' || String(siteDbId) === 'null' || String(siteDbId) === 'undefined') {
          console.error("[Payment] FATAL: siteDbId is invalid in raw SQL fallback:", siteDbId);
          throw new Error("Invalid site ID. Cannot create subscription.");
        }
        
        const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        const { randomUUID } = await import('crypto');
        const subscriptionId = randomUUID();
        const now = new Date();
        const siteDbIdStr = String(siteDbId).trim();
        const escapedSiteDbId = siteDbIdStr.replace(/'/g, "''");
        
        // Final validation
        if (!escapedSiteDbId || escapedSiteDbId.length === 0) {
          throw new Error("Invalid site ID after escaping. Cannot create subscription.");
        }
        
        // Fallback to raw SQL - delete existing then insert fresh
        try {
          // Delete any existing subscription for this site
          await prisma.$executeRaw`
            DELETE FROM subscriptions WHERE "siteId" = ${siteDbIdStr}::text
          `;
          
          // Insert fresh subscription
          await prisma.$executeRaw`
            INSERT INTO subscriptions (id, "siteId", plan, status, "razorpayPlanId", "razorpaySubscriptionId", "currentPeriodStart", "currentPeriodEnd", "createdAt", "updatedAt")
            VALUES (${subscriptionId}::text, ${siteDbIdStr}::text, ${plan}::text, 'pending', ${String(razorpayPlan.id)}::text, ${String(razorpaySubscription.id)}::text, ${now}::timestamp, ${periodEnd}::timestamp, ${now}::timestamp, ${now}::timestamp)
          `;
        } catch (rawError) {
          console.error("[Payment] Raw SQL with $executeRaw failed:", rawError.message);
          // Last resort: use $executeRawUnsafe
          const planStr = String(plan).replace(/'/g, "''");
          const planIdStr = String(razorpayPlan.id).replace(/'/g, "''");
          const subIdStr = String(razorpaySubscription.id).replace(/'/g, "''");
          const periodEndStr = periodEnd.toISOString();
          const nowStr = now.toISOString();
          
          // Delete existing
          await prisma.$executeRawUnsafe(`
            DELETE FROM subscriptions WHERE "siteId" = '${escapedSiteDbId}'
          `);
          
          // Insert fresh - ensure escapedSiteDbId is valid
          if (!escapedSiteDbId || escapedSiteDbId.length === 0) {
            throw new Error("Cannot insert: siteId is empty after escaping");
          }
          
          await prisma.$executeRawUnsafe(`
            INSERT INTO subscriptions (id, "siteId", plan, status, "razorpayPlanId", "razorpaySubscriptionId", "currentPeriodStart", "currentPeriodEnd", "createdAt", "updatedAt")
            VALUES ('${subscriptionId}', '${escapedSiteDbId}', '${planStr}', 'pending', '${planIdStr}', '${subIdStr}', '${nowStr}'::timestamp, '${periodEndStr}'::timestamp, '${nowStr}'::timestamp, '${nowStr}'::timestamp)
          `);
        }
      }
      
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
    }
  } catch (error) {
    console.error("Payment order creation error:", error);

    // Ensure error.message exists and is a string
    const errorMessage = error && typeof error.message === "string"
      ? error.message
      : "Failed to create payment order";

    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
