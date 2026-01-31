/**
 * POST /api/sites/[siteId]/regenerate-script
 * Regenerate and upload script (R2 or filesystem). Use this to update the script
 * with latest features (e.g. consent log) without saving the banner.
 */

import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { generateAndUploadScript } from "@/lib/script-generator";
import { getCdnUrl } from "@/lib/cdn-service";
import { prisma } from "@/lib/prisma";

export async function POST(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const siteId = resolvedParams.siteId;
    if (!siteId) {
      return Response.json({ error: "Site ID is required" }, { status: 400 });
    }

    const site = await prisma.site.findFirst({
      where: {
        OR: [{ siteId }, { id: siteId }],
      },
    });
    if (!site || site.userId !== session.user.id) {
      return Response.json({ error: "Site not found" }, { status: 404 });
    }

    const id = site.siteId;

    try {
      await generateAndUploadScript(id, { isPreview: false, skipSubscriptionCheck: true });
      await generateAndUploadScript(id, { isPreview: true });
    } catch (err) {
      return Response.json(
        {
          success: false,
          error: err.message || "Regenerate failed",
        },
        { status: 200 }
      );
    }

    return Response.json({
      success: true,
      url: getCdnUrl(id, false),
      message: "Script regenerated. Consent logging and other features are now active.",
    });
  } catch (error) {
    console.error("[Regenerate Script API]", error);
    return Response.json(
      { success: false, error: error.message || "Server error" },
      { status: 500 }
    );
  }
}
