import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

/**
 * GET - Fetch current user's subscription details including trial info
 */
export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id },
      select: {
        plan: true,
        status: true,
        currentPeriodStart: true,
        currentPeriodEnd: true,
        trialEndAt: true,
        cancelAtPeriodEnd: true,
        razorpayPaymentId: true,
      },
    });

    if (!subscription) {
      return Response.json({
        plan: "basic",
        status: "active",
        trialEndAt: null,
        currentPeriodEnd: null,
      });
    }

    return Response.json(subscription);
  } catch (error) {
    console.error("Error fetching subscription:", error);
    return Response.json(
      { error: error.message || "Failed to fetch subscription" },
      { status: 500 }
    );
  }
}
