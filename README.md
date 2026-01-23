# Cookie Consent Manager - SaaS Platform

A production-ready SaaS platform for managing cookie consent and tracking code detection.

## Features

- 🔐 User authentication with email/password
- 🕷️ Automatic tracking code detection
- 🍪 Cookie consent banner management
- 📊 Multi-site management
- 💳 Pricing plans (Free, Starter, Pro)
- 🗄️ PostgreSQL database with Prisma ORM
- 🚀 Production-ready architecture

## Tech Stack

- **Framework**: Next.js 16
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: NextAuth.js
- **Styling**: Tailwind CSS

## Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL database
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone <your-repo-url>
cd consent
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.example .env
```

Edit `.env` and add your:
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_SECRET` - Generate with: `openssl rand -base64 32`
- `NEXTAUTH_URL` - Your app URL (http://localhost:3000 for dev)
- `NEXT_PUBLIC_BASE_URL` - Your app URL
- `RAZORPAY_KEY_ID` - Razorpay API Key ID (get from Razorpay dashboard)
- `RAZORPAY_KEY_SECRET` - Razorpay API Secret (get from Razorpay dashboard)

4. Set up the database
```bash
npx prisma migrate dev
npx prisma generate
```

5. Run the development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Schema

- **User**: User accounts with email/password authentication
- **Site**: Registered websites with detected trackers
- **Subscription**: User subscription plans and status

## API Routes

- `POST /api/auth/signup` - User registration
- `POST /api/auth/[...nextauth]` - NextAuth endpoints
- `POST /api/crawl` - Crawl and detect trackers (authenticated)
- `GET /api/sites` - Get user's sites (authenticated)
- `DELETE /api/sites` - Delete a site (authenticated)
- `GET /api/script/[siteId]` - Get consent script (public)
- `POST /api/payment/create-order` - Create Razorpay payment order (authenticated)
- `POST /api/payment/verify` - Verify Razorpay payment (authenticated)

## Pricing Plans

- **Free**: 1 website, basic features - ₹0/month
- **Starter**: 5 websites, advanced features - ₹9/month
- **Pro**: Unlimited websites, all features - ₹29/month

### Payment Integration

The platform uses **Razorpay** for payment processing. To set up payments:

1. Create a Razorpay account at https://razorpay.com
2. Get your test API keys from the Razorpay dashboard
3. Add `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` to your `.env` file
4. For production, switch to live keys in your Razorpay dashboard

**Test Cards** (for testing):
- Card Number: `4111 1111 1111 1111`
- CVV: Any 3 digits
- Expiry: Any future date
- Name: Any name

Users can upgrade their plans from:
- Profile page (upgrade button)
- Pricing page (plan selection)
- Dashboard (when hitting plan limits)

## Production Deployment

1. Set up PostgreSQL database (e.g., Vercel Postgres, Supabase, Railway)
2. Update environment variables in your hosting platform
3. Run migrations: `npx prisma migrate deploy`
4. Deploy to Vercel, Railway, or your preferred platform

## License

MIT
