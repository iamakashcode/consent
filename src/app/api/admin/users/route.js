import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

// Get all users
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
          OR: [
            { email: { contains: search, mode: "insensitive" } },
            { name: { contains: search, mode: "insensitive" } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          name: true,
          isAdmin: true,
          createdAt: true,
          updatedAt: true,
          subscription: {
            select: {
              plan: true,
              status: true,
              currentPeriodStart: true,
              currentPeriodEnd: true,
            },
          },
          _count: {
            select: {
              sites: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return Response.json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Admin users GET error:", error);
    return Response.json(
      { error: error.message || "Failed to fetch users" },
      { status: error.message === "Unauthorized" || error.message === "Admin access required" ? 403 : 500 }
    );
  }
}

// Update user
export async function PUT(req) {
  try {
    await requireAdmin();

    const { userId, name, email, isAdmin, plan } = await req.json();

    if (!userId) {
      return Response.json({ error: "User ID is required" }, { status: 400 });
    }

    // Update user
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (isAdmin !== undefined) updateData.isAdmin = isAdmin;

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        isAdmin: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Update subscription plan if provided
    if (plan !== undefined) {
      await prisma.subscription.upsert({
        where: { userId },
        create: {
          userId,
          plan,
          status: "active",
        },
        update: {
          plan,
        },
      });
    }

    return Response.json({ user, message: "User updated successfully" });
  } catch (error) {
    console.error("Admin users PUT error:", error);
    return Response.json(
      { error: error.message || "Failed to update user" },
      { status: error.message === "Unauthorized" || error.message === "Admin access required" ? 403 : 500 }
    );
  }
}

// Delete user
export async function DELETE(req) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return Response.json({ error: "User ID is required" }, { status: 400 });
    }

    // Prevent deleting yourself
    const session = await getServerSession(authOptions);
    if (session?.user?.id === userId) {
      return Response.json(
        { error: "You cannot delete your own account" },
        { status: 400 }
      );
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    return Response.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Admin users DELETE error:", error);
    return Response.json(
      { error: error.message || "Failed to delete user" },
      { status: error.message === "Unauthorized" || error.message === "Admin access required" ? 403 : 500 }
    );
  }
}
