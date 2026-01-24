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

    console.log(`[Verify Callback] Received request for siteId: ${siteId}`);
    console.log(`[Verify Callback] Request URL: ${req.url}`);
    console.log(`[Verify Callback] Request headers:`, {
      referer: req.headers.get("referer"),
      origin: req.headers.get("origin"),
      host: req.headers.get("host"),
    });

    if (!siteId) {
      console.error("[Verify Callback] Missing siteId");
      return new Response(JSON.stringify({ 
        connected: false,
        error: "Site ID is required" 
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

    // Get domain from query parameter or headers
    const { searchParams } = new URL(req.url);
    const domainParam = searchParams.get("domain");
    console.log(`[Verify Callback] Domain param from query: ${domainParam}`);
    
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
        url: req.url,
      });
      return new Response(JSON.stringify({ 
        connected: false,
        error: "Could not determine domain from request",
        debug: {
          referer: req.headers.get("referer"),
          origin: req.headers.get("origin"),
          domainParam,
        }
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
      console.error("[Verify Callback] Site not found for siteId:", siteId);
      return new Response(JSON.stringify({ 
        connected: false,
        error: "Site not found" 
      }), {
        status: 404,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    // Clean the stored domain for comparison
    const storedDomain = site.domain.toLowerCase().replace(/^www\./, "");

    // Verify the domain matches
    console.log(`[Verify Callback] Comparing domains - Request: "${requestDomain}", Stored: "${storedDomain}"`);
    if (requestDomain !== storedDomain) {
      console.warn(`[Verify Callback] Domain mismatch: ${requestDomain} !== ${storedDomain}`);
      return new Response(JSON.stringify({ 
        connected: false, 
        error: "Domain mismatch",
        requestDomain,
        storedDomain,
        message: `Domain ${requestDomain} does not match stored domain ${storedDomain}`,
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
    
    console.log(`[Verify Callback] Domain match confirmed: ${requestDomain}`);

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

    // Mark as verified and update lastSeenAt
    console.log(`[Verify Callback] Marking domain as connected...`);
    
    // Check if lastSeenAt column exists
    const hasLastSeenAt = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'sites' 
      AND column_name = 'lastSeenAt'
      LIMIT 1
    `.then(result => Array.isArray(result) && result.length > 0).catch(() => false);
    
    if (verificationColumns.allExist) {
      try {
        const updateData = {
          isVerified: true,
          verifiedAt: new Date(),
        };
        if (hasLastSeenAt) {
          updateData.lastSeenAt = new Date();
        }
        const updateResult = await prisma.site.update({
          where: { id: site.id },
          data: updateData,
        });
        console.log(`[Verify Callback] ✓ Successfully updated isVerified to true via Prisma`);
      } catch (updateError) {
        console.warn("[Verify Callback] Prisma update failed, using raw SQL:", updateError.message);
        try {
          if (hasLastSeenAt) {
            await prisma.$executeRaw`
              UPDATE "sites"
              SET "isVerified" = true,
                  "verifiedAt" = NOW(),
                  "lastSeenAt" = NOW()
              WHERE "id" = ${site.id}
            `;
          } else {
            await prisma.$executeRaw`
              UPDATE "sites"
              SET "isVerified" = true,
                  "verifiedAt" = NOW()
              WHERE "id" = ${site.id}
            `;
          }
          console.log(`[Verify Callback] ✓ Successfully updated isVerified to true via raw SQL`);
        } catch (rawSqlError) {
          console.error(`[Verify Callback] ✗ Raw SQL update also failed:`, rawSqlError.message);
          throw rawSqlError;
        }
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
      // Update lastSeenAt if column exists
      if (hasLastSeenAt) {
        await prisma.$executeRaw`
          UPDATE "sites"
          SET "bannerConfig" = ${JSON.stringify(nextBannerConfig)}::jsonb,
              "updatedAt" = NOW(),
              "lastSeenAt" = NOW()
          WHERE "id" = ${site.id}
        `;
      } else {
        await prisma.$executeRaw`
          UPDATE "sites"
          SET "bannerConfig" = ${JSON.stringify(nextBannerConfig)}::jsonb,
              "updatedAt" = NOW()
          WHERE "id" = ${site.id}
        `;
      }
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
