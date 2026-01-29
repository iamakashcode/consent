/**
 * CDN Route for Serving Scripts
 * 
 * This route serves pre-generated scripts from CDN storage.
 * Falls back to dynamic generation if file doesn't exist.
 */

import { getScript } from "@/lib/cdn-service";
import { NextResponse } from "next/server";

export async function GET(req, { params }) {
  try {
    const resolvedParams = await params;
    const { siteId } = resolvedParams;
    
    if (!siteId) {
      return new NextResponse("// Site ID is required", {
        status: 400,
        headers: { "Content-Type": "application/javascript" },
      });
    }

    // Check if this is a preview request
    const { searchParams } = new URL(req.url);
    const isPreview = searchParams.get("preview") === "1";

    // Try to get script from CDN
    const script = await getScript(siteId, isPreview);
    
    if (script) {
      // Script found - serve with cache headers
      return new NextResponse(script, {
        status: 200,
        headers: {
          "Content-Type": "application/javascript; charset=utf-8",
          "Cache-Control": isPreview 
            ? "no-cache, no-store, must-revalidate" 
            : "public, max-age=31536000, immutable",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // Script not found in CDN - redirect to API route for dynamic generation
    const protocol = req.headers.get("x-forwarded-proto") || 
      (req.headers.get("host")?.includes("localhost") ? "http" : "https");
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
    const apiUrl = `${protocol}://${host}/api/script/${siteId}${isPreview ? "?preview=1" : ""}`;
    
    return NextResponse.redirect(apiUrl, 307);
  } catch (error) {
    console.error("[CDN Route] Error:", error);
    return new NextResponse(
      `console.error('[Consent SDK] Error loading script: ${error.message}');`,
      {
        status: 500,
        headers: { "Content-Type": "application/javascript" },
      }
    );
  }
}
