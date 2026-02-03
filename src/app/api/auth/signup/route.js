import { createUser, userExists } from '@/lib/auth';
import { NextResponse } from 'next/server';

function isValidUrl(str) {
  try {
    const u = new URL(str);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { email, password, confirmPassword, websiteUrl } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }
    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: 'Passwords do not match' },
        { status: 400 }
      );
    }
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }
    if (!websiteUrl || typeof websiteUrl !== 'string' || !websiteUrl.trim()) {
      return NextResponse.json(
        { error: 'Domain is required' },
        { status: 400 }
      );
    }
    let url = websiteUrl.trim().toLowerCase();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    if (!isValidUrl(url)) {
      return NextResponse.json(
        { error: 'Please enter a valid domain (e.g. yourdomain.com or yourdomain.in)' },
        { status: 400 }
      );
    }

    const exists = await userExists(email);
    if (exists) {
      return NextResponse.json(
        { error: 'User already exists with this email' },
        { status: 400 }
      );
    }

    const user = await createUser(email, password, null, { websiteUrl: url });

    return NextResponse.json(
      { message: 'Account created. Please verify your email with the OTP sent.', user: { email: user.email } },
      { status: 201 }
    );
  } catch (error) {
    console.error('Signup error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);

    // Provide more helpful error messages
    let errorMessage = 'Internal server error';
    if (error.message?.includes('Unique constraint') || error.code === 'P2002') {
      errorMessage = 'User with this email already exists';
    } else if (error.message?.includes('column') || error.code === 'P2021') {
      errorMessage = 'Database schema mismatch. Please run migrations: npx prisma migrate deploy';
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}
