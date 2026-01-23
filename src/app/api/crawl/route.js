import { detectTrackers } from "@/lib/tracker-detector";
import { prisma } from "@/lib/prisma";
import { generateSiteId } from "@/lib/store";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

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

    const plan = user.subscription?.plan || "free";
    const siteCount = await prisma.site.count({
      where: { userId },
    });

    // Check limits based on plan
    const limits = {
      free: 1,
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
      
      // Generate verification token if missing
      if (!existingSite.verificationToken) {
        const verificationToken = `cm_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
        await prisma.site.update({
          where: { id: existingSite.id },
          data: { verificationToken },
        });
        site.verificationToken = verificationToken;
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
      // Try with verification fields first, fallback if columns don't exist
      try {
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
      } catch (error) {
        // If verification columns don't exist, create without them
        if (error.message && (error.message.includes("isVerified") || error.message.includes("verificationToken"))) {
          console.warn("Verification columns missing, creating site without them:", error.message);
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
            },
            update: {
              trackers: trackers,
              updatedAt: new Date(),
            },
          });
          // Add default verification values
          site.isVerified = false;
          site.verificationToken = verificationToken;
          site.verifiedAt = null;
        } else {
          throw error;
        }
      }
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      (req.headers.get("origin") || `http://${req.headers.get("host")}`);
    const scriptUrl = `${baseUrl}/api/script/${site.siteId}?domain=${encodeURIComponent(cleanDomain)}`;

    return Response.json({
      domain: cleanDomain,
      trackers: Array.isArray(site.trackers) ? site.trackers : [],
      scriptUrl,
      siteId: site.siteId,
    });
  } catch (error) {
    console.error("Crawl error:", error);
    return Response.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
