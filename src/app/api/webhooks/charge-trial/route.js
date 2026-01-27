import { prisma } from "@/lib/prisma";
// Note: This endpoint is not needed with Paddle as Paddle handles recurring billing automatically
// Keeping this for legacy/compatibility but it won't process charges

/**
 * Webhook endpoint to charge users after trial ends
 * 
 * NOTE: With Paddle, this endpoint is NOT needed as Paddle handles recurring billing automatically.
 * Paddle automatically charges customers after trial ends based on subscription settings.
 * 
 * This endpoint is kept for compatibility but returns a message that it's not needed.
 * 
 * With Paddle: Billing is handled automatically by Paddle.
 */
export async function POST(req) {
  // With Paddle, recurring billing is handled automatically
  // This endpoint is kept for compatibility but returns a message
  return Response.json({
    success: true,
    message: "Paddle handles recurring billing automatically. This endpoint is not needed.",
    note: "Paddle automatically charges customers after trial ends based on subscription settings.",
  });
}

/**
 * GET endpoint for manual testing
 */
export async function GET(req) {
  return Response.json({
    message: "Charge Trial Webhook",
    description: "With Paddle, recurring billing is handled automatically. This endpoint is not needed.",
    note: "Paddle automatically charges customers after trial ends based on subscription settings.",
  });
}
