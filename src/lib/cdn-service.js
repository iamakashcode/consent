/**
 * CDN Service for Script Storage
 *
 * Uses Cloudflare R2 when configured; otherwise falls back to file system.
 */

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import {
  R2_CONFIGURED,
  r2Upload,
  r2Get,
  r2Exists,
  r2PublicUrl,
  r2Delete,
} from "./r2-client";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CDN_BASE_URL = process.env.CDN_BASE_URL || process.env.NEXT_PUBLIC_BASE_URL || "";
const CDN_STORAGE_PATH =
  process.env.CDN_STORAGE_PATH || path.join(process.cwd(), "public", "cdn", "sites");

/** No-op script uploaded to CDN when subscription is inactive or view limit exceeded so the banner does not run */
export const BLANK_SCRIPT =
  "(function(){'use strict';console.warn('[ConsentFlow] Script inactive: subscription expired or view limit exceeded.');})();";

async function ensureStorageDir() {
  try {
    await fs.mkdir(CDN_STORAGE_PATH, { recursive: true });
  } catch (e) {
    console.error("[CDN] Failed to create storage directory:", e);
    throw e;
  }
}

/**
 * Get the public URL for a site's script.
 * Uses R2 CDN URL when R2 is configured; otherwise app-relative /cdn/ URL.
 */
export function getCdnUrl(siteId, isPreview = false) {
  if (R2_CONFIGURED) {
    const url = r2PublicUrl(siteId, isPreview);
    if (url) return url;
  }
  const filename = isPreview ? "script.preview.js" : "script.js";
  const p = `/cdn/sites/${siteId}/${filename}`;
  return CDN_BASE_URL ? `${CDN_BASE_URL}${p}` : p;
}

/**
 * Upload script to R2 or file system.
 */
export async function uploadScript(siteId, scriptContent, isPreview = false) {
  if (R2_CONFIGURED) {
    await r2Upload(siteId, scriptContent, isPreview);
    const url = r2PublicUrl(siteId, isPreview);
    console.log("[CDN] Script uploaded to R2:", url);
    return { success: true, url, path: null };
  }
  await ensureStorageDir();
  const siteDir = path.join(CDN_STORAGE_PATH, siteId);
  await fs.mkdir(siteDir, { recursive: true });
  const filename = isPreview ? "script.preview.js" : "script.js";
  const filePath = path.join(siteDir, filename);
  await fs.writeFile(filePath, scriptContent, "utf-8");
  const url = getCdnUrl(siteId, isPreview);
  console.log("[CDN] Script uploaded (fs):", filePath, "->", url);
  return { success: true, url, path: filePath };
}

/**
 * Upload the blank (no-op) script for a site so the banner stops working (e.g. when subscription expires).
 */
export async function uploadBlankScript(siteId) {
  return uploadScript(siteId, BLANK_SCRIPT, false);
}

/**
 * Check if script exists in R2 or file system.
 */
export async function scriptExists(siteId, isPreview = false) {
  if (R2_CONFIGURED) return r2Exists(siteId, isPreview);
  const filename = isPreview ? "script.preview.js" : "script.js";
  const filePath = path.join(CDN_STORAGE_PATH, siteId, filename);
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get script content from R2 or file system. Returns null if not found.
 */
export async function getScript(siteId, isPreview = false) {
  if (R2_CONFIGURED) return r2Get(siteId, isPreview);
  const filename = isPreview ? "script.preview.js" : "script.js";
  const filePath = path.join(CDN_STORAGE_PATH, siteId, filename);
  try {
    return await fs.readFile(filePath, "utf-8");
  } catch (e) {
    if (e.code === "ENOENT") return null;
    throw e;
  }
}

/**
 * Delete script from R2 or file system.
 */
export async function deleteScript(siteId, isPreview = false) {
  if (R2_CONFIGURED) {
    await r2Delete(siteId, isPreview);
    return true;
  }
  const filename = isPreview ? "script.preview.js" : "script.js";
  const filePath = path.join(CDN_STORAGE_PATH, siteId, filename);
  try {
    await fs.unlink(filePath);
  } catch (_) {}
  const siteDir = path.join(CDN_STORAGE_PATH, siteId);
  try {
    const files = await fs.readdir(siteDir);
    if (files.length === 0) await fs.rmdir(siteDir);
  } catch (_) {}
  return true;
}

export { R2_CONFIGURED };
