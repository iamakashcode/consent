import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/user/profile
 * Returns current user profile (email, name, websiteUrl) for start-trial page
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        email: true,
        name: true,
        websiteUrl: true,
        trialStartedAt: true,
        trialEndAt: true,
      },
    });

    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    return Response.json({
      email: user.email,
      name: user.name,
      websiteUrl: user.websiteUrl || null,
      trialStartedAt: user.trialStartedAt || null,
      trialEndAt: user.trialEndAt || null,
    });
  } catch (error) {
    console.error("[Profile API]", error);
    return Response.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}
