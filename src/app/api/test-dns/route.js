import { verifyDomainDNS } from "@/lib/dns-verification";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

/**
 * Test endpoint to check DNS records (for debugging)
 */
export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const domain = searchParams.get("domain");
    const token = searchParams.get("token");

    if (!domain || !token) {
      return Response.json(
        { error: "Domain and token parameters are required" },
        { status: 400 }
      );
    }

    const result = await verifyDomainDNS(domain, token);

    return Response.json({
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Test DNS error:", error);
    return Response.json(
      { error: error.message || "Failed to test DNS" },
      { status: 500 }
    );
  }
}
