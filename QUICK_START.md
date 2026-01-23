# Quick Start Guide

## 🚀 Get Running in 5 Minutes

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` and add:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/consent?schema=public"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-this-with-openssl-rand-base64-32"
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
```

**Generate NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```

### 3. Set Up Database

**Option A: Local PostgreSQL**
```bash
createdb consent
```

**Option B: Free Cloud Database (Recommended)**
- Go to https://supabase.com (free tier)
- Create a new project
- Copy the connection string to `DATABASE_URL`

### 4. Run Migrations

```bash
npx prisma generate
npx prisma migrate dev --name init
```

### 5. Start Development Server

```bash
npm run dev
```

Visit: **http://localhost:3000**

### 6. Test It

1. Go to http://localhost:3000
2. Click "Sign Up"
3. Create an account
4. Login
5. Add a domain in the dashboard

## ✅ Done!

Your SaaS platform is now running locally.

For detailed setup instructions, see [SETUP.md](./SETUP.md)
