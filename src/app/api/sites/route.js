import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { hasVerificationColumns, hasBannerConfigColumn } from "@/lib/db-utils";

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user || !session.user.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch sites - handle missing columns gracefully
    const verificationColumns = await hasVerificationColumns();
    const bannerConfigExists = await hasBannerConfigColumn();
    
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
          ...(bannerConfigExists ? { bannerConfig: true } : {}),
          ...(verificationColumns.allExist
            ? { isVerified: true, verificationToken: true, verifiedAt: true }
            : {}),
          createdAt: true,
          updatedAt: true,
        },
      });
      
      // If verification columns don't exist, populate from bannerConfig fallback
      if (!verificationColumns.allExist && bannerConfigExists) {
        sites = sites.map(site => {
          const verificationFromBanner =
            site?.bannerConfig?._verification && typeof site.bannerConfig._verification === "object"
              ? site.bannerConfig._verification
              : null;
          return {
            ...site,
            isVerified: verificationFromBanner?.isVerified || false,
            verificationToken: verificationFromBanner?.token || null,
            verifiedAt: verificationFromBanner?.verifiedAt || null,
          };
        });
      }
    } catch (error) {
      // If columns don't exist yet, fetch without them and add defaults
      console.warn("Error fetching sites, trying fallback:", error.message);
      try {
        sites = await prisma.site.findMany({
          where: { userId: session.user.id },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            domain: true,
            siteId: true,
            trackers: true,
            ...(bannerConfigExists ? { bannerConfig: true } : {}),
            createdAt: true,
            updatedAt: true,
          },
        });
        // Add default values for missing fields
        sites = sites.map(site => {
          const verificationFromBanner =
            site?.bannerConfig?._verification && typeof site.bannerConfig._verification === "object"
              ? site.bannerConfig._verification
              : null;
          return {
            ...site,
            isVerified: verificationFromBanner?.isVerified || false,
            verificationToken: verificationFromBanner?.token || null,
            verifiedAt: verificationFromBanner?.verifiedAt || null,
          };
        });
      } catch (fallbackError) {
        console.error("Fallback fetch also failed:", fallbackError);
        throw fallbackError;
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

    // Verify the site belongs to the user and delete it
    // Use raw SQL to avoid Prisma schema validation issues
    try {
      const result = await prisma.$queryRaw`
        DELETE FROM "sites"
        WHERE "id" = ${siteId} AND "userId" = ${session.user.id}
        RETURNING "id"
      `;
      
      if (!result || result.length === 0) {
        return Response.json(
          { error: "Site not found or access denied" },
          { status: 404 }
        );
      }
    } catch (error) {
      console.error("Error deleting site:", error);
      // Fallback to Prisma if raw SQL fails
      const site = await prisma.site.findFirst({
        where: {
          id: siteId,
          userId: session.user.id,
        },
        select: {
          id: true,
        },
      });

      if (!site) {
        return Response.json(
          { error: "Site not found or access denied" },
          { status: 404 }
        );
      }

      await prisma.site.delete({
        where: { id: siteId },
      });
    }

    return Response.json({ message: "Site deleted successfully" });
  } catch (error) {
    console.error("Error deleting site:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
