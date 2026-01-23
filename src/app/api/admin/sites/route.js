import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

// Get all sites
export async function GET(req) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const search = searchParams.get("search") || "";

    const skip = (page - 1) * limit;

    const where = search
      ? {
          domain: { contains: search, mode: "insensitive" },
        }
      : {};

    const [sites, total] = await Promise.all([
      prisma.site.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          domain: true,
          siteId: true,
          trackers: true,
          createdAt: true,
          updatedAt: true,
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              subscription: {
                select: {
                  plan: true,
                },
              },
            },
          },
        },
      }),
      prisma.site.count({ where }),
    ]);

    return Response.json({
      sites,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Admin sites GET error:", error);
    return Response.json(
      { error: error.message || "Failed to fetch sites" },
      { status: error.message === "Unauthorized" || error.message === "Admin access required" ? 403 : 500 }
    );
  }
}

// Delete site
export async function DELETE(req) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get("siteId");

    if (!siteId) {
      return Response.json({ error: "Site ID is required" }, { status: 400 });
    }

    await prisma.site.delete({
      where: { id: siteId },
    });

    return Response.json({ message: "Site deleted successfully" });
  } catch (error) {
    console.error("Admin sites DELETE error:", error);
    return Response.json(
      { error: error.message || "Failed to delete site" },
      { status: error.message === "Unauthorized" || error.message === "Admin access required" ? 403 : 500 }
    );
  }
}
