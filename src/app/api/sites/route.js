import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user || !session.user.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch sites - handle missing columns gracefully
    let sites;
    try {
      sites = await prisma.site.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          domain: true,
          siteId: true,
          trackers: true,
          bannerConfig: true,
          isVerified: true,
          verificationToken: true,
          verifiedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    } catch (error) {
      // If columns don't exist yet, fetch without them and add defaults
      if (error.message && (error.message.includes("isVerified") || error.message.includes("verificationToken") || error.message.includes("verifiedAt") || error.message.includes("bannerConfig"))) {
        console.warn("Some columns missing, fetching with fallback:", error.message);
        try {
          sites = await prisma.site.findMany({
            where: { userId: session.user.id },
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              domain: true,
              siteId: true,
              trackers: true,
              createdAt: true,
              updatedAt: true,
            },
          });
          // Add default values for missing fields
          sites = sites.map(site => ({ 
            ...site, 
            bannerConfig: null,
            isVerified: false,
            verificationToken: null,
            verifiedAt: null,
          }));
        } catch (fallbackError) {
          console.error("Fallback fetch also failed:", fallbackError);
          throw fallbackError;
        }
      } else {
        throw error;
      }
    }

    console.log("Fetched sites:", { count: sites.length, userId: session.user.id });
    return Response.json(sites);
  } catch (error) {
    console.error("Error fetching sites:", error);
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
      userId: session?.user?.id,
    });
    return Response.json(
      { 
        error: "Internal server error",
        details: process.env.NODE_ENV === "development" ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user || !session.user.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get("id");

    if (!siteId) {
      return Response.json(
        { error: "Site ID is required" },
        { status: 400 }
      );
    }

    // Verify the site belongs to the user
    const site = await prisma.site.findFirst({
      where: {
        id: siteId,
        userId: session.user.id,
      },
    });

    if (!site) {
      return Response.json(
        { error: "Site not found or access denied" },
        { status: 404 }
      );
    }

    // Delete the site
    await prisma.site.delete({
      where: { id: siteId },
    });

    return Response.json({ message: "Site deleted successfully" });
  } catch (error) {
    console.error("Error deleting site:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
