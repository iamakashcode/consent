# Running Prisma Migrations on Vercel

## Automatic Migration (Recommended)

Migrations run automatically during Vercel builds because the `build` script in `package.json` includes:

```json
"build": "prisma generate && prisma migrate deploy && next build"
```

This means every time you deploy to Vercel, migrations will be applied automatically.

## Manual Migration (If Needed)

If you need to run migrations manually on Vercel, you have several options:

### Option 1: Using Vercel CLI (Recommended)

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Link your project:
```bash
vercel link
```

3. Run migration command:
```bash
vercel env pull .env.local
npx prisma migrate deploy
```

### Option 2: Using Vercel Dashboard

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Make sure `DATABASE_URL` is set correctly
4. Go to **Deployments** tab
5. Click on the latest deployment
6. Open the **Functions** tab
7. You can't directly run commands, but you can trigger a new deployment

### Option 3: Using Vercel CLI with Remote Execution

You can't directly SSH into Vercel, but you can:

1. Create a temporary API route to run migrations:
   - Create `src/app/api/migrate/route.js` (see below)
   - Call it once: `https://your-app.vercel.app/api/migrate`
   - Delete the route after use

2. Or use Vercel's build logs to see if migrations ran successfully

### Option 4: Direct Database Connection

If you have direct access to your PostgreSQL database:

1. Connect to your database using any PostgreSQL client
2. Run the migration SQL directly:
```sql
-- Copy the contents of prisma/migrations/20260123144228_add_domain_verification/migration.sql
-- and run it in your database
```

## Troubleshooting

### Migration Fails During Build

If migrations fail during Vercel build:

1. Check build logs in Vercel dashboard
2. Verify `DATABASE_URL` environment variable is set correctly
3. Ensure database is accessible from Vercel's IP addresses
4. Check if migration SQL has syntax errors

### Columns Still Missing After Migration

If columns are still missing:

1. Check if migration was actually applied:
```sql
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'sites' 
AND column_name IN ('isVerified', 'verificationToken', 'verifiedAt');
```

2. If columns don't exist, manually run the migration SQL

3. Or create a temporary migration route (see Option 3 above)

## Current Migration Status

To check if the current migration has been applied:

```sql
SELECT * FROM "_prisma_migrations" 
WHERE migration_name = '20260123144228_add_domain_verification';
```

If this returns a row, the migration has been applied.

## Quick Fix Script

If you need to quickly add the missing columns, you can run this SQL directly in your database:

```sql
-- Add columns if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='sites' AND column_name='isVerified') THEN
        ALTER TABLE "sites" ADD COLUMN "isVerified" BOOLEAN NOT NULL DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='sites' AND column_name='verificationToken') THEN
        ALTER TABLE "sites" ADD COLUMN "verificationToken" TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='sites' AND column_name='verifiedAt') THEN
        ALTER TABLE "sites" ADD COLUMN "verifiedAt" TIMESTAMP(3);
    END IF;
END $$;

-- Generate verification tokens for existing sites
UPDATE "sites" 
SET "verificationToken" = 'cm_' || EXTRACT(EPOCH FROM NOW())::TEXT || '_' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 13) 
WHERE "verificationToken" IS NULL;
```

## Next Steps

1. **Push your changes** to trigger a new Vercel deployment
2. **Check build logs** to ensure migrations ran successfully
3. **Verify columns exist** by checking the database or testing the API
4. **Remove fallback code** once migration is confirmed working
