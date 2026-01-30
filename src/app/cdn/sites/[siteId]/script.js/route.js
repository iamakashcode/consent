/**
 * CDN Route for Serving Scripts
 *
 * Serves script from R2 or file system. When R2 is configured and script exists,
 * can redirect to R2 public URL so visitors don't hit the app.
 */

import { getScript, scriptExists, R2_CONFIGURED, getCdnUrl } from "@/lib/cdn-service";
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

    const { searchParams } = new URL(req.url);
    const isPreview = searchParams.get("preview") === "1";

    // When R2 is configured and script exists, redirect to R2 so visitors don't hit the app
    if (R2_CONFIGURED && !isPreview) {
      const exists = await scriptExists(siteId, false);
      if (exists) {
        const r2Url = getCdnUrl(siteId, false);
        if (r2Url) return NextResponse.redirect(r2Url, 307);
      }
    }

    const script = await getScript(siteId, isPreview);

    if (script) {
      return new NextResponse(script, {
        status: 200,
        headers: {
          "Content-Type": "application/javascript; charset=utf-8",
          "Cache-Control": isPreview
            ? "no-cache, no-store, must-revalidate"
            : "public, max-age=300",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // Script not found: redirect to API for dynamic generation (preview or first-time)
    const protocol =
      req.headers.get("x-forwarded-proto") ||
      (req.headers.get("host")?.includes("localhost") ? "http" : "https");
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
    return NextResponse.redirect(
      `${protocol}://${host}/api/script/${siteId}${isPreview ? "?preview=1" : ""}`,
      307
    );
  } catch (error) {
    console.error("[CDN Route] Error:", error);
    return new NextResponse(
      `console.error('[Consent SDK] Error loading script: ${error.message}');`,
      { status: 500, headers: { "Content-Type": "application/javascript" } }
    );
  }
}
