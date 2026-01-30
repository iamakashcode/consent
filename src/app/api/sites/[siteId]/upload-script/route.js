/**
 * POST /api/sites/[siteId]/upload-script
 * Manually trigger script generation and upload to R2/CDN.
 * Returns success or a clear error (e.g. subscription inactive).
 */

import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { generateAndUploadScript } from "@/lib/script-generator";
import { getCdnUrl, R2_CONFIGURED } from "@/lib/cdn-service";
import { prisma } from "@/lib/prisma";

export async function POST(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { siteId } = await params;
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
      await generateAndUploadScript(id, { isPreview: false });
      await generateAndUploadScript(id, { isPreview: true });
    } catch (err) {
      return Response.json(
        {
          success: false,
          error: err.message || "Upload failed",
          hint:
            err.message?.includes("Subscription")
              ? "Activate a plan for this domain in the dashboard, then try again."
              : "Check server logs and R2 env vars.",
        },
        { status: 200 }
      );
    }

    const url = getCdnUrl(id, false);
    return Response.json({
      success: true,
      url,
      message: R2_CONFIGURED
        ? "Script uploaded to R2. If the link still 404s, enable Public access on the bucket in Cloudflare R2."
        : "Script uploaded to local CDN.",
    });
  } catch (error) {
    console.error("[Upload Script API]", error);
    return Response.json(
      { success: false, error: error.message || "Server error" },
      { status: 500 }
    );
  }
}
