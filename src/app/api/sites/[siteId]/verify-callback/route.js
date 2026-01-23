import { prisma } from "@/lib/prisma";
import { hasVerificationColumns, hasBannerConfigColumn } from "@/lib/db-utils";

/**
 * Verification callback endpoint - called by the consent script when it loads
 * This automatically verifies the domain when the script is added to the website
 */
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function GET(req, { params }) {
  try {
    // Await params as it's a Promise in Next.js
    const resolvedParams = await params;
    const { siteId } = resolvedParams;

    if (!siteId) {
      return Response.json({ error: "Site ID is required" }, { status: 400 });
    }

    // Get domain from query parameter or headers
    const { searchParams } = new URL(req.url);
    const domainParam = searchParams.get("domain");
    
    // Extract domain from query param, referer, or origin header
    let requestDomain = null;
    
    if (domainParam) {
      requestDomain = domainParam.toLowerCase().replace(/^www\./, "").split("/")[0];
    } else {
      const referer = req.headers.get("referer") || req.headers.get("origin");
      const origin = req.headers.get("origin");
      
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
    }

    if (!requestDomain) {
      console.error("[Verify Callback] Could not determine domain. Headers:", {
        referer: req.headers.get("referer"),
        origin: req.headers.get("origin"),
        domainParam,
      });
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
      return new Response(JSON.stringify({ 
        connected: false, 
        error: "Domain mismatch",
        requestDomain,
        storedDomain,
      }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
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
    return new Response(JSON.stringify({
      connected: true,
      message: "Domain already connected",
      domain: site.domain,
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
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

    console.log(`[Verify Callback] ✓ Domain connected: ${site.domain} (${requestDomain})`);

    return new Response(JSON.stringify({
      connected: true,
      message: "Domain connected successfully!",
      domain: site.domain,
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  } catch (error) {
    console.error("Connection callback error:", error);
    return new Response(JSON.stringify({
      connected: false,
      error: error.message || "Failed to connect domain"
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }
}
