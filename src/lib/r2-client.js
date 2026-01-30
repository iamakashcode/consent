/**
 * Cloudflare R2 client (S3-compatible API)
 * Used for storing and serving generated consent scripts via R2 + Cloudflare CDN.
 */

import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getScriptPath } from "./script-urls";

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucket = process.env.R2_BUCKET_NAME;
const publicUrl = process.env.R2_PUBLIC_URL || process.env.NEXT_PUBLIC_R2_PUBLIC_URL;

export const R2_CONFIGURED =
  !!accountId && !!accessKeyId && !!secretAccessKey && !!bucket && !!publicUrl;

let _client = null;

function getClient() {
  if (!R2_CONFIGURED) return null;
  if (_client) return _client;
  _client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
  return _client;
}

function key(siteId, isPreview) {
  return getScriptPath(siteId, isPreview);
}

/**
 * Upload a script to R2.
 */
export async function r2Upload(siteId, content, isPreview = false) {
  const client = getClient();
  if (!client) throw new Error("R2 not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL in your environment.");

  const k = key(siteId, isPreview);
  try {
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: k,
        Body: content,
        ContentType: "application/javascript; charset=utf-8",
        CacheControl: isPreview
          ? "no-cache, no-store, must-revalidate"
          : "public, max-age=31536000, immutable",
      })
    );
    return k;
  } catch (e) {
    const msg = e.message || String(e);
    const code = e.name || e.$metadata?.httpStatusCode || "";
    console.error("[R2] Upload failed:", { key: k, bucket, error: msg, code });
    throw new Error(`R2 upload failed: ${msg}${code ? ` (${code})` : ""}. Check R2 credentials, bucket name, and API token permissions.`);
  }
}

/**
 * Get script content from R2. Returns null if not found.
 */
export async function r2Get(siteId, isPreview = false) {
  const client = getClient();
  if (!client) return null;

  try {
    const res = await client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key(siteId, isPreview),
      })
    );
    return await res.Body.transformToString("utf-8");
  } catch (e) {
    if (e.name === "NoSuchKey" || e.$metadata?.httpStatusCode === 404) return null;
    throw e;
  }
}

/**
 * Check if a script exists in R2.
 */
export async function r2Exists(siteId, isPreview = false) {
  const client = getClient();
  if (!client) return false;

  try {
    await client.send(
      new HeadObjectCommand({
        Bucket: bucket,
        Key: key(siteId, isPreview),
      })
    );
    return true;
  } catch (e) {
    if (e.name === "NotFound" || e.name === "NoSuchKey" || e.$metadata?.httpStatusCode === 404)
      return false;
    throw e;
  }
}

/**
 * Delete a script from R2. No error if object does not exist.
 */
export async function r2Delete(siteId, isPreview = false) {
  const client = getClient();
  if (!client) return;

  try {
    await client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: key(siteId, isPreview),
      })
    );
  } catch (e) {
    console.error(`[R2] Failed to delete ${key(siteId, isPreview)}:`, e.message);
  }
}

/**
 * Get the public CDN URL for a script (R2 public bucket or custom domain).
 */
export function r2PublicUrl(siteId, isPreview = false) {
  if (!publicUrl) return null;
  const base = publicUrl.replace(/\/$/, "");
  const path = getScriptPath(siteId, isPreview);
  return `${base}/${path}`;
}
