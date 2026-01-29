/**
 * Shared logic for script paths (R2 key and public URL path).
 * Used by r2-client, banner, and dashboard so URLs stay in sync.
 */

export function getScriptPath(siteId, isPreview = false) {
  const raw =
    process.env.R2_PUBLIC_PATH_PREFIX ||
    process.env.NEXT_PUBLIC_R2_PATH_PREFIX ||
    "";
  const prefix = raw.replace(/^\/|\/$/g, "");
  const filename = isPreview ? "script.preview.js" : "script.js";
  const rel = `sites/${siteId}/${filename}`;
  return prefix ? `${prefix}/${rel}` : rel;
}
