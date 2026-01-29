# Script Creation & CDN Flow

## Overview

Each **domain** is represented by a **site** in the database. Each site has a unique `siteId`. **Yes, every domain has its own script file(s)** — one per `siteId`.

---

## 1. Where Scripts Are Stored

**File system path:** `public/cdn/sites/{siteId}/`

```
public/
  cdn/
    sites/
      MTc2OTcwMDYwMjE2OS05TRSMXVhdmN3Yg/   ← one folder per site (domain)
        script.js                           ← production script
        script.preview.js                   ← preview script (optional)
      ANOTHER_SITE_ID/
        script.js
        script.preview.js
```

- **`siteId`** = unique ID for a site (e.g. `MTc2OTcwMDYwMjE2OS05TRSMXVhdmN3Yg`). One site = one domain.
- **`script.js`** = production consent script (blocker + banner). Used on the customer’s live site.
- **`script.preview.js`** = preview version (domain checks relaxed). Used in the Live Preview iframe.

Storage is under `public/` so Next.js can serve it. Default root is `process.cwd()/public/cdn/sites` unless you set `CDN_STORAGE_PATH`.

---

## 2. Flow: When Is a Script Created?

```
User saves banner config (colors, text, position, etc.)
         │
         ▼
PUT /api/sites/[siteId]/banner
         │
         ├─► 1. Update site.bannerConfig in DB (Prisma)
         │
         └─► 2. Call regenerateScriptOnConfigChange(siteId)
                    │
                    ├─► generateAndUploadScript(siteId, { isPreview: false })
                    │       → writes public/cdn/sites/{siteId}/script.js
                    │
                    └─► generateAndUploadScript(siteId, { isPreview: true })
                            → writes public/cdn/sites/{siteId}/script.preview.js
```

So **scripts are created/updated when the user saves banner configuration**. Regeneration runs in the background (async); the API response doesn’t wait for it.

---

## 3. How Data Is Fetched for Script Generation

When **generating** a script, all data comes from the **database** (Prisma):

| Data | Source | Used for |
|------|--------|----------|
| `siteId`, `domain` | `Site` | Script identity, domain validation in script |
| `bannerConfig` | `Site.bannerConfig` | Colors, text, position, template, etc. |
| `subscription` | `Site.subscription` | Check if site is active (production only) |
| `NEXT_PUBLIC_BASE_URL` | Env | Base URL for verify-callback & track APIs |

**Flow:**

1. **`generateAndUploadScript(siteId, options)`** in `src/lib/script-generator.js`
2. **`prisma.site.findUnique({ where: { siteId }, include: { subscription: true } })`**
3. Use `site.domain`, `site.bannerConfig`, `DEFAULT_BANNER_CONFIG`, `BANNER_TEMPLATES` to build:
   - **inline blocker** (tracker blocking, domain check)
   - **main script** (banner UI, consent, verify callback, tracking)
4. **`uploadScript(siteId, fullScript, isPreview)`** in `src/lib/cdn-service.js` → `fs.writeFile(...)` to `public/cdn/sites/{siteId}/script.js` or `script.preview.js`.

No user-specific or domain-specific data is read from query params for generation; it’s all from DB + env.

---

## 4. How Scripts Are Served (Managed)

Two ways the app can serve the script:

### A. CDN route (preferred): `/cdn/sites/[siteId]/script.js`

```
GET /cdn/sites/{siteId}/script.js
         │
         ▼
CDN route (src/app/cdn/sites/[siteId]/script.js/route.js)
         │
         ├─► getScript(siteId, isPreview) from cdn-service
         │       → fs.readFile(public/cdn/sites/{siteId}/script.js)
         │
         ├─► If file exists → return script + cache headers
         │
         └─► If not found → 307 redirect to /api/script/{siteId}
```

- **Production:** `Cache-Control: public, max-age=31536000, immutable`
- **Preview:** `Cache-Control: no-cache, no-store, must-revalidate`

### B. API route (fallback + dynamic): `/api/script/[siteId]`

```
GET /api/script/{siteId}?preview=1&config=...
         │
         ▼
Script API (src/app/api/script/[siteId]/route.js)
         │
         ├─► Try getScript(siteId, isPreview) from CDN first
         │   If found → return that (same as CDN route)
         │
         └─► If not in CDN (or preview with custom config):
                 │
                 ├─► Fetch site from DB (Prisma)
                 ├─► Check subscription (for non-preview)
                 ├─► Generate script on the fly (same functions as script-generator)
                 └─► Return generated script (no write to disk)
```

So **script management** = “prefer CDN file if it exists, otherwise generate dynamically and return (without storing).”

---

## 5. End-to-End Flow Summary

```
┌─────────────────────────────────────────────────────────────────────────┐
│  CREATION (when user saves banner config)                                │
└─────────────────────────────────────────────────────────────────────────┘

  Banner Customization → Save
         │
         ▼
  PUT /api/sites/[siteId]/banner
         │
         ├─► DB: update site.bannerConfig
         └─► regenerateScriptOnConfigChange(siteId)
                   │
                   ├─► DB: fetch site + subscription
                   ├─► Generate script (blocker + banner) from site + config
                   └─► uploadScript() → write to public/cdn/sites/{siteId}/
                             • script.js
                             • script.preview.js


┌─────────────────────────────────────────────────────────────────────────┐
│  SERVING (when a visitor loads the script on a website)                  │
└─────────────────────────────────────────────────────────────────────────┘

  <script src="https://your-app.com/cdn/sites/{siteId}/script.js"></script>
         │
         ▼
  GET /cdn/sites/{siteId}/script.js
         │
         ├─► File exists? → read from disk → return with cache headers
         └─► Missing?     → redirect to /api/script/{siteId}
                                   │
                                   └─► Generate from DB → return (optional: try CDN first)
```

---

## 6. Visitor Flow: What Happens When Someone Visits a Site With Your Script?

When a **visitor** loads a page that has your script (`<script src=".../cdn/sites/{siteId}/script.js"></script>`), three things happen:

### Step 1: Browser fetches the script (`.js` file)

| Scenario | Request | Database? | API? |
|----------|---------|-----------|------|
| **CDN file exists** (normal case) | `GET /cdn/sites/{siteId}/script.js` | **No** | Request hits your server; we **read from disk** (`fs.readFile`) and return the file. No DB. |
| **CDN file missing** (fallback) | Redirect → `GET /api/script/{siteId}` | **Yes** | We fetch site from DB, generate script, return it. |

So for **script delivery**: usually **no database**. Only if the CDN file is missing do we use the DB (and the API route).

---

### Step 2: Script runs → page view tracking

The script **always** calls (unless it’s preview mode):

```
POST /api/sites/{siteId}/track
```

- **Database:** **Yes.** We look up the site, then create a `PageView` row (page path, title, user agent, referer, etc.).
- **API:** **Yes.** This is an API route; the request hits your backend.

So **every page load** (with the script) → **one POST to `/track`** → **one DB write** (page view).

---

### Step 3: Script runs → domain verification

The script also calls:

```
GET /api/sites/{siteId}/verify-callback?domain=...
```

- **Database:** **Yes.** We load the site, check domain, update verification status (`isVerified`, `lastSeenAt`, etc.) if it matches.
- **API:** **Yes.** Again, an API route.

This runs **on every page load** (script retries on failure). So **every visit** → **one GET to verify-callback** → **DB read + often DB write**.

---

### Summary: When a visitor lands on a page with your script

| What | Database called? | API / server hit? |
|------|------------------|--------------------|
| **1. Fetch script** (`/cdn/.../script.js`) | No (if file exists) / Yes (if fallback) | Yes — we serve the `.js` |
| **2. Page view** (`POST /track`) | Yes — we create `PageView` | Yes |
| **3. Verification** (`GET /verify-callback`) | Yes — we read/update site | Yes |

So **overall:** your **API is called** (script fetch + track + verify-callback), and your **database is used** for tracking and verification. For the script file itself, we usually just read from disk; DB is used only when we fall back to generating the script.

---

### Optional: Reduce DB/API load

- **Script fetch:** Use a **real CDN** (e.g. Cloudflare, Vercel Edge) in front of ` /cdn/sites/.../script.js`. Then the script is often served from the CDN cache, and your app/server is hit less.
- **Track + verify-callback:** These always hit your API and DB. To scale, you’d need to optimize those endpoints (e.g. batching, background jobs, or different storage).

---

## 7. “Is Every Domain Their Own File?”

**Yes.** Each domain = one site = one `siteId` = one folder:

- `public/cdn/sites/{siteId}/script.js`
- `public/cdn/sites/{siteId}/script.preview.js`

Different domains → different `siteId` → different folders and files. Script content is tailored per site (domain, banner config, template, etc.).

---

## 8. Key Files Reference

| File | Role |
|------|------|
| `src/lib/cdn-service.js` | Read/write/delete scripts under `public/cdn/sites/`, `getCdnUrl()` |
| `src/lib/script-generator.js` | Fetch site from DB, generate script, call `uploadScript` |
| `src/app/api/sites/[siteId]/banner/route.js` | Save config, trigger `regenerateScriptOnConfigChange` |
| `src/app/api/script/[siteId]/route.js` | Generate script logic, export `generateInlineBlocker` & `generateMainScript`; also serves script (CDN first, then dynamic) |
| `src/app/cdn/sites/[siteId]/script.js/route.js` | Serve `script.js` from CDN, redirect to API if missing |

---

## 9. Optional: Custom CDN Base URL

If you use a separate CDN domain:

- Set `CDN_BASE_URL` (e.g. `https://cdn.example.com`).  
- `getCdnUrl()` uses it so CDN URLs point to your CDN instead of the app origin.  
- Script **storage** stays in `public/cdn/sites/` (or `CDN_STORAGE_PATH`); only the **URL** changes.
