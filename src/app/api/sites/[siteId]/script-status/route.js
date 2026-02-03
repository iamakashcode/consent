import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { hasVerificationColumns } from "@/lib/db-utils";

/**
 * GET /api/sites/[siteId]/script-status
 * Check if the consent script is installed and active on the domain.
 * Script is considered "installed" when: domain is verified AND we received a ping (lastSeenAt) in the last 48 hours.
 */
export async function GET(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const { siteId } = resolvedParams;
    if (!siteId) {
      return Response.json({ error: "Site ID is required" }, { status: 400 });
    }

    const verificationColumns = await hasVerificationColumns();
    const hasLastSeenAt = await prisma.$queryRaw`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'sites'
      AND column_name = 'lastSeenAt'
      LIMIT 1
    `.then((result) => Array.isArray(result) && result.length > 0).catch(() => false);

    const site = await prisma.site.findFirst({
      where: {
        OR: [{ siteId }, { id: siteId }],
        userId: session.user.id,
      },
      select: {
        id: true,
        siteId: true,
        domain: true,
        ...(verificationColumns.allExist ? { isVerified: true } : {}),
        ...(hasLastSeenAt ? { lastSeenAt: true } : {}),
        bannerConfig: true,
      },
    });

    if (!site) {
      return Response.json({ error: "Site not found" }, { status: 404 });
    }

    const isVerified = verificationColumns.allExist
      ? (site.isVerified ?? false)
      : (site.bannerConfig?._verification?.isVerified ?? false);
    const lastSeenAt = hasLastSeenAt ? site.lastSeenAt : null;

    const now = new Date();
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const scriptInstalled =
      isVerified && lastSeenAt && new Date(lastSeenAt) >= fortyEightHoursAgo;

    return Response.json({
      siteId: site.siteId,
      domain: site.domain,
      scriptInstalled,
      isVerified,
      lastSeenAt: lastSeenAt ? new Date(lastSeenAt).toISOString() : null,
    });
  } catch (error) {
    console.error("[script-status] Error:", error);
    return Response.json(
      { error: error.message || "Failed to get script status" },
      { status: 500 }
    );
  }
}
