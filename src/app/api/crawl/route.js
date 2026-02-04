import { detectTrackers } from "@/lib/tracker-detector";
import { prisma } from "@/lib/prisma";
import { generateSiteId } from "@/lib/store";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { getCdnUrl, R2_CONFIGURED } from "@/lib/cdn-service";

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

    // Duplicate check: only within this user. Same user cannot add same full domain twice (desire.com 2x = no).
    // Different TLDs allowed (desire.com + desire.in = yes). Case-insensitive compare in JS so it works in any DB.
    const userSites = await prisma.site.findMany({
      where: { userId },
      select: { domain: true },
    });
    const existingSite = userSites.find(
      (s) => s.domain && s.domain.trim().toLowerCase() === cleanDomain
    );
    if (existingSite) {
      return Response.json(
        { error: "This domain is already in your account. You cannot add the same domain again." },
        { status: 400 }
      );
    }

    const userPendingList = await prisma.pendingDomain.findMany({
      where: { userId },
      select: { domain: true, siteId: true, trackers: true, verificationToken: true },
    });
    const existingPending = userPendingList.find(
      (p) => p.domain && p.domain.trim().toLowerCase() === cleanDomain
    );
    if (existingPending) {
      return Response.json(
        { error: "This domain is already added and is pending payment. Complete payment or try again later." },
        { status: 400 }
      );
    }

    let site;
    let siteId;
    let isNewSite = false;
    {
      // Crawl the website for trackers
      let html;
      let trackers = [];

      try {
        // Try HTTPS first
        let url = `https://${cleanDomain}`;
        let response;
        let lastError;

        try {
          response = await fetch(url, {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
              "Accept-Language": "en-US,en;q=0.9",
            },
            redirect: "follow",
            signal: AbortSignal.timeout(20000), // 20 second timeout
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          html = await response.text();
          console.log(`[Crawl] Successfully fetched ${url}`);
        } catch (httpsError) {
          console.log(`[Crawl] HTTPS failed for ${cleanDomain}, trying HTTP:`, httpsError.message);
          lastError = httpsError;

          // Try HTTP as fallback
          try {
            url = `http://${cleanDomain}`;
            response = await fetch(url, {
              headers: {
                "User-Agent":
                  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.9",
              },
              redirect: "follow",
              signal: AbortSignal.timeout(20000),
            });

            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            html = await response.text();
            console.log(`[Crawl] Successfully fetched ${url} via HTTP`);
          } catch (httpError) {
            console.error(`[Crawl] Both HTTPS and HTTP failed for ${cleanDomain}:`, {
              https: httpsError.message,
              http: httpError.message,
            });
            // Continue without HTML - we'll create site with empty trackers
            html = null;
            lastError = httpError;
          }
        }

        // If we got HTML, detect trackers
        if (html) {
          trackers = detectTrackers(html, cleanDomain);
          console.log(`[Crawl] Detected ${trackers.length} trackers for ${cleanDomain}`);
        } else {
          // If fetch failed, still create the site but with empty trackers
          // User can still add the domain and set up subscription
          console.log(`[Crawl] Could not fetch ${cleanDomain}, creating site without trackers`);
          trackers = [];
        }
      } catch (error) {
        console.error(`[Crawl] Unexpected error for ${cleanDomain}:`, error);
        // Continue anyway - create site without trackers
        trackers = [];
        html = null;
      }

      // Generate unique siteId (used for PendingDomain; Site will be created only after payment)
      siteId = generateSiteId();

      // Generate verification token
      const verificationToken = `cm_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

      // Create PendingDomain - Site is created only when payment succeeds (see webhook)
      try {
        const pending = await prisma.pendingDomain.create({
          data: {
            domain: cleanDomain,
            siteId: siteId,
            userId: userId,
            trackers: trackers,
            verificationToken: verificationToken,
          },
        });
        isNewSite = true;
        // Build a minimal "site" shape for response (no DB Site yet)
        site = {
          id: null,
          domain: cleanDomain,
          siteId: pending.siteId,
          trackers: pending.trackers,
          isVerified: false,
          verificationToken: pending.verificationToken,
          subscription: null,
        };
      } catch (createError) {
        // Handle race: same domain added by same user in another request - resolve from DB
        if (createError.code === "P2002") {
          const againSites = await prisma.site.findMany({
            where: { userId },
            include: { subscription: true },
          });
          const againSite = againSites.find((s) => s.domain && s.domain.trim().toLowerCase() === cleanDomain);
          if (againSite) {
            site = againSite;
            siteId = againSite.siteId;
          } else {
            const pendingList = await prisma.pendingDomain.findMany({
              where: { userId },
              select: { domain: true, siteId: true, trackers: true, verificationToken: true },
            });
            const againPending = pendingList.find(
              (p) => p.domain && p.domain.trim().toLowerCase() === cleanDomain
            );
            if (againPending) {
              site = {
                id: null,
                domain: againPending.domain,
                siteId: againPending.siteId,
                trackers: againPending.trackers,
                isVerified: false,
                verificationToken: againPending.verificationToken,
                subscription: null,
              };
              siteId = againPending.siteId;
              isNewSite = false;
            } else {
              throw createError;
            }
          }
        } else {
          throw createError;
        }
      }
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ||
      req.headers.get("origin") ||
      `http://${req.headers.get("host")}`;
    const scriptUrl = R2_CONFIGURED
      ? getCdnUrl(site.siteId, false)
      : `${baseUrl}/cdn/sites/${site.siteId}/script.js`;

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

    // Build success message
    let message;
    if (isNewSite) {
      const trackerCount = Array.isArray(site.trackers) ? site.trackers.length : 0;
      if (trackerCount > 0) {
        message = `Domain added successfully! Found ${trackerCount} tracker(s). Select a plan to activate tracking.`;
      } else {
        message = "Domain added successfully! Select a plan to activate tracking.";
      }
    } else {
      message = hasSubscription && isSubscriptionActive
        ? "Domain exists and subscription is active."
        : "Domain exists. Select a plan to activate tracking.";
    }

    // Upload script to R2/CDN only when a real Site exists (not for PendingDomain - Site is created after payment)
    if (isNewSite && site?.id && site?.siteId) {
      const { regenerateScriptOnConfigChange } = await import("@/lib/script-generator");
      regenerateScriptOnConfigChange(site.siteId).catch((err) => {
        console.error("[Crawl] Script upload after add domain failed:", err.message);
      });
    }

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
      message: message,
    });

  } catch (error) {
    console.error("[Crawl] Error:", error);
    return Response.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
