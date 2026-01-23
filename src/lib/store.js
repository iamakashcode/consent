/**
 * Generate unique site ID
 */
export function generateSiteId() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return Buffer.from(`${timestamp}-${random}`).toString("base64").replace(/[+/=]/g, "");
}
