import { verifyOtpAndMarkVerified } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { email, otp } = await req.json();
    if (!email || !otp || otp.length !== 6) {
      return NextResponse.json(
        { error: 'Email and a 6-digit OTP are required' },
        { status: 400 }
      );
    }
    const result = await verifyOtpAndMarkVerified(email.trim(), String(otp).trim());
    if (!result) {
      return NextResponse.json(
        { error: 'Invalid or expired OTP. Please request a new one.' },
        { status: 400 }
      );
    }
    return NextResponse.json({
      success: true,
      verifyToken: result.verifyToken,
      user: { id: result.id, email: result.email, name: result.name },
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
