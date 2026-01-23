# Troubleshooting Guide

## Login Not Working on Server (But Works Locally)

If login works locally but not on the server, even with the same database, check the following:

### 1. Environment Variables

**Critical:** Ensure these environment variables are set correctly on your server:

```env
# Required for NextAuth
NEXTAUTH_SECRET="your-secret-here"  # MUST be the same on local and server, or generate a new one
NEXTAUTH_URL="https://your-production-domain.com"  # Your production URL

# Database
DATABASE_URL="your-database-connection-string"

# Optional but recommended
NEXT_PUBLIC_BASE_URL="https://your-production-domain.com"
```

**Important Notes:**
- `NEXTAUTH_SECRET` must be the **same** on both local and server, OR you need to regenerate it
- `NEXTAUTH_URL` must match your production domain exactly (with https://)
- Check for typos or extra spaces in environment variables

### 2. Check Server Logs

After adding the enhanced logging, check your server logs when attempting to login. You should see:

```
[NextAuth] Attempting login for: user@example.com
[NextAuth] Verifying password for: user@example.com
[NextAuth] Login successful for: user@example.com
```

If you see errors, they will help identify the issue:
- `[NextAuth] User not found` - User doesn't exist in database
- `[NextAuth] Invalid password` - Password mismatch
- `[getUserByEmail] Database error` - Database connection issue

### 3. Database Connection

Even if using the same database, verify:
- Database connection string is correct on server
- Database is accessible from server (not blocked by firewall)
- Database credentials are correct
- Connection pool limits aren't exceeded

### 4. Cookie/Session Issues

If password verification works but session doesn't persist:

**Check cookie settings:**
- Ensure `NEXTAUTH_URL` is set correctly
- For HTTPS, cookies need `secure: true` (automatically set in production)
- Check browser console for cookie errors

**Common cookie issues:**
- Domain mismatch (localhost vs production domain)
- SameSite policy blocking cookies
- Secure flag required for HTTPS

### 5. Verify Environment Variables on Server

**For Vercel:**
1. Go to Project Settings → Environment Variables
2. Verify all variables are set
3. Ensure they're set for "Production" environment
4. Redeploy after adding/changing variables

**For other platforms:**
- Check your hosting platform's environment variable settings
- Ensure variables are loaded before the app starts
- Restart the application after changing variables

### 6. Test Database Query Directly

To verify the database connection works, you can temporarily add a test endpoint:

```javascript
// src/app/api/test-db/route.js
import { getUserByEmail } from '@/lib/auth';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get('email');
  
  if (!email) {
    return Response.json({ error: 'Email required' }, { status: 400 });
  }
  
  try {
    const user = await getUserByEmail(email);
    return Response.json({ 
      found: !!user,
      hasPassword: !!user?.password,
      email: user?.email 
    });
  } catch (error) {
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
}
```

Then test: `https://your-domain.com/api/test-db?email=your-email@example.com`

### 7. Common Issues and Solutions

| Issue | Solution |
|-------|----------|
| "Invalid credentials" but password is correct | Check `NEXTAUTH_SECRET` matches between local/server |
| Login works but session doesn't persist | Check `NEXTAUTH_URL` is set correctly |
| Database connection timeout | Verify `DATABASE_URL` and network access |
| Cookies not being set | Check domain, secure flag, and SameSite settings |
| Different errors in logs | Check server logs for specific error messages |

### 8. Quick Checklist

- [ ] `NEXTAUTH_SECRET` is set and same on both environments (or regenerated)
- [ ] `NEXTAUTH_URL` is set to your production URL
- [ ] `DATABASE_URL` is correct and accessible
- [ ] Environment variables are loaded (restart server after changes)
- [ ] No typos in environment variable names
- [ ] Database connection is working (test with test endpoint)
- [ ] Server logs show detailed error messages
- [ ] Browser console shows no cookie errors

### 9. Still Not Working?

1. **Check server logs** - The enhanced logging will show exactly where it fails
2. **Compare environment variables** - Ensure they match between local and server
3. **Test database connection** - Use the test endpoint above
4. **Check NextAuth debug mode** - Set `debug: true` in authOptions (already enabled in dev)
5. **Verify user exists** - Check database directly to confirm user and password hash

### 10. Reset and Test

If all else fails:

1. Create a new test user on the server
2. Try logging in with that user
3. If it works, the issue is with the specific user account
4. If it doesn't, the issue is with the environment/configuration
