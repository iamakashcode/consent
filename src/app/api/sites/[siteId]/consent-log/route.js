import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

function getClientIp(req) {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  if (req.headers.get("x-real-ip")) return req.headers.get("x-real-ip");
  if (req.headers.get("cf-connecting-ip")) return req.headers.get("cf-connecting-ip");
  return null;
}

/**
 * POST: Record a consent event (accept/reject) - called by the consent script.
 * No auth; CORS allowed.
 */
export async function OPTIONS() {
  return new Response(null, { status: 200, headers: corsHeaders });
}

export async function POST(req, { params }) {
  try {
    const resolvedParams = await params;
    const { siteId } = resolvedParams;

    if (!siteId) {
      return new Response(JSON.stringify({ error: "Site ID is required" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const site = await prisma.site.findUnique({
      where: { siteId },
      select: { id: true },
    });

    if (!site) {
      return new Response(JSON.stringify({ error: "Site not found" }), {
        status: 404,
        headers: corsHeaders,
      });
    }

    const body = await req.json().catch(() => ({}));
    const status = (body.status || "").toLowerCase();
    if (status !== "accepted" && status !== "rejected") {
      return new Response(JSON.stringify({ error: "status must be 'accepted' or 'rejected'" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const pageUrl = typeof body.pageUrl === "string" ? body.pageUrl.slice(0, 2048) : null;
    const visitorIp = getClientIp(req);

    const log = await prisma.consentLog.create({
      data: {
        siteId: site.id,
        status,
        visitorIp: visitorIp || null,
        pageUrl: pageUrl || null,
      },
    });

    return new Response(
      JSON.stringify({ success: true, id: log.id }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err) {
    console.error("[Consent Log] POST error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Failed to record consent" }),
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * GET: List consent logs for the site (auth required, pagination).
 */
export async function GET(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const { siteId } = resolvedParams;
    if (!siteId) {
      return Response.json({ error: "Site ID is required" }, { status: 400 });
    }

    const site = await prisma.site.findFirst({
      where: {
        OR: [{ siteId }, { id: siteId }],
        userId: session.user.id,
      },
      select: { id: true, siteId: true, domain: true },
    });

    if (!site) {
      return Response.json({ error: "Site not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.consentLog.findMany({
        where: { siteId: site.id },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          status: true,
          visitorIp: true,
          pageUrl: true,
          createdAt: true,
        },
      }),
      prisma.consentLog.count({ where: { siteId: site.id } }),
    ]);

    return Response.json({
      logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("[Consent Log] GET error:", err);
    return Response.json({ error: err.message || "Failed to fetch consent log" }, { status: 500 });
  }
}
