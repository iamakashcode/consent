import { detectTrackers } from "@/lib/tracker-detector";
import { prisma } from "@/lib/prisma";
import { generateSiteId } from "@/lib/store";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

/**
 * Crawl a domain and detect trackers
 * Domain-first: User can add unlimited domains, each needs its own subscription
 */
export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
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

    // Validate domain format
    const domainRegex = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/;
    if (!domainRegex.test(cleanDomain)) {
      return Response.json(
        { error: "Invalid domain format. Please enter a valid domain (e.g., example.com)" },
        { status: 400 }
      );
    }

    // Check if site already exists for this user
    let existingSite = await prisma.site.findFirst({
      where: {
        userId: userId,
        domain: cleanDomain,
      },
      include: { subscription: true },
    });

    let site;
    let siteId;
    let isNewSite = false;

    if (existingSite) {
      // Site already exists
      site = existingSite;
      siteId = existingSite.siteId;
    } else {
      // Crawl the website for trackers
      let html;
      try {
        const url = `https://${cleanDomain}`;
        const response = await fetch(url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          },
          redirect: "follow",
          signal: AbortSignal.timeout(15000), // 15 second timeout
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        html = await response.text();
      } catch (error) {
        console.error(`[Crawl] Failed to fetch ${cleanDomain}:`, error);
        return Response.json(
          {
            error: `Failed to fetch website: ${error.message}. Make sure the domain is accessible via HTTPS.`,
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

      // Create site
      try {
        site = await prisma.site.create({
          data: {
            domain: cleanDomain,
            siteId: siteId,
            userId: userId,
            trackers: trackers,
            verificationToken: verificationToken,
            isVerified: false,
          },
        });
        isNewSite = true;
      } catch (createError) {
        // Handle race condition if site was created by another request
        if (createError.code === "P2002") {
          existingSite = await prisma.site.findFirst({
            where: {
              userId: userId,
              domain: cleanDomain,
            },
            include: { subscription: true },
          });
          if (existingSite) {
            site = existingSite;
            siteId = existingSite.siteId;
          } else {
            throw createError;
          }
        } else {
          throw createError;
        }
      }
    }

    // Build response
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ||
      req.headers.get("origin") ||
      `http://${req.headers.get("host")}`;

    const scriptUrl = `${baseUrl}/api/script/${site.siteId}?domain=${encodeURIComponent(cleanDomain)}`;

    // Check if site has a subscription
    const hasSubscription = !!site.subscription;
    const subscriptionStatus = site.subscription?.status?.toLowerCase();
    const isSubscriptionActive = subscriptionStatus === "active" || subscriptionStatus === "trial";

    // Determine if user needs to select a plan
    const needsPlan = !hasSubscription || 
                      subscriptionStatus === "pending" || 
                      subscriptionStatus === "cancelled" ||
                      subscriptionStatus === "expired" ||
                      subscriptionStatus === "payment_failed";

    return Response.json({
      domain: cleanDomain,
      trackers: Array.isArray(site.trackers) ? site.trackers : [],
      scriptUrl,
      siteId: site.siteId,
      siteDbId: site.id,
      isVerified: site.isVerified || false,
      verificationToken: site.verificationToken,
      hasSubscription: hasSubscription,
      subscriptionStatus: subscriptionStatus || null,
      isSubscriptionActive: isSubscriptionActive,
      needsPlan: needsPlan,
      isNewSite: isNewSite,
      message: isNewSite
        ? "Domain added successfully! Select a plan to activate tracking."
        : hasSubscription && isSubscriptionActive
          ? "Domain exists and subscription is active."
          : "Domain exists. Select a plan to activate tracking.",
    });

  } catch (error) {
    console.error("[Crawl] Error:", error);
    return Response.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
