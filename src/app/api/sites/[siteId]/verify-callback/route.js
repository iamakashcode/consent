import { prisma } from "@/lib/prisma";
import { hasVerificationColumns, hasBannerConfigColumn } from "@/lib/db-utils";

/**
 * Verification callback endpoint - called by the consent script when it loads
 * This automatically verifies the domain when the script is added to the website
 */
export async function GET(req, { params }) {
  try {
    // Await params as it's a Promise in Next.js
    const resolvedParams = await params;
    const { siteId } = resolvedParams;

    if (!siteId) {
      return Response.json({ error: "Site ID is required" }, { status: 400 });
    }

    // Get the domain from the referer or origin header
    const referer = req.headers.get("referer") || req.headers.get("origin");
    const origin = req.headers.get("origin");
    
    // Extract domain from referer/origin
    let requestDomain = null;
    if (referer) {
      try {
        const url = new URL(referer);
        requestDomain = url.hostname.toLowerCase().replace(/^www\./, "");
      } catch (e) {
        // Ignore URL parsing errors
      }
    }
    if (!requestDomain && origin) {
      try {
        const url = new URL(origin);
        requestDomain = url.hostname.toLowerCase().replace(/^www\./, "");
      } catch (e) {
        // Ignore URL parsing errors
      }
    }

    if (!requestDomain) {
      return Response.json({ error: "Could not determine domain from request" }, { status: 400 });
    }

    const verificationColumns = await hasVerificationColumns();
    const bannerConfigExists = await hasBannerConfigColumn();

    // Get site from database
    const site = await prisma.site.findUnique({
      where: { siteId },
      select: {
        id: true,
        domain: true,
        userId: true,
        ...(bannerConfigExists ? { bannerConfig: true } : {}),
        ...(verificationColumns.allExist ? { isVerified: true, verificationToken: true } : {}),
      },
    });

    if (!site) {
      return Response.json({ error: "Site not found" }, { status: 404 });
    }

    // Clean the stored domain for comparison
    const storedDomain = site.domain.toLowerCase().replace(/^www\./, "");

    // Verify the domain matches
    if (requestDomain !== storedDomain) {
      console.log(`[Verify Callback] Domain mismatch: ${requestDomain} !== ${storedDomain}`);
      return Response.json({ 
        verified: false, 
        error: "Domain mismatch",
        requestDomain,
        storedDomain,
      }, { status: 400 });
    }

    // Check if already verified
    const verificationFromBanner =
      site?.bannerConfig?._verification && typeof site.bannerConfig._verification === "object"
        ? site.bannerConfig._verification
        : null;

    const effectiveIsVerified = verificationColumns.allExist
      ? (site.isVerified || false)
      : (verificationFromBanner?.isVerified || false);

    if (effectiveIsVerified) {
      // Already verified, just return success
      return Response.json({
        verified: true,
        message: "Domain already verified",
        domain: site.domain,
      });
    }

    // Mark as verified
    if (verificationColumns.allExist) {
      try {
        await prisma.site.update({
          where: { id: site.id },
          data: {
            isVerified: true,
            verifiedAt: new Date(),
          },
        });
      } catch (updateError) {
        console.warn("Prisma update failed, using raw SQL:", updateError.message);
        await prisma.$executeRaw`
          UPDATE "sites"
          SET "isVerified" = true,
              "verifiedAt" = NOW()
          WHERE "id" = ${site.id}
        `;
      }
    } else if (bannerConfigExists) {
      const nextBannerConfig = {
        ...(site.bannerConfig || {}),
        _verification: {
          ...(verificationFromBanner || {}),
          token: site.verificationToken || `cm_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
          isVerified: true,
          verifiedAt: new Date().toISOString(),
        },
      };
      await prisma.$executeRaw`
        UPDATE "sites"
        SET "bannerConfig" = ${JSON.stringify(nextBannerConfig)}::jsonb,
            "updatedAt" = NOW()
        WHERE "id" = ${site.id}
      `;
    }

    console.log(`[Verify Callback] ✓ Domain verified: ${site.domain} (${requestDomain})`);

    return Response.json({
      verified: true,
      message: "Domain verified successfully!",
      domain: site.domain,
    });
  } catch (error) {
    console.error("Verification callback error:", error);
    return Response.json(
      { error: error.message || "Failed to verify domain" },
      { status: 500 }
    );
  }
}
