/**
 * In-memory store for registered sites
 * In production, this should be replaced with a database
 */

export const sites = new Map();

/**
 * Generate unique site ID
 */
function generateSiteId() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return Buffer.from(`${timestamp}-${random}`).toString("base64").replace(/[+/=]/g, "");
}

/**
 * Register a new site
 */
export function registerSite(domain, trackers) {
  const siteId = generateSiteId();
  sites.set(siteId, {
    domain,
    trackers,
    createdAt: new Date().toISOString(),
  });
  return siteId;
}

/**
 * Get site by ID
 */
export function getSite(siteId) {
  return sites.get(siteId);
}

/**
 * Get all sites
 */
export function getAllSites() {
  return Array.from(sites.entries()).map(([id, data]) => ({
    id,
    ...data,
  }));
}
