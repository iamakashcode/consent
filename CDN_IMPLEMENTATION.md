# CDN-Based Script Serving Implementation

## Overview

This implementation moves script serving from dynamic API generation to a CDN-based approach, significantly improving scalability and performance.

## Architecture

### How It Works

1. **Script Generation**: When banner configuration is saved, scripts are pre-generated and uploaded to CDN storage
2. **CDN Serving**: Scripts are served from CDN with aggressive caching headers
3. **Fallback**: If CDN file doesn't exist, falls back to dynamic generation via API route

### File Structure

```
public/
  cdn/
    sites/
      {siteId}/
        script.js          # Production script
        script.preview.js  # Preview script
```

## Components

### 1. CDN Service (`src/lib/cdn-service.js`)
- Handles file system storage (can be migrated to S3/R2/Blob later)
- Provides functions: `uploadScript()`, `getScript()`, `scriptExists()`, `deleteScript()`
- Generates CDN URLs: `/cdn/sites/{siteId}/script.js`

### 2. Script Generator (`src/lib/script-generator.js`)
- Generates scripts using the same logic as the API route
- Uploads generated scripts to CDN
- Triggered automatically on config changes

### 3. CDN Routes (`src/app/cdn/sites/[siteId]/`)
- Serves pre-generated scripts from CDN
- Falls back to API route if file doesn't exist
- Sets proper cache headers (immutable for production, no-cache for preview)

### 4. Updated API Route (`src/app/api/script/[siteId]/route.js`)
- First tries to serve from CDN
- Falls back to dynamic generation if CDN file missing
- Maintains backward compatibility

### 5. Banner Config Endpoint (`src/app/api/sites/[siteId]/banner/route.js`)
- Triggers script regeneration on config save
- Runs asynchronously (doesn't block config save)

## Environment Variables

Add to `.env`:

```env
# CDN Configuration
CDN_BASE_URL=https://cdn.consentflow.com  # Optional: Custom CDN domain
CDN_STORAGE_PATH=./public/cdn/sites       # Optional: Storage path (default)

# Base URL for API endpoints (used in generated scripts)
NEXT_PUBLIC_BASE_URL=https://consent-silk.vercel.app
```

## URL Structure

### Production Script
```
https://yourdomain.com/cdn/sites/{siteId}/script.js
```

### Preview Script
```
https://yourdomain.com/cdn/sites/{siteId}/script.preview.js
```

### Fallback (Dynamic)
```
https://yourdomain.com/api/script/{siteId}
```

## Cache Headers

- **Production**: `Cache-Control: public, max-age=31536000, immutable`
- **Preview**: `Cache-Control: no-cache, no-store, must-revalidate`

## Benefits

1. **Performance**: Scripts served from CDN edge locations
2. **Scalability**: No database queries on every request
3. **Cost**: Reduced server compute and database load
4. **Reliability**: CDN provides better uptime than single API endpoint

## Migration Path

1. ✅ Scripts are generated on config save
2. ✅ CDN routes serve pre-generated scripts
3. ✅ API route falls back to dynamic generation
4. ✅ Dashboard shows CDN URLs

## Future Enhancements

1. **Cloud Storage**: Migrate from file system to S3/R2/Blob
2. **CDN Purge**: Add API to invalidate CDN cache
3. **Versioning**: Add version numbers to script URLs for cache busting
4. **Monitoring**: Track CDN hit/miss rates

## Testing

1. Save banner configuration
2. Check that script is generated in `public/cdn/sites/{siteId}/script.js`
3. Access script via CDN URL: `/cdn/sites/{siteId}/script.js`
4. Verify cache headers are set correctly
5. Test fallback by deleting CDN file and accessing URL

## Notes

- CDN files are stored in `public/cdn` directory (served by Next.js)
- For production, consider using a dedicated CDN (Cloudflare, AWS CloudFront, etc.)
- Scripts are regenerated automatically on every config save
- Preview mode still uses dynamic generation for custom configs
