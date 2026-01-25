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
        // Don't create subscription automatically - user must choose a plan
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
  // First, try with all fields including isAdmin
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        name: true,
        isAdmin: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    
    if (user) {
      return user;
    }
    
    return null;
  } catch (error) {
    console.error('[getUserByEmail] Error with isAdmin field:', error.message);
    
    // If isAdmin field doesn't exist, try without it
    if (
      error.message?.includes('Unknown column') || 
      error.message?.includes('column') || 
      error.message?.includes('isAdmin') ||
      error.message?.includes('does not exist') ||
      error.code === 'P2021' ||
      error.code === 'P2009'
    ) {
      console.warn('[getUserByEmail] Retrying without isAdmin field');
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
          },
        });
        // Add isAdmin as false if not in database
        return user ? { ...user, isAdmin: false } : null;
      } catch (fallbackError) {
        console.error('[getUserByEmail] Fallback query failed:', fallbackError.message);
        // Last resort: try raw SQL
        try {
          const users = await prisma.$queryRaw`
            SELECT id, email, password, name, "createdAt", "updatedAt"
            FROM users
            WHERE email = ${email}
            LIMIT 1
          `;
          const user = users && users.length > 0 ? users[0] : null;
          return user ? { ...user, isAdmin: false } : null;
        } catch (rawError) {
          console.error('[getUserByEmail] Raw SQL also failed:', rawError.message);
          throw fallbackError;
        }
      }
    }
    
    // For other database errors, try raw SQL as fallback
    console.warn('[getUserByEmail] Attempting raw SQL query as fallback');
    try {
      const users = await prisma.$queryRaw`
        SELECT id, email, password, name, "createdAt", "updatedAt"
        FROM users
        WHERE email = ${email}
        LIMIT 1
      `;
      const user = users && users.length > 0 ? users[0] : null;
      return user ? { ...user, isAdmin: false } : null;
    } catch (rawError) {
      console.error('[getUserByEmail] All methods failed');
      throw error; // Throw the original error
    }
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
        // Note: Subscriptions are now domain-based (on Site), not user-based
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
