import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

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
    
    const [usersLast30Days, sitesLast30Days, totalPageViews] = await Promise.all([
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
    ]);

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
