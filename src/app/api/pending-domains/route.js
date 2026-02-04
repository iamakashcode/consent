import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/pending-domains
 * List current user's pending domains (added but not yet paid – no Site yet).
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const list = await prisma.pendingDomain.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, domain: true, siteId: true, plan: true, billingInterval: true, createdAt: true },
    });

    return Response.json(list);
  } catch (error) {
    console.error("[pending-domains] GET error:", error);
    return Response.json({ error: "Failed to fetch pending domains" }, { status: 500 });
  }
}

/**
 * DELETE /api/pending-domains
 * Body: { siteId } – remove a pending domain by its public siteId.
 */
export async function DELETE(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const siteId = body.siteId ? String(body.siteId).trim() : null;

    if (!siteId) {
      return Response.json({ error: "siteId is required" }, { status: 400 });
    }

    const deleted = await prisma.pendingDomain.deleteMany({
      where: { siteId, userId: session.user.id },
    });

    if (deleted.count === 0) {
      return Response.json({ error: "Pending domain not found or already removed" }, { status: 404 });
    }

    return Response.json({ message: "Pending domain removed" });
  } catch (error) {
    console.error("[pending-domains] DELETE error:", error);
    return Response.json({ error: "Failed to remove pending domain" }, { status: 500 });
  }
}
