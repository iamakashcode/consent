import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

/**
 * Verify domain ownership by checking for verification meta tag
 */
export async function POST(req, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Await params as it's a Promise in Next.js
    const resolvedParams = await params;
    const { siteId } = resolvedParams;

    if (!siteId) {
      return Response.json({ error: "Site ID is required" }, { status: 400 });
    }

    // Get site from database
    const site = await prisma.site.findUnique({
      where: { siteId },
      select: {
        id: true,
        domain: true,
        userId: true,
        isVerified: true,
        verificationToken: true,
      },
    });

    if (!site) {
      return Response.json({ error: "Site not found" }, { status: 404 });
    }

    // Verify user owns this site
    if (site.userId !== session.user.id) {
      return Response.json(
        { error: "Unauthorized to verify this site" },
        { status: 403 }
      );
    }

    // If already verified, return success
    if (site.isVerified) {
      return Response.json({
        verified: true,
        message: "Domain is already verified",
        domain: site.domain,
      });
    }

    // Fetch the website and check for verification meta tag
    let html;
    try {
      const url = `https://${site.domain}`;
      const response = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        },
        redirect: "follow",
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      html = await response.text();
    } catch (error) {
      return Response.json(
        {
          verified: false,
          error: `Failed to fetch website: ${error.message}. Make sure the domain is accessible.`,
        },
        { status: 500 }
      );
    }

    // Check for verification meta tag
    if (!site.verificationToken) {
      return Response.json(
        {
          verified: false,
          error: "Verification token not found. Please re-add the domain.",
        },
        { status: 400 }
      );
    }
    
    const verificationMetaTag = `<meta name="consent-manager-verification" content="${site.verificationToken}">`;
    const isVerified = html.includes(verificationMetaTag);

    if (isVerified) {
      // Update site as verified
      await prisma.site.update({
        where: { id: site.id },
        data: {
          isVerified: true,
          verifiedAt: new Date(),
        },
      });

      return Response.json({
        verified: true,
        message: "Domain verified successfully!",
        domain: site.domain,
      });
    } else {
      return Response.json({
        verified: false,
        message: "Verification meta tag not found",
        instruction: `Please add this meta tag to your website's <head> section: ${verificationMetaTag}`,
        verificationToken: site.verificationToken,
      });
    }
  } catch (error) {
    console.error("Domain verification error:", error);
    return Response.json(
      { error: error.message || "Failed to verify domain" },
      { status: 500 }
    );
  }
}

/**
 * Get verification status and token
 */
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
      return Response.json({ error: "Site ID is required" }, { status: 400 });
    }

    // Get site from database
    const site = await prisma.site.findUnique({
      where: { siteId },
      select: {
        id: true,
        domain: true,
        userId: true,
        isVerified: true,
        verificationToken: true,
        verifiedAt: true,
      },
    });

    if (!site) {
      return Response.json({ error: "Site not found" }, { status: 404 });
    }

    // Verify user owns this site
    if (site.userId !== session.user.id) {
      return Response.json(
        { error: "Unauthorized to access this site" },
        { status: 403 }
      );
    }

    if (!site.verificationToken) {
      // Generate a new token if missing
      const newToken = `cm_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      await prisma.site.update({
        where: { id: site.id },
        data: { verificationToken: newToken },
      });
      site.verificationToken = newToken;
    }

    const verificationMetaTag = `<meta name="consent-manager-verification" content="${site.verificationToken}">`;

    return Response.json({
      isVerified: site.isVerified || false,
      verificationToken: site.verificationToken,
      verificationMetaTag: verificationMetaTag,
      verifiedAt: site.verifiedAt,
      domain: site.domain,
    });
  } catch (error) {
    console.error("Get verification status error:", error);
    return Response.json(
      { error: error.message || "Failed to get verification status" },
      { status: 500 }
    );
  }
}
