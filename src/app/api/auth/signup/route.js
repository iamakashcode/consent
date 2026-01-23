import { createUser, userExists } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const body = await req.json();
    const { email, password, name } = body;
    
    console.log('Signup request received:', { email, hasPassword: !!password, name });

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Check if user already exists (using simple check that doesn't require isAdmin)
    const exists = await userExists(email);
    if (exists) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      );
    }

    // Create user
    const user = await createUser(email, password, name);

    return NextResponse.json(
      { message: 'User created successfully', user },
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
