import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { regenerateScriptOnConfigChange } from "@/lib/script-generator";

export async function PUT(req, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Await params as it's a Promise in Next.js
    const resolvedParams = await params;
    const { siteId } = resolvedParams;
    
    if (!siteId) {
      return Response.json(
        { error: "Site ID is required" },
        { status: 400 }
      );
    }

    const { bannerConfig } = await req.json();

    if (!bannerConfig) {
      return Response.json(
        { error: "Banner configuration is required" },
        { status: 400 }
      );
    }

    // Check if site exists and belongs to user (try siteId first, then id)
    const site = await prisma.site.findFirst({
      where: {
        OR: [
          { siteId: siteId },
          { id: siteId },
        ],
      },
      include: { subscription: true },
    });

    if (!site) {
      return Response.json({ error: "Site not found" }, { status: 404 });
    }

    if (site.userId !== session.user.id) {
      return Response.json(
        { error: "Unauthorized to update this site" },
        { status: 403 }
      );
    }

    // Check site's subscription plan (banner customization available for all plans)
    // No need to restrict - all plans can customize banner

    // Update banner configuration
    const updated = await prisma.site.update({
      where: { id: site.id },
      data: {
        bannerConfig: bannerConfig,
      },
    });

    // Regenerate and upload script to CDN (async, don't wait)
    regenerateScriptOnConfigChange(site.siteId).catch((error) => {
      console.error(`[Banner API] Failed to regenerate script for ${site.siteId}:`, error);
      // Don't fail the request if CDN upload fails
    });

    return Response.json({
      success: true,
      message: "Banner configuration updated",
      site: updated,
    });
  } catch (error) {
    console.error("Error updating banner config:", error);
    return Response.json(
      { error: error.message || "Failed to update banner configuration" },
      { status: 500 }
    );
  }
}

export async function GET(req, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Await params as it's a Promise in Next.js
    const resolvedParams = await params;
    const { siteId } = resolvedParams;

    if (!siteId) {
      return Response.json(
        { error: "Site ID is required" },
        { status: 400 }
      );
    }

    const site = await prisma.site.findUnique({
      where: { id: siteId },
      select: {
        id: true,
        domain: true,
        bannerConfig: true,
        userId: true,
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

    return Response.json({
      bannerConfig: site.bannerConfig,
    });
  } catch (error) {
    console.error("Error fetching banner config:", error);
    return Response.json(
      { error: error.message || "Failed to fetch banner configuration" },
      { status: 500 }
    );
  }
}
