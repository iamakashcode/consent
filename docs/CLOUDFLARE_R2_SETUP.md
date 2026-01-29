# Cloudflare R2 + CDN Setup

Scripts are stored in **Cloudflare R2** and served via **Cloudflare CDN** when R2 is configured.

---

## 1. Create R2 bucket

1. Open [Cloudflare Dashboard](https://dash.cloudflare.com) → **R2** → **Create bucket**.
2. Name it (e.g. `consent-scripts`).
3. Create the bucket.

---

## 2. Enable public access

- **Development:** use **Public access** → **Allow Access** → **R2.dev subdomain**.
  - You get a URL like `https://pub-<hash>.r2.dev`. Use this as `R2_PUBLIC_URL` and `NEXT_PUBLIC_R2_PUBLIC_URL`.
- **Production:** use a **Custom domain** (e.g. `cdn.yourdomain.com`) instead of r2.dev for proper CDN, WAF, etc.

---

## 3. Create API token (→ `R2_ACCESS_KEY_ID` & `R2_SECRET_ACCESS_KEY`)

These two env vars **do not exist** until you create an R2 API token. Create it like this:

1. **R2** → **Manage R2 API Tokens** (top right) → **Create API token**.
2. **Token name:** e.g. `consent-scripts`.
3. **Permissions:** **Object Read & Write** (or **Admin Read & Write**).
4. **Apply to:** this bucket only, or all buckets.
5. Click **Create API Token**.

On the next screen you’ll see:

- **Access Key ID** → use as `R2_ACCESS_KEY_ID`
- **Secret Access Key** → use as `R2_SECRET_ACCESS_KEY`

**Copy both immediately.** The Secret is shown only once. If you lose it, create a new token.

---

## 4. Get Account ID

**Cloudflare Dashboard** → **R2** → **Overview**. Use the **Account ID** from the right sidebar.

---

## 5. Environment variables

Add these to `.env` and to your deployment (e.g. Vercel):

```env
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_BUCKET_NAME=consent-scripts
R2_PUBLIC_URL=https://pub-xxxxx.r2.dev
NEXT_PUBLIC_R2_PUBLIC_URL=https://pub-xxxxx.r2.dev
```

- Use the **same** value for `R2_PUBLIC_URL` and `NEXT_PUBLIC_R2_PUBLIC_URL` (r2.dev or your custom domain).
- For a **custom domain**, use that base URL, e.g. `https://cdn.yourdomain.com`.

**Optional – bucket name in URL:**  
If you want the bucket name in the path (e.g. `…/cookie/sites/…/script.js`), set:

```env
R2_PUBLIC_PATH_PREFIX=cookie
NEXT_PUBLIC_R2_PATH_PREFIX=cookie
```

Use your actual bucket name. **Re-save the banner config** after adding this so scripts are uploaded to the new path.

---

## 6. Install deps and run

```bash
npm install   # installs @aws-sdk/client-s3 for R2
npm run dev
```

---

## 7. Flow

- **Save banner config** → script is generated and **uploaded to R2** (`sites/{siteId}/script.js` and `script.preview.js`).
- **Install code** uses `NEXT_PUBLIC_R2_PUBLIC_URL` when set → script is loaded **from R2 CDN**.
- **`/cdn/sites/{siteId}/script.js`** → if R2 is configured and the file exists, **redirects** to the R2 public URL; otherwise falls back to API or local CDN.

---

## 8. Optional: Custom domain (production)

1. Add a **custom domain** to your R2 bucket (e.g. `cdn.yourdomain.com`).
2. Point DNS to Cloudflare as instructed.
3. Set `R2_PUBLIC_URL` and `NEXT_PUBLIC_R2_PUBLIC_URL` to `https://cdn.yourdomain.com` (no trailing slash).
4. Scripts will be served from `https://cdn.yourdomain.com/sites/{siteId}/script.js`.

---

## 9. Without R2

If R2 env vars are **not** set, the app uses **local file storage** (`public/cdn/sites/`) and **`/cdn/sites/...`** URLs as before. No R2 or Cloudflare config required.

---

## 10. Troubleshooting: “Link not working” / 404

- **Bucket name not in the URL**  
  With r2.dev, the bucket name does **not** appear in the URL. The `pub-xxx.r2.dev` subdomain is tied to **one** bucket. If you want it in the path, set `R2_PUBLIC_PATH_PREFIX` / `NEXT_PUBLIC_R2_PATH_PREFIX` (see above).

- **`R2_BUCKET_NAME` and `R2_PUBLIC_URL` must match**  
  We upload to `R2_BUCKET_NAME` and serve from `R2_PUBLIC_URL`. The r2.dev URL you use **must** be the one for **that same bucket**.  
  1. In R2, open the **cookie** bucket → **Settings** → **Public access** → note the r2.dev URL.  
  2. Set `R2_BUCKET_NAME=cookie` and `R2_PUBLIC_URL` / `NEXT_PUBLIC_R2_PUBLIC_URL` to that exact URL.

- **Script not uploaded yet**  
  Scripts are uploaded **only when you save the banner config**. If you added a domain via the dashboard but never opened or saved the **Banner** page, the script was never uploaded to R2 → 404. Go to **Banner** → **Save** (defaults are fine) → then test the install link again.

- **Public access not enabled**  
  For the bucket you use, enable **Public access** → **Allow Access** → **R2.dev subdomain** (or custom domain).

- **Test the URL directly**  
  Open  
  `https://pub-xxx.r2.dev/sites/<your-site-id>/script.js`  
  (or `…/cookie/sites/…` if you use the path prefix). If you get 404, the object is missing (re-save banner) or the URL/bucket mismatch above applies.
