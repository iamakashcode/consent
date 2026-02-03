import { setResetTokenAndSendEmail } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { email } = await req.json();
    if (!email || typeof email !== 'string' || !email.trim()) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }
    const baseUrl = process.env.NEXTAUTH_URL
      || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
    const sent = await setResetTokenAndSendEmail(email.trim(), baseUrl);
    if (!sent) {
      return NextResponse.json(
        { error: 'No account found with this email.' },
        { status: 400 }
      );
    }
    return NextResponse.json({ message: 'If an account exists, you will receive a password reset link.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Failed to send reset email. Please try again.' },
      { status: 500 }
    );
  }
}
