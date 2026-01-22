/**
 * In-memory store for registered sites
 * In production, this should be replaced with a database
 */

export const sites = new Map();

/**
 * Register a new site
 */
export function registerSite(domain, trackers) {
  const siteId = Buffer.from(domain).toString("base64");
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
