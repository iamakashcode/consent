# Domain-Based Plans Migration Guide

## Overview
The subscription model has been changed from **account-based** to **domain-based**. Each domain now requires its own subscription plan, and plans are limited by **page views** instead of domain count.

## Key Changes

### 1. Database Schema Changes
- **Subscription model** now links to `Site` instead of `User`
- One subscription per domain (one-to-one relationship)
- Migration SQL file: `prisma/migrations/20260124160000_move_subscription_to_site/migration.sql`

### 2. Plan Limits Changed
**Old Model (Account-based):**
- Basic: 1 domain
- Starter: 5 domains
- Pro: Unlimited domains

**New Model (Domain-based):**
- Basic: 100,000 page views/month per domain
- Starter: 300,000 page views/month per domain
- Pro: Unlimited page views/month per domain

### 3. Payment Flow Changes
- Payment now requires `siteId` parameter
- Each domain must have its own subscription
- Users can add unlimited domains (no account-level limit)
- Each domain needs a separate plan purchase

### 4. Updated Files

#### Database & Schema
- `prisma/schema.prisma` - Subscription now links to Site
- `prisma/migrations/20260124160000_move_subscription_to_site/migration.sql` - Migration script

#### Core Libraries
- `src/lib/subscription.js` - Changed from `userId` to `siteId` checks
- `src/lib/razorpay.js` - Updated plan details with page view limits

#### API Routes
- `src/app/api/payment/create-order/route.js` - Now requires `siteId`, creates subscription per site
- `src/app/api/script/[siteId]/route.js` - Checks site subscription and page view limits
- `src/app/api/crawl/route.js` - Removed domain count limits
- `src/app/api/sites/[siteId]/verify-callback/route.js` - Checks site subscription
- `src/app/api/webhooks/razorpay/route.js` - Updated to use `siteId`
- `src/app/api/webhooks/charge-trial/route.js` - Updated to use `siteId`
- `src/app/api/payment/subscription-callback/route.js` - Updated to use `siteId`

## Migration Steps

### 1. Run Database Migration
```bash
# Apply the migration
npx prisma migrate deploy

# Or if using the API migration route
curl -X POST https://yourdomain.com/api/migrate \
  -H "Authorization: Bearer YOUR_MIGRATION_TOKEN"
```

### 2. Update Frontend
The frontend needs to be updated to:
- Pass `siteId` when selecting a plan
- Show plan per domain in dashboard
- Display page view usage per domain
- Allow selecting plan for each domain separately

### 3. Update Payment Flow
When user selects a plan, the frontend must:
1. Get the `siteId` for the domain
2. Call `/api/payment/create-order` with both `plan` and `siteId`
3. Redirect to Razorpay for that specific domain's subscription

## Important Notes

1. **Existing Subscriptions**: The migration script will attempt to migrate existing user subscriptions to their first site. Review the migration results carefully.

2. **Page View Tracking**: Page views are already tracked per site in the `PageView` model. The limit checking uses this data.

3. **Script Blocking**: The consent script now checks:
   - Site subscription status (active/inactive)
   - Page view limits for the current billing period

4. **Unlimited Domains**: Users can now add unlimited domains. Each domain requires its own subscription.

5. **Payment Flow**: The payment page needs to be updated to accept and pass `siteId` when creating subscriptions.

## Testing Checklist

- [ ] Run database migration successfully
- [ ] Add a new domain (should not require account plan)
- [ ] Select plan for a domain (should require siteId)
- [ ] Verify subscription is created for the site
- [ ] Check script blocking works with site subscription
- [ ] Verify page view limit checking works
- [ ] Test webhook handlers with site-based subscriptions
- [ ] Update frontend to show plan per domain
- [ ] Update payment flow to include siteId

## Next Steps

1. Update frontend payment page to include `siteId` in plan selection
2. Update dashboard to show plan per domain
3. Add page view usage display per domain
4. Update profile page to show all domain subscriptions
5. Test the complete flow end-to-end
