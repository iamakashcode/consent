/**
 * CDN Route for Serving Preview Scripts
 * 
 * This route serves pre-generated preview scripts from CDN storage.
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

    // Get preview script from CDN
    const script = await getScript(siteId, true);
    
    if (script) {
      return new NextResponse(script, {
        status: 200,
        headers: {
          "Content-Type": "application/javascript; charset=utf-8",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // Preview script not found - redirect to API route
    const protocol = req.headers.get("x-forwarded-proto") || 
      (req.headers.get("host")?.includes("localhost") ? "http" : "https");
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
    const apiUrl = `${protocol}://${host}/api/script/${siteId}?preview=1`;
    
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
