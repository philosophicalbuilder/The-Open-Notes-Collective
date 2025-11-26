import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { query } from '@/lib/db';

// This endpoint is called after OAuth to set the user's role
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { role, student_type } = body;

    if (!role || (role !== 'student' && role !== 'instructor')) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      );
    }

    // Update user role in database
    await query(
      'UPDATE users SET role = ?, student_type = ? WHERE email = ?',
      [role, role === 'student' ? student_type : null, session.user.email]
    );

    // Log activity
    await query(
      'INSERT INTO activity_logs (user_id, action_type, entity_type, description) VALUES ((SELECT user_id FROM users WHERE email = ?), ?, ?, ?)',
      [session.user.email, 'update', 'user', `Role set to ${role}`]
    );

    return NextResponse.json(
      { message: 'Role updated successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error setting role:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

