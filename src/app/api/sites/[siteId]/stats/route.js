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
      // Only count pages that have been viewed recently (last 7 days)
      // This ensures we only count pages where the script is currently active
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      
      // Get unique page count (only recently active pages) and total view count
      const [uniquePages, totalViews, recentViews] = await Promise.all([
        // Count unique pages that have been viewed in the last 7 days
        // This gives us the count of pages where the script is currently active
        prisma.pageView.groupBy({
          by: ["pagePath"],
          where: {
            siteId: site.id,
            viewedAt: {
              gte: sevenDaysAgo, // Only pages viewed in last 7 days
            },
          },
          _count: true,
        }),
        // Count total views (all time)
        prisma.pageView.count({
          where: { siteId: site.id },
        }),
        // Get recent views (last 30 days)
        prisma.pageView.count({
          where: {
            siteId: site.id,
            viewedAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
            },
          },
        }),
      ]);

      return Response.json({
        siteId: site.siteId,
        domain: site.domain,
        uniquePages: uniquePages.length, // Only pages active in last 7 days
        totalViews: totalViews,
        recentViews: recentViews, // Views in last 30 days
        pages: uniquePages.map((p) => ({
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
