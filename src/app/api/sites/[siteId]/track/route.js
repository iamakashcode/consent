import { prisma } from "@/lib/prisma";

/**
 * Track page view when script loads on a page
 * This endpoint is called by the consent script to track page views
 */
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function POST(req, { params }) {
  try {
    // Await params as it's a Promise in Next.js
    const resolvedParams = await params;
    const { siteId } = resolvedParams;

    if (!siteId) {
      return new Response(
        JSON.stringify({ error: "Site ID is required" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // Verify site exists
    const site = await prisma.site.findUnique({
      where: { siteId },
      select: { id: true, domain: true },
    });

    if (!site) {
      return new Response(JSON.stringify({ error: "Site not found" }), {
        status: 404,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // Get page view data from request body
    const body = await req.json().catch(() => ({}));
    const { pagePath, pageTitle, userAgent, referer } = body;

    // Extract page path from URL if not provided
    let finalPagePath = pagePath || "/";
    if (!pagePath) {
      const refererUrl = referer || req.headers.get("referer");
      if (refererUrl) {
        try {
          const url = new URL(refererUrl);
          finalPagePath = url.pathname + url.search;
        } catch (e) {
          // If URL parsing fails, use the referer as-is
          finalPagePath = refererUrl;
        }
      }
    }

    // Normalize page path (remove trailing slash except for root)
    if (finalPagePath !== "/" && finalPagePath.endsWith("/")) {
      finalPagePath = finalPagePath.slice(0, -1);
    }

    // Get user agent from body or headers
    const finalUserAgent = userAgent || req.headers.get("user-agent") || null;
    const finalReferer = referer || req.headers.get("referer") || null;

    // Create page view record
    try {
      await prisma.pageView.create({
        data: {
          siteId: site.id,
          pagePath: finalPagePath,
          pageTitle: pageTitle || null,
          userAgent: finalUserAgent,
          referer: finalReferer,
        },
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: "Page view tracked",
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        }
      );
    } catch (dbError) {
      // Check if PageView table exists, if not, return success (graceful degradation)
      if (
        dbError.message &&
        (dbError.message.includes("does not exist") ||
          dbError.message.includes("PageView") ||
          dbError.message.includes("page_views"))
      ) {
        console.warn(
          "[Track] PageView table not found, skipping tracking:",
          dbError.message
        );
        return new Response(
          JSON.stringify({
            success: true,
            message: "Page view tracking not available",
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          }
        );
      }
      throw dbError;
    }
  } catch (error) {
    console.error("Page view tracking error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Failed to track page view",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
}
