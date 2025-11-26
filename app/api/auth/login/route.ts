import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, generateToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { computing_id, password } = await req.json();
    if (!computing_id || !password) {
      return NextResponse.json({ error: 'Computing ID and password are required' }, { status: 400 });
    }

    const user = await authenticateUser(computing_id, password);
    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = generateToken(user);
    const res = NextResponse.json({
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
    }, { status: 200 });

    res.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
    });

    return res;
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

