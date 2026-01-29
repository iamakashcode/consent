/**
 * CDN Service for Script Storage
 * 
 * This service handles uploading and serving scripts from CDN.
 * Currently uses file system storage (can be migrated to S3/R2/Blob later)
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CDN base URL - can be configured via environment variable
const CDN_BASE_URL = process.env.CDN_BASE_URL || process.env.NEXT_PUBLIC_BASE_URL || '';
const CDN_STORAGE_PATH = process.env.CDN_STORAGE_PATH || path.join(process.cwd(), 'public', 'cdn', 'sites');

/**
 * Ensure CDN storage directory exists
 */
async function ensureStorageDir() {
  try {
    await fs.mkdir(CDN_STORAGE_PATH, { recursive: true });
  } catch (error) {
    console.error('[CDN] Failed to create storage directory:', error);
    throw error;
  }
}

/**
 * Get CDN URL for a site's script
 */
export function getCdnUrl(siteId, isPreview = false) {
  const filename = isPreview ? 'script.preview.js' : 'script.js';
  const cdnPath = `/cdn/sites/${siteId}/${filename}`;
  
  if (CDN_BASE_URL) {
    return `${CDN_BASE_URL}${cdnPath}`;
  }
  
  // Fallback to relative URL
  return cdnPath;
}

/**
 * Upload script to CDN storage
 */
export async function uploadScript(siteId, scriptContent, isPreview = false) {
  try {
    await ensureStorageDir();
    
    const siteDir = path.join(CDN_STORAGE_PATH, siteId);
    await fs.mkdir(siteDir, { recursive: true });
    
    const filename = isPreview ? 'script.preview.js' : 'script.js';
    const filePath = path.join(siteDir, filename);
    
    await fs.writeFile(filePath, scriptContent, 'utf-8');
    
    const cdnUrl = getCdnUrl(siteId, isPreview);
    
    console.log(`[CDN] Script uploaded: ${filePath} -> ${cdnUrl}`);
    
    return {
      success: true,
      url: cdnUrl,
      path: filePath,
    };
  } catch (error) {
    console.error(`[CDN] Failed to upload script for site ${siteId}:`, error);
    throw error;
  }
}

/**
 * Check if script exists in CDN
 */
export async function scriptExists(siteId, isPreview = false) {
  try {
    const filename = isPreview ? 'script.preview.js' : 'script.js';
    const filePath = path.join(CDN_STORAGE_PATH, siteId, filename);
    
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get script from CDN storage
 */
export async function getScript(siteId, isPreview = false) {
  try {
    const filename = isPreview ? 'script.preview.js' : 'script.js';
    const filePath = path.join(CDN_STORAGE_PATH, siteId, filename);
    
    const content = await fs.readFile(filePath, 'utf-8');
    return content;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null; // Script not found
    }
    throw error;
  }
}

/**
 * Delete script from CDN storage
 */
export async function deleteScript(siteId, isPreview = false) {
  try {
    const filename = isPreview ? 'script.preview.js' : 'script.js';
    const filePath = path.join(CDN_STORAGE_PATH, siteId, filename);
    
    await fs.unlink(filePath).catch(() => {
      // Ignore if file doesn't exist
    });
    
    // Clean up directory if empty
    const siteDir = path.join(CDN_STORAGE_PATH, siteId);
    try {
      const files = await fs.readdir(siteDir);
      if (files.length === 0) {
        await fs.rmdir(siteDir);
      }
    } catch {
      // Ignore errors
    }
    
    return true;
  } catch (error) {
    console.error(`[CDN] Failed to delete script for site ${siteId}:`, error);
    return false;
  }
}
