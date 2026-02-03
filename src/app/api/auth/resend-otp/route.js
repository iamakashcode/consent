import { setOtpAndSendEmail } from '@/lib/auth';
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
    const sent = await setOtpAndSendEmail(email.trim());
    if (!sent) {
      return NextResponse.json(
        { error: 'No unverified account found for this email, or email is already verified.' },
        { status: 400 }
      );
    }
    return NextResponse.json({ message: 'OTP sent. Check your email.' });
  } catch (error) {
    console.error('Resend OTP error:', error);
    return NextResponse.json(
      { error: 'Failed to send OTP. Please try again.' },
      { status: 500 }
    );
  }
}
