import { detectTrackers } from "@/lib/tracker-detector";
import { prisma } from "@/lib/prisma";
import { generateSiteId } from "@/lib/store";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { hasVerificationColumns } from "@/lib/db-utils";

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user || !session.user.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const userId = session.user.id;

    const { domain } = await req.json();

    if (!domain) {
      return Response.json({ error: "Domain is required" }, { status: 400 });
    }

    // Clean domain
    let cleanDomain = domain.trim().toLowerCase();
    cleanDomain = cleanDomain.replace(/^https?:\/\//, "");
    cleanDomain = cleanDomain.replace(/^www\./, "");
    cleanDomain = cleanDomain.split("/")[0];
    cleanDomain = cleanDomain.split("?")[0];

    if (!cleanDomain) {
      return Response.json({ error: "Invalid domain" }, { status: 400 });
    }

    // Check user's plan limits
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true },
    });

    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const plan = user.subscription?.plan;
    
    // Check if user has a plan
    if (!plan) {
      return Response.json(
        {
          error: "Please select a plan to add domains. Visit the plans page to choose a plan.",
          requiresPlan: true,
        },
        { status: 403 }
      );
    }
    
    const siteCount = await prisma.site.count({
      where: { userId },
    });

    // Check limits based on plan
    const limits = {
      basic: 1,
      starter: 5,
      pro: Infinity,
    };

    const limit = limits[plan] || 1;
    if (siteCount >= limit) {
      return Response.json(
        {
          error: `You've reached your plan limit (${limit} site${limit > 1 ? "s" : ""}). Please upgrade your plan.`,
        },
        { status: 403 }
      );
    }

      // Check if site already exists - handle missing columns gracefully
      let existingSite;
      try {
        existingSite = await prisma.site.findUnique({
          where: {
            userId_domain: {
              userId,
              domain: cleanDomain,
            },
          },
        });
      } catch (error) {
        // If verification columns don't exist, fetch without selecting them
        if (error.message && error.message.includes("isVerified")) {
          existingSite = await prisma.site.findUnique({
            where: {
              userId_domain: {
                userId,
                domain: cleanDomain,
              },
            },
            select: {
              id: true,
              domain: true,
              siteId: true,
              trackers: true,
              bannerConfig: true,
              createdAt: true,
              updatedAt: true,
            },
          });
          if (existingSite) {
            existingSite.isVerified = false;
            existingSite.verificationToken = null;
            existingSite.verifiedAt = null;
          }
        } else {
          throw error;
        }
      }

    let site;
    let siteId;

    if (existingSite) {
      // Update existing site
      site = existingSite;
      siteId = existingSite.siteId;
      
      // Generate verification token if missing (only if column exists)
      if (!existingSite.verificationToken && existingSite.verificationToken !== undefined) {
        try {
          const verificationToken = `cm_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
          await prisma.site.update({
            where: { id: existingSite.id },
            data: { verificationToken },
          });
          site.verificationToken = verificationToken;
        } catch (error) {
          // Column doesn't exist, skip update
          if (error.message && error.message.includes("verificationToken")) {
            console.warn("verificationToken column doesn't exist, skipping update");
          } else {
            throw error;
          }
        }
      }
    } else {
      // Fetch the website
      let html;
      try {
        const url = `https://${cleanDomain}`;
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
            error: `Failed to fetch website: ${error.message}. Make sure the domain is accessible.`,
          },
          { status: 500 }
        );
      }

      // Detect trackers
      const trackers = detectTrackers(html, cleanDomain);

      // Generate unique siteId
      siteId = generateSiteId();

      // Generate verification token
      const verificationToken = `cm_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

      // Create or update site in database
      // Check if verification columns exist first
      const verificationColumns = await hasVerificationColumns();
      
      if (verificationColumns.allExist) {
        // All columns exist, use them
        site = await prisma.site.upsert({
          where: {
            userId_domain: {
              userId,
              domain: cleanDomain,
            },
          },
          create: {
            domain: cleanDomain,
            siteId: siteId,
            userId,
            trackers: trackers,
            verificationToken: verificationToken,
            isVerified: false, // Will be verified after user adds meta tag
          },
          update: {
            trackers: trackers,
            updatedAt: new Date(),
            // Don't reset verification if already verified
          },
        });
      } else {
        // Columns don't exist, use raw SQL to avoid Prisma schema validation
        console.warn("Verification columns missing, using raw SQL to create site");
        
        // First check if site exists
        const existingSiteRaw = await prisma.$queryRaw`
          SELECT * FROM "sites" 
          WHERE "userId" = ${userId} AND "domain" = ${cleanDomain}
          LIMIT 1
        `;
        
        const trackersJson = JSON.stringify(trackers);
        
        if (existingSiteRaw && existingSiteRaw.length > 0) {
          // Update existing site
          const result = await prisma.$queryRaw`
            UPDATE "sites"
            SET 
              "trackers" = ${trackersJson}::jsonb,
              "updatedAt" = NOW()
            WHERE "userId" = ${userId} AND "domain" = ${cleanDomain}
            RETURNING *
          `;
          site = result[0];
        } else {
          // Create new site
          const result = await prisma.$queryRaw`
            INSERT INTO "sites" ("id", "domain", "siteId", "userId", "trackers", "createdAt", "updatedAt")
            VALUES (
              gen_random_uuid()::text,
              ${cleanDomain},
              ${siteId},
              ${userId},
              ${trackersJson}::jsonb,
              NOW(),
              NOW()
            )
            RETURNING *
          `;
          site = result[0];
        }
        
        // Add default verification values to the object (not in DB)
        if (site) {
          site.isVerified = false;
          site.verificationToken = verificationToken;
          site.verifiedAt = null;
        } else {
          throw new Error("Failed to create or update site");
        }
      }
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      (req.headers.get("origin") || `http://${req.headers.get("host")}`);
    const scriptUrl = `${baseUrl}/api/script/${site.siteId}?domain=${encodeURIComponent(cleanDomain)}`;

    // Get verification token (from DB or fallback)
    const siteVerificationToken = site.verificationToken || verificationToken;
    const siteIsVerified = site.isVerified || false;

    return Response.json({
      domain: cleanDomain,
      trackers: Array.isArray(site.trackers) ? site.trackers : [],
      scriptUrl,
      siteId: site.siteId,
      isVerified: siteIsVerified,
      verificationToken: siteVerificationToken,
      message: siteIsVerified 
        ? "Domain is verified. The script is working correctly."
        : "Add the script to your website. Verification will happen automatically when the script loads.",
    });
  } catch (error) {
    console.error("Crawl error:", error);
    return Response.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
