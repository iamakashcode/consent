-- Add Razorpay subscription fields
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "razorpaySubscriptionId" TEXT;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "razorpayPlanId" TEXT;
