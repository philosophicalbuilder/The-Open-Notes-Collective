import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, generateToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { computing_id, password } = body;

    if (!computing_id || !password) {
      return NextResponse.json(
        { error: 'Computing ID and password are required' },
        { status: 400 }
      );
    }

    // Authenticate user
    const user = await authenticateUser(computing_id, password);
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Generate token
    const token = generateToken(user);

    // Set cookie
    const response = NextResponse.json(
      {
        message: 'Login successful',
        user: {
          user_id: user.user_id,
          computing_id: user.computing_id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          role: user.role,
          student_type: user.student_type,
        },
      },
      { status: 200 }
    );

    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

