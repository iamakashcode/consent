# Vercel Deployment Guide

## Database Migrations

Due to database connection timeouts during Vercel builds, migrations are **not** run automatically during the build process.

### Option 1: Run Migrations Manually (Recommended)

After deploying to Vercel, run migrations manually:

```bash
# Set your DATABASE_URL environment variable
export DATABASE_URL="your-database-url"

# Run migrations
npx prisma migrate deploy
```

Or use Vercel CLI:
```bash
vercel env pull .env.local
npx prisma migrate deploy
```

### Option 2: Use Prisma DB Push (Faster, but less safe)

If you need to sync schema quickly without migrations:

```bash
npx prisma db push
```

**Note:** `db push` can be destructive and doesn't track migration history. Use with caution in production.

### Option 3: Run Migrations via API Endpoint

Create a protected API endpoint to run migrations:

```bash
# Call this endpoint after deployment
curl -X POST https://yourdomain.com/api/migrate \
  -H "Authorization: Bearer YOUR_SECRET_TOKEN"
```

## Environment Variables

Make sure to set these in Vercel Dashboard → Settings → Environment Variables:

- `DATABASE_URL` - Your PostgreSQL connection string
- `NEXTAUTH_SECRET` - Random secret for NextAuth
- `NEXTAUTH_URL` - Your production URL (e.g., https://yourdomain.com)
- `RAZORPAY_KEY_ID` - Your Razorpay key ID
- `RAZORPAY_KEY_SECRET` - Your Razorpay secret key
- `RAZORPAY_WEBHOOK_SECRET` - Razorpay webhook secret (optional)
- `CRON_SECRET` - Secret for cron job authentication (optional)

## Build Process

The build process now:
1. Generates Prisma Client (`prisma generate`) - Fast, no DB connection needed
2. Builds Next.js app (`next build`)

Migrations should be run separately after deployment.
