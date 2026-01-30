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
      const periodStartMonth = new Date(Date.UTC(thirtyDaysAgo.getUTCFullYear(), thirtyDaysAgo.getUTCMonth(), 1));

      // Use SiteViewCount: one row per site per month (no per-view storage)
      const allCounts = await prisma.siteViewCount.findMany({
        where: { siteId: site.id },
        select: { periodStart: true, count: true },
      });
      const totalViews = allCounts.reduce((sum, row) => sum + (row.count || 0), 0);
      const recentViews = allCounts
        .filter((row) => row.periodStart >= periodStartMonth)
        .reduce((sum, row) => sum + (row.count || 0), 0);

      return Response.json({
        siteId: site.siteId,
        domain: site.domain,
        totalUniquePages: 0, // No per-path storage with counter-only approach
        activeUniquePages: 0,
        totalViews,
        recentViews,
        pages: [], // No per-path breakdown with counter-only approach
      });
    } catch (dbError) {
      if (
        dbError.message &&
        (dbError.message.includes("does not exist") ||
          dbError.message.includes("SiteViewCount") ||
          dbError.message.includes("site_view_counts"))
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
