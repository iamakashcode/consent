/**
 * Script Generator Service
 * 
 * Generates and uploads scripts to CDN when configuration changes
 */

import { prisma } from "@/lib/prisma";
import { DEFAULT_BANNER_CONFIG, BANNER_TEMPLATES, normalizeBannerConfig } from "@/lib/banner-templates";
import { isSubscriptionActive, checkPageViewLimit } from "@/lib/subscription";
import { uploadScript, getCdnUrl, uploadBlankScript } from "./cdn-service";

// Import the generation functions from the script route
// These are exported from the route file and can be imported
import { generateInlineBlocker, generateMainScript } from "../app/api/script/[siteId]/route.js";

/**
 * Generate and upload script to CDN for a site
 */
export async function generateAndUploadScript(siteId, options = {}) {
  try {
    const {
      isPreview = false,
      forceRegenerate = false,
      skipSubscriptionCheck = false, // e.g. when regenerating after banner config save
    } = options;

    // Fetch site data
    const site = await prisma.site.findUnique({
      where: { siteId },
      include: {
        subscription: true,
      },
    });

    if (!site) {
      throw new Error(`Site not found: ${siteId}`);
    }

    // Check subscription (skip for preview or when explicitly allowed, e.g. banner-triggered regenerate)
    if (!isPreview && !skipSubscriptionCheck) {
      const subscriptionStatus = await isSubscriptionActive(site.id);
      if (!subscriptionStatus.isActive) {
        throw new Error(`Subscription inactive: ${subscriptionStatus.reason}`);
      }
    }

    const allowedDomain = site.domain;
    
    // Get base URL for API endpoints
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                   process.env.NEXTAUTH_URL || 
                   'https://consent-silk.vercel.app';
    
    // Extract hostname for consent API domain
    let consentApiHostname = "";
    try {
      const baseUrlObj = new URL(baseUrl);
      consentApiHostname = baseUrlObj.hostname.replace(/^www\./, "");
    } catch (e) {
      consentApiHostname = new URL(baseUrl).hostname || "";
    }

    let rawConfig = site.bannerConfig || DEFAULT_BANNER_CONFIG;
    if (typeof rawConfig === "string") {
      try {
        rawConfig = JSON.parse(rawConfig);
      } catch (e) {
        rawConfig = DEFAULT_BANNER_CONFIG;
      }
    }
    const normalized = normalizeBannerConfig(rawConfig);
    const { title, message, acceptText, rejectText, showReject, position, style: normStyle } = normalized;
    const style = normStyle || {};
    const posStyle = position === "top" ? "top:0;bottom:auto;" : "bottom:0;top:auto;";
    const bannerStyle =
      `position:fixed;${posStyle}left:0;right:0;` +
      `background:${style.backgroundColor || '#1f2937'};` +
      `color:${style.textColor || '#ffffff'};` +
      `padding:${style.padding || '20px'};` +
      `z-index:2147483647;` +
      `display:flex;justify-content:space-between;align-items:center;gap:15px;flex-wrap:wrap;` +
      `font-family:system-ui,-apple-system,sans-serif;` +
      `font-size:${style.fontSize || '14px'};` +
      (style.borderRadius ? `border-radius:${style.borderRadius};` : '') +
      (style.border ? `border:${style.border};` : '') +
      (style.boxShadow ? `box-shadow:${style.boxShadow};` : 'box-shadow:0 -4px 6px rgba(0,0,0,0.1);');

    // Generate API URLs
    const verifyCallbackUrl = `${baseUrl}/api/sites/${siteId}/verify-callback`;
    const trackUrl = `${baseUrl}/api/sites/${siteId}/track`;
    const consentLogUrl = `${baseUrl}/api/sites/${siteId}/consent-log`;

    // Generate scripts
    const inlineBlocker = generateInlineBlocker(siteId, allowedDomain, isPreview, consentApiHostname);
    const showBranding = !site.subscription?.removeBrandingAddon;
    const mainScript = generateMainScript(
      siteId,
      allowedDomain,
      isPreview,
      normalized,
      bannerStyle,
      position,
      title,
      message,
      acceptText,
      rejectText,
      showReject,
      verifyCallbackUrl,
      trackUrl,
      consentLogUrl,
      style,
      showBranding
    );

    const fullScript = inlineBlocker + "\n" + mainScript;

    // Upload to CDN
    const result = await uploadScript(siteId, fullScript, isPreview);

    return {
      success: true,
      url: result.url,
      cdnUrl: getCdnUrl(siteId, isPreview),
    };
  } catch (error) {
    console.error(`[ScriptGenerator] Failed to generate script for ${siteId}:`, error);
    throw error;
  }
}

/**
 * Sync CDN script with subscription and view limit: if subscription active and views under limit, upload real script; otherwise upload blank so banner stops.
 * Call this when subscription/views change or from a cron.
 */
export async function syncSiteScriptWithSubscription(siteId) {
  const [subStatus, viewLimit] = await Promise.all([
    isSubscriptionActive(siteId),
    checkPageViewLimit(siteId),
  ]);
  const shouldServeRealScript = subStatus.isActive && !viewLimit.exceeded;
  if (shouldServeRealScript) {
    await generateAndUploadScript(siteId, { isPreview: false, skipSubscriptionCheck: true });
  } else {
    await uploadBlankScript(siteId);
  }
}

/**
 * Regenerate script when configuration changes
 */
export async function regenerateScriptOnConfigChange(siteId) {
  // Generate production script (allow upload even if subscription inactive so banner customisation goes live)
  await generateAndUploadScript(siteId, { isPreview: false, skipSubscriptionCheck: true });
  // Also regenerate preview script
  await generateAndUploadScript(siteId, { isPreview: true });
  return { success: true };
}
