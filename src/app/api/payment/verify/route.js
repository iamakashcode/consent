import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
// Payment verification route (LEGACY)
// With Paddle, payments are verified automatically via webhooks, so this route is not needed

export async function POST(req) {
  // With Paddle, payment verification is handled via webhooks
  // This route is kept for compatibility
  return Response.json({
    success: false,
    message: "This endpoint is not needed. With Paddle, payments are verified automatically via webhooks.",
    note: "Paddle handles payment verification automatically. No manual verification needed.",
  }, { status: 400 });
}
