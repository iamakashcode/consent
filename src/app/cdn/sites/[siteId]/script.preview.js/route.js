/**
 * CDN Route for Serving Preview Scripts
 *
 * When R2 is configured and the preview exists, redirects to R2 public URL.
 * Otherwise serves from file system or redirects to API.
 */

import { getScript, getCdnUrl, scriptExists, R2_CONFIGURED } from "@/lib/cdn-service";
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

    const isPreview = true;

    if (R2_CONFIGURED) {
      const exists = await scriptExists(siteId, isPreview);
      if (exists) {
        return NextResponse.redirect(getCdnUrl(siteId, isPreview), 307);
      }
      const protocol =
        req.headers.get("x-forwarded-proto") ||
        (req.headers.get("host")?.includes("localhost") ? "http" : "https");
      const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
      return NextResponse.redirect(`${protocol}://${host}/api/script/${siteId}?preview=1`, 307);
    }

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

    const protocol =
      req.headers.get("x-forwarded-proto") ||
      (req.headers.get("host")?.includes("localhost") ? "http" : "https");
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
    return NextResponse.redirect(`${protocol}://${host}/api/script/${siteId}?preview=1`, 307);
  } catch (error) {
    console.error("[CDN Route] Error:", error);
    return new NextResponse(
      `console.error('[Consent SDK] Error loading script: ${error.message}');`,
      { status: 500, headers: { "Content-Type": "application/javascript" } }
    );
  }
}
