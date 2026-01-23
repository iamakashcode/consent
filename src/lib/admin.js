import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

/**
 * Check if the current user is an admin
 */
export async function isAdmin(userId) {
  if (!userId) return false;
  
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true },
  });
  
  return user?.isAdmin || false;
}

/**
 * Get admin status from session
 */
export async function getAdminStatus() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return false;
  return await isAdmin(session.user.id);
}

/**
 * Require admin access - throws error if not admin
 */
export async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  
  const adminStatus = await isAdmin(session.user.id);
  if (!adminStatus) {
    throw new Error("Admin access required");
  }
  
  return session.user.id;
}
