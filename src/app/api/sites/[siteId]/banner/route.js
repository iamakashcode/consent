import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function PUT(req, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { siteId } = params;
    const { bannerConfig } = await req.json();

    if (!bannerConfig) {
      return Response.json(
        { error: "Banner configuration is required" },
        { status: 400 }
      );
    }

    // Check if site exists and belongs to user
    const site = await prisma.site.findUnique({
      where: { id: siteId },
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

    // Check user's plan
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { subscription: true },
    });

    const plan = user.subscription?.plan || "free";
    if (plan === "free") {
      return Response.json(
        { error: "Banner customization is available for Starter and Pro plans only" },
        { status: 403 }
      );
    }

    // Update banner configuration
    const updated = await prisma.site.update({
      where: { id: siteId },
      data: {
        bannerConfig: bannerConfig,
      },
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

    const { siteId } = params;

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
