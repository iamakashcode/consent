# Setup Guide - Cookie Consent Manager SaaS

Follow these steps to get your project up and running.

## Prerequisites

- Node.js 18+ installed
- PostgreSQL database (local or cloud)
- npm or yarn package manager

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Set Up PostgreSQL Database

### Option A: Local PostgreSQL

1. Install PostgreSQL on your machine
2. Create a new database:
```bash
createdb consent
```

### Option B: Cloud Database (Recommended for Production)

Choose one:
- **Vercel Postgres**: https://vercel.com/docs/storage/vercel-postgres
- **Supabase**: https://supabase.com (Free tier available)
- **Railway**: https://railway.app (Free tier available)
- **Neon**: https://neon.tech (Free tier available)

Get your connection string (DATABASE_URL) from your provider.

## Step 3: Configure Environment Variables

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Open `.env` and fill in the values:

```env
# Database Connection
DATABASE_URL="postgresql://user:password@localhost:5432/consent?schema=public"
# Replace with your actual PostgreSQL connection string

# NextAuth Configuration
NEXTAUTH_URL="http://localhost:3000"
# For production, use your actual domain: https://yourdomain.com

# Generate a secret key (run this command):
# openssl rand -base64 32
NEXTAUTH_SECRET="your-generated-secret-key-here"

# App URL
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
# For production, use your actual domain: https://yourdomain.com
```

### Generate NEXTAUTH_SECRET

Run this command to generate a secure secret:

```bash
openssl rand -base64 32
```

Copy the output and paste it as `NEXTAUTH_SECRET` in your `.env` file.

## Step 4: Set Up Database Schema

1. Generate Prisma Client:
```bash
npx prisma generate
```

2. Create and run database migrations:
```bash
npx prisma migrate dev --name init
```

This will:
- Create all tables (users, sites, subscriptions)
- Set up relationships and indexes
- Seed initial data if needed

3. (Optional) Open Prisma Studio to view your database:
```bash
npx prisma studio
```

## Step 5: Start Development Server

```bash
npm run dev
```

The app will be available at: **http://localhost:3000**

## Step 6: Test the Setup

1. **Create an Account**:
   - Go to http://localhost:3000
   - Click "Get Started" or "Sign Up"
   - Fill in email and password
   - Submit the form

2. **Login**:
   - Go to http://localhost:3000/login
   - Enter your credentials
   - You should be redirected to the dashboard

3. **Add a Domain**:
   - In the dashboard, enter a domain (e.g., `example.com`)
   - Click "Crawl Domain"
   - Wait for tracker detection
   - Copy the generated script

4. **Test the Script**:
   - The script URL should work and generate JavaScript
   - Add it to a test HTML page to verify

## Troubleshooting

### Database Connection Issues

If you get database connection errors:

1. **Check DATABASE_URL format**:
   ```
   postgresql://username:password@host:port/database?schema=public
   ```

2. **Verify database exists**:
   ```bash
   psql -U postgres -l
   ```

3. **Test connection**:
   ```bash
   psql "your-database-url"
   ```

### Migration Issues

If migrations fail:

1. Reset database (⚠️ **WARNING**: This deletes all data):
   ```bash
   npx prisma migrate reset
   ```

2. Or manually fix and re-run:
   ```bash
   npx prisma migrate dev
   ```

### NextAuth Issues

If authentication doesn't work:

1. **Check NEXTAUTH_SECRET is set**:
   ```bash
   echo $NEXTAUTH_SECRET
   ```

2. **Verify NEXTAUTH_URL matches your app URL**

3. **Clear browser cookies** and try again

### Build Errors

If you get build errors:

1. **Regenerate Prisma Client**:
   ```bash
   npx prisma generate
   ```

2. **Clear Next.js cache**:
   ```bash
   rm -rf .next
   npm run build
   ```

## Production Deployment

### For Vercel:

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard:
   - `DATABASE_URL`
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL` (your production URL)
   - `NEXT_PUBLIC_BASE_URL` (your production URL)
4. Deploy

### For Other Platforms:

1. Set up PostgreSQL database
2. Add all environment variables
3. Run migrations:
   ```bash
   npx prisma migrate deploy
   ```
4. Build and start:
   ```bash
   npm run build
   npm start
   ```

## Quick Checklist

- [ ] Dependencies installed (`npm install`)
- [ ] PostgreSQL database created
- [ ] `.env` file created with all variables
- [ ] `NEXTAUTH_SECRET` generated and set
- [ ] Database migrations run (`npx prisma migrate dev`)
- [ ] Prisma Client generated (`npx prisma generate`)
- [ ] Development server running (`npm run dev`)
- [ ] Can create account and login
- [ ] Can add domain and get script

## Need Help?

- Check the main README.md for more details
- Review Prisma docs: https://www.prisma.io/docs
- Review NextAuth docs: https://next-auth.js.org
