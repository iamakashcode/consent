import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { hasVerificationColumns, hasBannerConfigColumn } from "@/lib/db-utils";

/**
 * Check verification status - verification happens automatically when script is added
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

    const verificationColumns = await hasVerificationColumns();
    const bannerConfigExists = await hasBannerConfigColumn();

    // Get site from database (avoid selecting columns that may not exist)
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

    // Verify user owns this site
    if (site.userId !== session.user.id) {
      return Response.json(
        { error: "Unauthorized to verify this site" },
        { status: 403 }
      );
    }

    const verificationFromBanner =
      site?.bannerConfig?._verification && typeof site.bannerConfig._verification === "object"
        ? site.bannerConfig._verification
        : null;

    const effectiveIsVerified = verificationColumns.allExist
      ? (site.isVerified || false)
      : (verificationFromBanner?.isVerified || false);

    let effectiveToken = verificationColumns.allExist
      ? site.verificationToken
      : verificationFromBanner?.token;

    // If already verified, return success
    if (effectiveIsVerified) {
      return Response.json({
        verified: true,
        message: "Domain is already verified",
        domain: site.domain,
      });
    }

    // Ensure token exists (store in DB column if available; else store in bannerConfig fallback)
    if (!effectiveToken) {
      effectiveToken = `cm_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

      if (verificationColumns.allExist) {
        try {
          await prisma.site.update({
            where: { id: site.id },
            data: { verificationToken: effectiveToken },
          });
        } catch (updateError) {
          // If update fails (schema validation), fallback to raw SQL
          console.warn("Prisma update failed, using raw SQL:", updateError.message);
          await prisma.$executeRaw`
            UPDATE "sites"
            SET "verificationToken" = ${effectiveToken}
            WHERE "id" = ${site.id}
          `;
        }
      } else if (bannerConfigExists) {
        const nextBannerConfig = {
          ...(site.bannerConfig || {}),
          _verification: {
            ...(verificationFromBanner || {}),
            token: effectiveToken,
            isVerified: false,
            verifiedAt: null,
          },
        };
        // Use raw SQL to avoid Prisma schema validation
        await prisma.$executeRaw`
          UPDATE "sites"
          SET "bannerConfig" = ${JSON.stringify(nextBannerConfig)}::jsonb,
              "updatedAt" = NOW()
          WHERE "id" = ${site.id}
        `;
      } else {
        return Response.json(
          {
            verified: false,
            error:
              "Verification storage is not available because required DB columns are missing. Please redeploy so migrations run.",
          },
          { status: 503 }
        );
      }
    }

    // Verification happens automatically when script is added
    // Just check current status
    const isVerified = effectiveIsVerified;
    
    console.log(`[Verify API] Verification status check:`, {
      verified: isVerified,
      domain: site.domain,
    });

    if (isVerified) {
      // Update site as verified (DB columns if present, else bannerConfig fallback)
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
          // If update fails (schema validation), fallback to raw SQL
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
            token: effectiveToken,
            isVerified: true,
            verifiedAt: new Date().toISOString(),
          },
        };
        // Use raw SQL to avoid Prisma schema validation
        await prisma.$executeRaw`
          UPDATE "sites"
          SET "bannerConfig" = ${JSON.stringify(nextBannerConfig)}::jsonb,
              "updatedAt" = NOW()
          WHERE "id" = ${site.id}
        `;
      }

      return Response.json({
        verified: true,
        message: "Domain verified successfully!",
        domain: site.domain,
      });
    } else {
      // Get base URL for script
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
        (req.headers.get("origin") || `http://${req.headers.get("host")}`);
      const scriptUrl = `${baseUrl}/api/script/${site.siteId}?domain=${encodeURIComponent(site.domain)}`;
      
      return Response.json({
        verified: false,
        message: "Domain not yet verified",
        error: "Please add the consent script to your website. Verification will happen automatically when the script loads.",
        verificationToken: effectiveToken,
        scriptUrl: scriptUrl,
        instructions: [
          "1. Add the consent script to your website's <head> section",
          "2. The script will automatically verify your domain when it loads",
          "3. Refresh this page to check verification status",
        ],
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

    const verificationColumns = await hasVerificationColumns();
    const bannerConfigExists = await hasBannerConfigColumn();

    // Check if lastSeenAt column exists
    const hasLastSeenAt = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'sites' 
      AND column_name = 'lastSeenAt'
      LIMIT 1
    `.then(result => Array.isArray(result) && result.length > 0).catch(() => false);

    // Get site from database (avoid selecting columns that may not exist)
    const site = await prisma.site.findUnique({
      where: { siteId },
      select: {
        id: true,
        domain: true,
        userId: true,
        ...(bannerConfigExists ? { bannerConfig: true } : {}),
        ...(verificationColumns.allExist
          ? { isVerified: true, verificationToken: true, verifiedAt: true }
          : {}),
        ...(hasLastSeenAt ? { lastSeenAt: true } : {}),
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

    const verificationFromBanner =
      site?.bannerConfig?._verification && typeof site.bannerConfig._verification === "object"
        ? site.bannerConfig._verification
        : null;

    let effectiveToken = verificationColumns.allExist
      ? site.verificationToken
      : verificationFromBanner?.token;

    let effectiveIsVerified = verificationColumns.allExist
      ? (site.isVerified || false)
      : (verificationFromBanner?.isVerified || false);

    let effectiveVerifiedAt = verificationColumns.allExist
      ? site.verifiedAt
      : (verificationFromBanner?.verifiedAt || null);

    // Check if script is still active (lastSeenAt within last 48 hours)
    // If script hasn't pinged in 48 hours, mark as disconnected
    if (effectiveIsVerified && hasLastSeenAt && site.lastSeenAt) {
      const lastSeen = new Date(site.lastSeenAt);
      const now = new Date();
      const hoursSinceLastSeen = (now - lastSeen) / (1000 * 60 * 60);
      
      if (hoursSinceLastSeen > 48) {
        console.log(`[Verify GET] Script inactive for ${hoursSinceLastSeen.toFixed(1)} hours, marking as disconnected`);
        effectiveIsVerified = false;
        
        // Update database to reflect disconnected status
        if (verificationColumns.allExist) {
          try {
            await prisma.site.update({
              where: { id: site.id },
              data: { isVerified: false },
            });
          } catch (updateError) {
            try {
              await prisma.$executeRaw`
                UPDATE "sites"
                SET "isVerified" = false
                WHERE "id" = ${site.id}
              `;
            } catch (rawSqlError) {
              console.warn("[Verify GET] Could not update isVerified:", rawSqlError.message);
            }
          }
        } else if (bannerConfigExists) {
          const nextBannerConfig = {
            ...(site.bannerConfig || {}),
            _verification: {
              ...(verificationFromBanner || {}),
              token: effectiveToken,
              isVerified: false,
              verifiedAt: verificationFromBanner?.verifiedAt || null,
            },
          };
          await prisma.$executeRaw`
            UPDATE "sites"
            SET "bannerConfig" = ${JSON.stringify(nextBannerConfig)}::jsonb,
                "updatedAt" = NOW()
            WHERE "id" = ${site.id}
          `;
        }
      }
    } else if (effectiveIsVerified && hasLastSeenAt && !site.lastSeenAt) {
      // If verified but never seen, mark as disconnected
      console.log(`[Verify GET] Script verified but never seen, marking as disconnected`);
      effectiveIsVerified = false;
      
      if (verificationColumns.allExist) {
        try {
          await prisma.site.update({
            where: { id: site.id },
            data: { isVerified: false },
          });
        } catch (updateError) {
          try {
            await prisma.$executeRaw`
              UPDATE "sites"
              SET "isVerified" = false
              WHERE "id" = ${site.id}
            `;
          } catch (rawSqlError) {
            console.warn("[Verify GET] Could not update isVerified:", rawSqlError.message);
          }
        }
      }
    }

    if (!effectiveToken) {
      // Generate a new token if missing
      const newToken = `cm_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      effectiveToken = newToken;

      if (verificationColumns.allExist) {
        try {
          await prisma.site.update({
            where: { id: site.id },
            data: { verificationToken: newToken },
          });
        } catch (updateError) {
          // If update fails (schema validation), fallback to raw SQL
          console.warn("Prisma update failed, using raw SQL:", updateError.message);
          await prisma.$executeRaw`
            UPDATE "sites"
            SET "verificationToken" = ${newToken}
            WHERE "id" = ${site.id}
          `;
        }
      } else if (bannerConfigExists) {
        const nextBannerConfig = {
          ...(site.bannerConfig || {}),
          _verification: {
            ...(verificationFromBanner || {}),
            token: newToken,
            isVerified: false,
            verifiedAt: null,
          },
        };
        // Use raw SQL to avoid Prisma schema validation
        await prisma.$executeRaw`
          UPDATE "sites"
          SET "bannerConfig" = ${JSON.stringify(nextBannerConfig)}::jsonb,
              "updatedAt" = NOW()
          WHERE "id" = ${site.id}
        `;
      }
    }

    // Get script URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
      (req.headers.get("origin") || `http://${req.headers.get("host")}`);
    const scriptUrl = `${baseUrl}/api/script/${siteId}?domain=${encodeURIComponent(site.domain)}`;

    return Response.json({
      isVerified: effectiveIsVerified,
      verificationToken: effectiveToken,
      scriptUrl: scriptUrl,
      verifiedAt: effectiveVerifiedAt,
      domain: site.domain,
      message: effectiveIsVerified 
        ? "Domain is verified. The script is working correctly."
        : "Domain not verified. Add the script to your website to verify automatically.",
    });
  } catch (error) {
    console.error("Get verification status error:", error);
    return Response.json(
      { error: error.message || "Failed to get verification status" },
      { status: 500 }
    );
  }
}
