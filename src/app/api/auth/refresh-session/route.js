import { getServerSession } from "next-auth";
import { authOptions } from "../[...nextauth]/route";
import { getUserById } from "@/lib/auth";

/**
 * API endpoint to refresh user session from database
 * This is useful when admin changes user's plan or other data
 */
export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch latest user data from database
    const user = await getUserById(session.user.id);

    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    // Return updated user data
    // The client will call update() from useSession to refresh the session
    return Response.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.subscription?.plan || "free",
        isAdmin: user.isAdmin || false,
      },
    });
  } catch (error) {
    console.error("Refresh session error:", error);
    return Response.json(
      { error: error.message || "Failed to refresh session" },
      { status: 500 }
    );
  }
}
