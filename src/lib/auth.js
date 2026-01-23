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

export async function getUserByEmail(email) {
  return prisma.user.findUnique({
    where: { email },
    include: {
      subscription: true,
    },
  });
}

export async function getUserById(id) {
  return prisma.user.findUnique({
    where: { id },
    include: {
      subscription: true,
    },
  });
}
