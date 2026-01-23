# Admin Dashboard Setup Guide

## Overview

The admin dashboard provides comprehensive management capabilities for your Cookie Consent Manager platform. It allows administrators to manage users, sites, subscriptions, and view analytics.

## Features

### 1. **Overview Dashboard**
- Total users, sites, and subscriptions
- Growth metrics (last 30 days)
- Plan distribution (Free, Starter, Pro)
- Recent users and sites

### 2. **User Management**
- View all users with pagination
- Search users by email or name
- Update user plans (Free, Starter, Pro)
- Grant/revoke admin access
- Delete users (with cascade deletion of their sites)

### 3. **Site Management**
- View all sites across all users
- Search sites by domain
- View site owner and plan
- Delete sites

## Setting Up Your First Admin

### Option 1: Via Database (Recommended for initial setup)

1. Connect to your PostgreSQL database
2. Find your user ID:
   ```sql
   SELECT id, email FROM users WHERE email = 'your-email@example.com';
   ```
3. Update the user to be an admin:
   ```sql
   UPDATE users SET "isAdmin" = true WHERE id = 'your-user-id';
   ```

### Option 2: Via Prisma Studio

1. Run: `npm run db:studio`
2. Open the `users` table
3. Find your user
4. Edit the `isAdmin` field to `true`
5. Save

### Option 3: Via API (After first admin is set)

Use the admin API to grant admin access to other users.

## Accessing the Admin Dashboard

1. Log in with an admin account
2. You'll see an "Admin" link in the navigation bar
3. Click it to access `/admin`

## API Routes

### Admin Stats
- `GET /api/admin/stats` - Get overview statistics

### User Management
- `GET /api/admin/users?page=1&limit=50&search=query` - List users
- `PUT /api/admin/users` - Update user (plan, name, email, isAdmin)
- `DELETE /api/admin/users?userId=xxx` - Delete user

### Site Management
- `GET /api/admin/sites?page=1&limit=50&search=query` - List sites
- `DELETE /api/admin/sites?siteId=xxx` - Delete site

## Security

- All admin routes require authentication
- Admin routes check for `isAdmin: true` in the user record
- Non-admin users are automatically redirected to `/dashboard`
- Users cannot delete their own account via admin panel

## Database Schema

The `User` model now includes:
```prisma
model User {
  ...
  isAdmin Boolean @default(false)
  ...
}
```

## Next Steps

1. Set yourself as admin using one of the methods above
2. Log out and log back in to refresh your session
3. Access `/admin` to start managing your platform

## Notes

- Admin status is stored in the database and synced to the session
- Session refresh may be needed after granting admin access
- The admin dashboard is fully responsive and works on mobile devices
