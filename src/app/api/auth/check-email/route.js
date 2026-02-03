import { getEmailStatus } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET(req) {
  try {
    const email = req.nextUrl.searchParams.get('email');
    if (!email || !email.trim()) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }
    const status = await getEmailStatus(email.trim());
    return NextResponse.json(status);
  } catch (error) {
    console.error('Check email error:', error);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
