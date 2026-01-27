import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

/**
 * Get Paddle client-side token for frontend initialization
 * This token is safe to expose in frontend code
 */
export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get client-side token from environment
    // Sandbox tokens start with "test_", live tokens start with "live_"
    const clientToken = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN || process.env.PADDLE_CLIENT_TOKEN;

    if (!clientToken) {
      console.error("[Paddle] Client-side token not configured");
      return Response.json(
        { 
          error: "Paddle client-side token not configured. Please add NEXT_PUBLIC_PADDLE_CLIENT_TOKEN to your environment variables.",
          hint: "Create a client-side token in Paddle Dashboard > Developer Tools > Authentication > Client-side tokens"
        },
        { status: 500 }
      );
    }

    // Determine environment based on token prefix
    const isSandbox = clientToken.startsWith("test_");
    const environment = isSandbox ? "sandbox" : "live";

    return Response.json({
      token: clientToken,
      environment: environment,
    });

  } catch (error) {
    console.error("[Paddle] Error getting client token:", error);
    return Response.json(
      { error: error.message || "Failed to get client token" },
      { status: 500 }
    );
  }
}
