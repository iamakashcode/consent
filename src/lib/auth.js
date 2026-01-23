import { compare, hash } from 'bcryptjs';
import { prisma } from './prisma';

export async function hashPassword(password) {
  return hash(password, 12);
}

export async function verifyPassword(password, hashedPassword) {
  return compare(password, hashedPassword);
}

export async function createUser(email, password, name) {
  try {
    const hashedPassword = await hashPassword(password);
    
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        subscription: {
          create: {
            plan: 'free',
            status: 'active',
          },
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });
    
    return user;
  } catch (error) {
    console.error('createUser error:', error);
    throw error;
  }
}

// Simple check if user exists (for signup) - doesn't require isAdmin field
export async function userExists(email) {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
      },
    });
    return !!user;
  } catch (error) {
    console.error('[userExists] Database error:', error);
    // If there's a schema error, try a basic query
    try {
      const count = await prisma.user.count({
        where: { email },
      });
      return count > 0;
    } catch (fallbackError) {
      console.error('[userExists] Fallback also failed:', fallbackError);
      throw fallbackError;
    }
  }
}

export async function getUserByEmail(email) {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        name: true,
        isAdmin: true, // This field exists after migration
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
      },
    });
    return user;
  } catch (error) {
    console.error('[getUserByEmail] Database error:', error);
    console.error('[getUserByEmail] Error code:', error.code);
    console.error('[getUserByEmail] Error message:', error.message);
    // If it's a column not found error, try without isAdmin
    if (error.message?.includes('Unknown column') || error.message?.includes('column') || error.code === 'P2021') {
      console.warn('[getUserByEmail] isAdmin column might not exist, trying without it');
      try {
        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            password: true,
            name: true,
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
          },
        });
        // Add isAdmin as false if not in database
        return user ? { ...user, isAdmin: false } : null;
      } catch (fallbackError) {
        console.error('[getUserByEmail] Fallback also failed:', fallbackError);
        throw fallbackError;
      }
    }
    throw error;
  }
}

export async function getUserById(id) {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        password: true,
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
      },
    });
    return user;
  } catch (error) {
    console.error('[getUserById] Database error:', error);
    // If it's a column not found error, try without isAdmin
    if (error.message?.includes('Unknown column') || error.message?.includes('column') || error.code === 'P2021') {
      console.warn('[getUserById] isAdmin column might not exist, trying without it');
      try {
        const user = await prisma.user.findUnique({
          where: { id },
          select: {
            id: true,
            email: true,
            password: true,
            name: true,
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
          },
        });
        // Add isAdmin as false if not in database
        return user ? { ...user, isAdmin: false } : null;
      } catch (fallbackError) {
        console.error('[getUserById] Fallback also failed:', fallbackError);
        return null; // Return null instead of throwing to prevent session invalidation
      }
    }
    // Return null instead of throwing to prevent session invalidation
    console.error('[getUserById] Error fetching user, returning null:', error);
    return null;
  }
}
