# Script Behavior: Domains & Subscription

## 1. Does the script work on different domains or only the domain it was created for?

**Only the domain it was created for** (plus its subdomains).

- When you add a domain (e.g. `desirediv.com`) and get the script, the script is generated with that domain baked in as **ALLOWED_DOMAIN** (from your database).
- In the browser the script compares:
  - **Current site:** `location.hostname` (e.g. `otherdomain.com`)
  - **Allowed:** the domain you added (e.g. `desirediv.com`)
- If they don’t match (and the current host is not a subdomain of the allowed domain), the script:
  - Logs: `[ConsentFlow] DOMAIN MISMATCH: Script configured for "desirediv.com" but running on "otherdomain.com". Script disabled.`
  - Exits: blocker and banner do nothing.
- **Subdomains:** If the script is for `desirediv.com`, it also runs on `www.desirediv.com`, `app.desirediv.com`, etc., because the check allows `currentHost.endsWith('.' + allowedHost)`.

So the script does **not** work on unrelated domains; it only runs on the configured domain and its subdomains.

---

## 2. What happens if the user’s subscription expires or payment fails? Does the script still work or stop?

It depends **how** the site loads the script.

### If the site uses the **R2 / CDN URL** (recommended install code)

- Example: `https://pub-xxx.r2.dev/sites/{siteId}/script.js`
- The script file is served **directly by Cloudflare R2**. Your app does not sit in front of that request.
- There is **no subscription check** when serving from R2.
- The script file is **not removed** from R2 when a subscription expires or payment fails.
- **Result:** The script **continues to work** (banner, consent, tracker blocking) even after subscription is expired or payment has failed. Visitors still get the same script from R2.

### If the site uses the **API URL** (e.g. `/api/script/{siteId}`)

- Used when you don’t use R2 or as a fallback.
- When your server **dynamically generates** the script (e.g. script not found in CDN and we generate on the fly), it checks **subscription status**.
- If the subscription is **inactive** (expired, payment failed, etc.), the API returns **403** and a small script that only logs:  
  `[Consent SDK] Access denied: Subscription inactive for this domain. <reason>`
- **Result:** In that case the script **effectively stops working** for new visitors (they get the error script instead of the real consent script). Cached responses may still work until cache expires.

### Summary

| How script is loaded              | After subscription expired / payment failed |
|-----------------------------------|---------------------------------------------|
| **R2 / CDN URL** (install code)   | **Script keeps working** (served from R2, no check, file stays) |
| **API URL** (dynamic generation)  | **Script stops working** for new requests (403 + error script) |

So: with the **R2-based install code** you give to users, the script keeps working even when the subscription has expired or payment has failed. To enforce “no script when unpaid”, you would need extra logic (e.g. stop redirecting to R2 when inactive, or remove/block the object in R2 when subscription lapses).
