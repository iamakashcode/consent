import crypto from 'crypto';
import { compare, hash } from 'bcryptjs';
import { prisma } from './prisma';
import { sendOtpEmail } from './email';

const OTP_EXPIRY_MINUTES = 10;
const VERIFY_TOKEN_EXPIRY_MINUTES = 5;
const RESET_TOKEN_EXPIRY_MINUTES = 60;

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

export async function hashPassword(password) {
  return hash(password, 12);
}

export async function verifyPassword(password, hashedPassword) {
  return compare(password, hashedPassword);
}

/** Create user with phone, websiteUrl; set emailVerified false and send OTP */
export async function createUser(email, password, name, { phone, countryCode, websiteUrl } = {}) {
  try {
    const hashedPassword = await hashPassword(password);
    const otp = generateOtp();
    const otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        phone: phone || null,
        countryCode: countryCode || '+91',
        websiteUrl: websiteUrl || null,
        emailVerified: false,
        otp,
        otpExpiresAt,
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });

    await sendOtpEmail(email, otp);
    return user;
  } catch (error) {
    console.error('createUser error:', error);
    throw error;
  }
}

/** Set new OTP for user (resend); returns true if sent */
export async function setOtpAndSendEmail(email) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, emailVerified: true },
  });
  if (!user || user.emailVerified) return false;
  const otp = generateOtp();
  const otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
  await prisma.user.update({
    where: { email },
    data: { otp, otpExpiresAt },
  });
  await sendOtpEmail(email, otp);
  return true;
}

/** Verify OTP and mark email verified; returns user if valid, null otherwise */
export async function verifyOtpAndMarkVerified(email, otp) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, otp: true, otpExpiresAt: true, emailVerified: true },
  });
  if (!user || user.emailVerified) return null;
  if (user.otp !== otp || !user.otpExpiresAt || new Date() > user.otpExpiresAt) return null;
  const verifyToken = generateToken();
  const verifyTokenExpiresAt = new Date(Date.now() + VERIFY_TOKEN_EXPIRY_MINUTES * 60 * 1000);
  await prisma.user.update({
    where: { email },
    data: {
      emailVerified: true,
      otp: null,
      otpExpiresAt: null,
      verifyToken,
      verifyTokenExpiresAt,
    },
  });
  return { id: user.id, email: user.email, name: user.name, verifyToken };
}

/** Consume verify token and return user for session; clears token */
export async function consumeVerifyToken(token) {
  if (!token) return null;
  const user = await prisma.user.findFirst({
    where: {
      verifyToken: token,
      verifyTokenExpiresAt: { gt: new Date() },
    },
    select: { id: true, email: true, name: true, isAdmin: true },
  });
  if (!user) return null;
  await prisma.user.update({
    where: { id: user.id },
    data: { verifyToken: null, verifyTokenExpiresAt: null },
  });
  return user;
}

/** Create reset token and send email; baseUrl e.g. https://yourapp.com. Returns true if user exists and email sent */
export async function setResetTokenAndSendEmail(email, baseUrl) {
  const { sendResetPasswordEmail } = await import('./email');
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (!user) return false;
  const resetToken = generateToken();
  const resetTokenExpiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000);
  await prisma.user.update({
    where: { email },
    data: { resetToken, resetTokenExpiresAt },
  });
  const resetLink = `${baseUrl.replace(/\/$/, '')}/reset-password?token=${resetToken}`;
  await sendResetPasswordEmail(email, resetLink);
  return true;
}

/** Verify reset token and return user id; does not clear token (call clearResetToken after password update) */
export async function verifyResetToken(token) {
  if (!token) return null;
  const user = await prisma.user.findFirst({
    where: {
      resetToken: token,
      resetTokenExpiresAt: { gt: new Date() },
    },
    select: { id: true },
  });
  return user ? user.id : null;
}

export async function clearResetToken(userId) {
  await prisma.user.update({
    where: { id: userId },
    data: { resetToken: null, resetTokenExpiresAt: null },
  });
}

export async function updatePassword(userId, newPassword) {
  const hashedPassword = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword },
  });
}

/** For login page: check if email exists and is unverified */
export async function getEmailStatus(email) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, emailVerified: true },
  });
  if (!user) return { exists: false, verified: false };
  return { exists: true, verified: !!user.emailVerified };
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
        isAdmin: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (user) return user;
    return null;
  } catch (error) {
    if (
      error.message?.includes('Unknown column') ||
      error.message?.includes('column') ||
      error.message?.includes('isAdmin') ||
      error.message?.includes('emailVerified') ||
      error.code === 'P2021' ||
      error.code === 'P2009'
    ) {
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
        return user ? { ...user, isAdmin: false, emailVerified: true } : null;
      } catch (fallbackError) {
        try {
          const users = await prisma.$queryRaw`
            SELECT id, email, password, name, "createdAt", "updatedAt"
            FROM users WHERE email = ${email} LIMIT 1
          `;
          const user = users?.[0] ? { ...users[0], isAdmin: false, emailVerified: true } : null;
          return user;
        } catch (rawError) {
          throw fallbackError;
        }
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
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return user;
  } catch (error) {
    if (error.message?.includes('Unknown column') || error.message?.includes('column') || error.code === 'P2021') {
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
        return user ? { ...user, isAdmin: false, emailVerified: true } : null;
      } catch (fallbackError) {
        return null;
      }
    }
    return null;
  }
}
