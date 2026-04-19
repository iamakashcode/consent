/**
 * Normalize a site domain for consent script domain checks (must match crawl / DB cleanup).
 */
export function normalizeDomainForConsentScript(domain) {
  if (!domain || typeof domain !== "string") return "";
  let d = domain.trim().toLowerCase();
  d = d.replace(/^https?:\/\//i, "");
  d = d.replace(/^www\./i, "");
  d = d.split("/")[0].split("?")[0];
  d = d.split(":")[0];
  return d;
}

/** Escape a string for embedding in single-quoted JS literals in generated scripts */
export function escapeForSingleQuotedJs(str) {
  return String(str ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/\r?\n/g, " ");
}
