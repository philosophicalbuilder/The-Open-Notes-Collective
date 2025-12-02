import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/config/auth';
import { query } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { role, student_type } = await req.json();
    if (!role || (role !== 'student' && role !== 'instructor')) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    await query(
      'UPDATE users SET role = ?, student_type = ? WHERE email = ?',
      [role, role === 'student' ? student_type : null, session.user.email]
    );

    return NextResponse.json({ message: 'Role updated successfully' }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

