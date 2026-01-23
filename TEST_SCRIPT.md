# Testing the Consent Script

## Common Issues and Solutions

### 1. Banner Not Showing

**Possible Causes:**
- Script not loaded properly
- Consent already granted (stored in localStorage)
- Script placed in wrong location
- JavaScript errors preventing execution

**Solutions:**

1. **Clear localStorage:**
   - Open browser console (F12)
   - Run: `localStorage.clear()`
   - Refresh the page

2. **Check Script Placement:**
   - Script should be in `<head>` section
   - Should be placed BEFORE any tracking scripts (Google Analytics, GTM, etc.)
   - Example:
   ```html
   <head>
     <script src="http://localhost:3000/api/script/YOUR_SITE_ID?domain=yourdomain.com"></script>
     <!-- Other scripts go here -->
   </head>
   ```

3. **Check Browser Console:**
   - Open Developer Tools (F12)
   - Look for messages starting with `[Consent SDK]`
   - Check for any JavaScript errors

4. **Verify Script is Loading:**
   - Open Network tab in Developer Tools
   - Look for the script request
   - Check if it returns 200 status
   - Verify the response is JavaScript

5. **Test on Simple HTML Page:**
   ```html
   <!DOCTYPE html>
   <html>
   <head>
     <title>Test Consent Script</title>
     <script src="YOUR_SCRIPT_URL"></script>
   </head>
   <body>
     <h1>Test Page</h1>
     <p>Check if banner appears at bottom of page</p>
   </body>
   </html>
   ```

## Debugging Steps

1. **Check Console Logs:**
   - Should see: `[Consent SDK] Loading...`
   - Should see: `[Consent SDK] Consent status: false`
   - Should see: `[Consent SDK] Banner shown successfully`

2. **Check localStorage:**
   - Open console
   - Run: `localStorage.getItem('cookie_consent_YOUR_SITE_ID')`
   - Should return `null` if consent not granted
   - Should return `'accepted'` if consent granted

3. **Check DOM:**
   - Open Elements/Inspector tab
   - Look for element with id `cookie-banner`
   - Should be at bottom of `<body>`

## Script URL Format

```
http://localhost:3000/api/script/SITE_ID?domain=yourdomain.com
```

Replace:
- `SITE_ID` with your actual site ID from profile
- `yourdomain.com` with your actual domain

## If Banner Still Doesn't Show

1. Check browser console for errors
2. Verify script URL is correct
3. Try in incognito/private window
4. Clear browser cache
5. Check if ad blockers are interfering
6. Verify the script endpoint is accessible
