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

    if (!R2_CONFIGURED) {
      return Response.json(
        {
          success: false,
          error: "R2 is not configured",
          hint: "Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL and NEXT_PUBLIC_R2_PUBLIC_URL in your deployment environment (e.g. Vercel → Project → Settings → Environment Variables).",
        },
        { status: 200 }
      );
    }

    try {
      await generateAndUploadScript(id, { isPreview: false, skipSubscriptionCheck: true });
      await generateAndUploadScript(id, { isPreview: true });
    } catch (err) {
      return Response.json(
        {
          success: false,
          error: err.message || "Upload failed",
          hint:
            err.message?.includes("Subscription")
              ? "Activate a plan for this domain in the dashboard, then try again."
              : err.message?.includes("R2")
                ? "Check R2 credentials, bucket name, and that the API token has Object Read & Write. In Cloudflare: R2 → Manage R2 API Tokens."
                : "Check server logs for details.",
        },
        { status: 200 }
      );
    }

    const url = getCdnUrl(id, false);
    return Response.json({
      success: true,
      url,
      message: "Script uploaded to R2. If the link still 404s, enable Public access on the bucket in Cloudflare R2.",
    });
  } catch (error) {
    console.error("[Upload Script API]", error);
    return Response.json(
      { success: false, error: error.message || "Server error" },
      { status: 500 }
    );
  }
}
