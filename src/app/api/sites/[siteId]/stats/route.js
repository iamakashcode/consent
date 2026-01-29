import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

/**
 * Get statistics for a site (page count, view count)
 */
export async function GET(req, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const { siteId } = resolvedParams;

    if (!siteId) {
      return Response.json({ error: "Site ID is required" }, { status: 400 });
    }

    // Get site and verify ownership
    const site = await prisma.site.findUnique({
      where: { siteId },
      select: {
        id: true,
        userId: true,
        domain: true,
      },
    });

    if (!site) {
      return Response.json({ error: "Site not found" }, { status: 404 });
    }

    if (site.userId !== session.user.id) {
      return Response.json(
        { error: "Unauthorized to access this site" },
        { status: 403 }
      );
    }

    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      // Get all statistics: unique pages (all-time and recent), total views, recent views
      const [allTimeUniquePages, recentUniquePages, totalViews, recentViews] = await Promise.all([
        // Count ALL unique pages where script has been added (all-time)
        prisma.pageView.groupBy({
          by: ["pagePath"],
          where: {
            siteId: site.id,
          },
          _count: true,
        }),
        // Count unique pages viewed in last 7 days (currently active pages)
        prisma.pageView.groupBy({
          by: ["pagePath"],
          where: {
            siteId: site.id,
            viewedAt: {
              gte: sevenDaysAgo,
            },
          },
          _count: true,
        }),
        // Count total page views (all time)
        prisma.pageView.count({
          where: { siteId: site.id },
        }),
        // Get recent views (last 30 days)
        prisma.pageView.count({
          where: {
            siteId: site.id,
            viewedAt: {
              gte: thirtyDaysAgo,
            },
          },
        }),
      ]);

      return Response.json({
        siteId: site.siteId,
        domain: site.domain,
        totalUniquePages: allTimeUniquePages.length, // All pages where script has been added (all-time)
        activeUniquePages: recentUniquePages.length, // Pages active in last 7 days
        totalViews: totalViews, // Total page views (all time)
        recentViews: recentViews, // Views in last 30 days
        pages: allTimeUniquePages.map((p) => ({
          path: p.pagePath,
          views: p._count,
        })),
      });
    } catch (dbError) {
      // If PageView table doesn't exist, return zeros
      if (
        dbError.message &&
        (dbError.message.includes("does not exist") ||
          dbError.message.includes("PageView") ||
          dbError.message.includes("page_views"))
      ) {
        console.warn(
          "[Stats] PageView table not found, returning zero stats:",
          dbError.message
        );
        return Response.json({
          siteId: site.siteId,
          domain: site.domain,
          uniquePages: 0,
          totalViews: 0,
          recentViews: 0,
          pages: [],
        });
      }
      throw dbError;
    }
  } catch (error) {
    console.error("Error fetching site stats:", error);
    return Response.json(
      { error: error.message || "Failed to fetch statistics" },
      { status: 500 }
    );
  }
}
