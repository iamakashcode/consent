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
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const periodStartMonth = new Date(Date.UTC(thirtyDaysAgo.getUTCFullYear(), thirtyDaysAgo.getUTCMonth(), 1));
      const periodStartSevenDays = new Date(Date.UTC(sevenDaysAgo.getUTCFullYear(), sevenDaysAgo.getUTCMonth(), 1));

      const [allCounts, pathCounts] = await Promise.all([
        prisma.siteViewCount.findMany({
          where: { siteId: site.id },
          select: { periodStart: true, count: true },
        }),
        prisma.sitePathViewCount.findMany({
          where: { siteId: site.id },
          select: { periodStart: true, pagePath: true, count: true },
        }),
      ]);

      const totalViews = allCounts.reduce((sum, row) => sum + (row.count || 0), 0);
      const recentViews = allCounts
        .filter((row) => row.periodStart >= periodStartMonth)
        .reduce((sum, row) => sum + (row.count || 0), 0);

      const allPaths = new Set(pathCounts.map((r) => r.pagePath));
      const recentPathRows = pathCounts.filter((r) => r.periodStart >= periodStartSevenDays);
      const activeUniquePages = new Set(recentPathRows.map((r) => r.pagePath)).size;
      const pagesByPath = {};
      pathCounts.forEach((r) => {
        pagesByPath[r.pagePath] = (pagesByPath[r.pagePath] || 0) + (r.count || 0);
      });
      const pages = Object.entries(pagesByPath)
        .map(([path, views]) => ({ path, views }))
        .sort((a, b) => b.views - a.views);

      return Response.json({
        siteId: site.siteId,
        domain: site.domain,
        totalUniquePages: allPaths.size,
        activeUniquePages,
        totalViews,
        recentViews,
        pages,
      });
    } catch (dbError) {
      if (
        dbError.message &&
        (dbError.message.includes("does not exist") ||
          dbError.message.includes("SiteViewCount") ||
          dbError.message.includes("site_view_counts") ||
          dbError.message.includes("SitePathViewCount") ||
          dbError.message.includes("site_path_view_counts"))
      ) {
        return Response.json({
          siteId: site.siteId,
          domain: site.domain,
          totalUniquePages: 0,
          activeUniquePages: 0,
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
