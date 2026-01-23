# Vercel Deployment Guide

## Running Database Migrations on Vercel

When deploying to Vercel, database migrations need to be run. Here are the options:

### Option 1: Automatic Migration (Recommended)

The build script has been updated to automatically run migrations during deployment:

```json
"build": "prisma generate && prisma migrate deploy && next build"
```

This means:
1. `prisma generate` - Generates Prisma Client
2. `prisma migrate deploy` - Applies pending migrations
3. `next build` - Builds your Next.js app

**Vercel will automatically run this during deployment.**

### Option 2: Manual Migration via Vercel CLI

If you need to run migrations manually:

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Link your project** (if not already linked):
   ```bash
   vercel link
   ```

4. **Run migration command**:
   ```bash
   vercel env pull .env.local  # Pull environment variables
   npx prisma migrate deploy
   ```

### Option 3: Run Migration via Vercel Dashboard

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Functions**
3. You can add a build command that includes migrations

### Option 4: One-Time Migration via Vercel CLI

Run this command to execute migrations on your production database:

```bash
# Make sure DATABASE_URL is set in Vercel environment variables
vercel env pull .env.local
npx prisma migrate deploy
```

## Environment Variables on Vercel

Make sure these are set in **Vercel Dashboard** → **Settings** → **Environment Variables**:

### Required Variables:
- `DATABASE_URL` - Your PostgreSQL connection string
- `NEXTAUTH_SECRET` - Generate with: `openssl rand -base64 32`
- `NEXTAUTH_URL` - Your Vercel app URL (e.g., `https://your-app.vercel.app`)
- `NEXT_PUBLIC_BASE_URL` - Same as NEXTAUTH_URL

### Optional Variables:
- `RAZORPAY_KEY_ID` - For payment processing
- `RAZORPAY_KEY_SECRET` - For payment processing
- `NEXTAUTH_SESSION_MAX_AGE` - Session expiry (optional)
- `NEXTAUTH_JWT_MAX_AGE` - JWT expiry (optional)

## Deployment Steps

1. **Push your code to GitHub/GitLab/Bitbucket**

2. **Connect to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Import your repository
   - Vercel will detect Next.js automatically

3. **Set Environment Variables**:
   - Add all required environment variables in Vercel dashboard
   - Make sure `DATABASE_URL` is correct

4. **Deploy**:
   - Vercel will automatically:
     - Run `npm install`
     - Run the build script (which includes migrations)
     - Deploy your app

5. **Verify Migration**:
   - Check the build logs in Vercel dashboard
   - You should see: `Applied migration: 20260123122530_add_admin_field`

## Troubleshooting

### Migration Fails During Build

If migrations fail during build:

1. **Check Build Logs**:
   - Go to Vercel Dashboard → Your Project → Deployments
   - Click on the failed deployment
   - Check the build logs for Prisma errors

2. **Common Issues**:
   - `DATABASE_URL` not set or incorrect
   - Database not accessible from Vercel
   - Migration already applied (safe to ignore)

3. **Manual Fix**:
   ```bash
   # Pull environment variables
   vercel env pull .env.local
   
   # Run migration manually
   npx prisma migrate deploy
   
   # Redeploy
   vercel --prod
   ```

### Migration Already Applied Error

If you see "Migration already applied", it's safe to ignore. The migration has already been run.

### Database Connection Issues

- Verify `DATABASE_URL` is correct in Vercel environment variables
- Check if your database allows connections from Vercel's IPs
- For Neon, Supabase, etc., make sure the connection string includes SSL parameters

## Quick Migration Command

If you just need to run the migration once:

```bash
# Install Vercel CLI (if needed)
npm i -g vercel

# Login
vercel login

# Pull environment variables
vercel env pull .env.local

# Run migration
npx prisma migrate deploy

# Verify
npx prisma studio  # Optional: to check database
```

## Important Notes

- **Never run `prisma migrate dev` in production** - Use `prisma migrate deploy` instead
- The build script now automatically runs migrations, so you don't need to do anything manually
- If migrations fail, check the Vercel build logs for specific errors
- Make sure your database is accessible from Vercel's servers

## Current Migration Status

After deploying, check if the `isAdmin` column exists:

```sql
-- Run this in your database to verify
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'isAdmin';
```

If the column exists, the migration was successful!
