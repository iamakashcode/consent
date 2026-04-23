import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { ADDON_BRANDING_PRICE_CENTS, PLAN_PRICING } from "@/lib/paddle";

export async function GET(req) {
  try {
    await requireAdmin();

    const [
      totalUsers,
      totalSites,
      totalSubscriptions,
      usersByPlan,
      recentUsers,
      recentSites,
    ] = await Promise.all([
      // Total users
      prisma.user.count(),
      
      // Total sites
      prisma.site.count(),
      
      // Total subscriptions
      prisma.subscription.count(),
      
      // Users by plan
      prisma.subscription.groupBy({
        by: ["plan"],
        _count: {
          plan: true,
        },
      }),
      
      // Recent users (last 7 days)
      prisma.user.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
          _count: {
            select: {
              sites: true,
            },
          },
        },
      }),
      
      // Recent sites (last 7 days)
      prisma.site.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          domain: true,
          createdAt: true,
          user: {
            select: {
              email: true,
              name: true,
            },
          },
        },
      }),
    ]);

    // Calculate plan distribution
    const planDistribution = {
      basic: 0,
      starter: 0,
      pro: 0,
    };
    
    usersByPlan.forEach((item) => {
      planDistribution[item.plan] = item._count.plan;
    });

    // Calculate growth (users created in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);
    const nextMonthStart = new Date(monthStart);
    nextMonthStart.setUTCMonth(nextMonthStart.getUTCMonth() + 1);

    const [usersLast30Days, sitesLast30Days, totalPageViews, subscriptionsBilledThisMonth] = await Promise.all([
      prisma.user.count({
        where: {
          createdAt: {
            gte: thirtyDaysAgo,
          },
        },
      }),
      prisma.site.count({
        where: {
          createdAt: {
            gte: thirtyDaysAgo,
          },
        },
      }),
      prisma.siteViewCount
        .aggregate({ _sum: { count: true } })
        .then((r) => r._sum?.count ?? 0)
        .catch(() => 0),
      prisma.subscription.findMany({
        where: {
          currentPeriodStart: {
            gte: monthStart,
            lt: nextMonthStart,
          },
          status: {
            in: ["active", "cancelled", "expired"],
          },
        },
        select: {
          plan: true,
          billingInterval: true,
          removeBrandingAddon: true,
        },
      }),
    ]);

    const thisMonthRevenueCents = subscriptionsBilledThisMonth.reduce((sum, sub) => {
      const planKey = String(sub.plan || "basic").toLowerCase();
      const intervalKey = String(sub.billingInterval || "monthly").toLowerCase();
      const intervalMultiplier = intervalKey === "yearly" ? 10 : 1;
      const basePlanCents = (PLAN_PRICING[planKey] ?? PLAN_PRICING.basic) * intervalMultiplier;
      const addonCents = sub.removeBrandingAddon
        ? ADDON_BRANDING_PRICE_CENTS * intervalMultiplier
        : 0;
      return sum + basePlanCents + addonCents;
    }, 0);

    return Response.json({
      overview: {
        totalUsers,
        totalSites,
        totalSubscriptions,
        usersLast30Days,
        sitesLast30Days,
      },
      users: totalUsers,
      sites: totalSites,
      subscriptions: totalSubscriptions,
      pageViews: totalPageViews,
      thisMonthRevenue: Number((thisMonthRevenueCents / 100).toFixed(2)),
      planDistribution,
      recentUsers,
      recentSites,
    });
  } catch (error) {
    console.error("Admin stats GET error:", error);
    return Response.json(
      { error: error.message || "Failed to fetch stats" },
      { status: error.message === "Unauthorized" || error.message === "Admin access required" ? 403 : 500 }
    );
  }
}
