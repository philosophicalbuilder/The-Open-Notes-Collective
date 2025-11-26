import { NextRequest, NextResponse } from 'next/server';
import { createUser, getUserByComputingId } from '@/lib/auth';
import { query } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { computing_id, email, password, first_name, middle_name, last_name, role, student_type, phone } = body;

    // Validation
    if (!computing_id || !email || !password || !first_name || !last_name || !role) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (role !== 'student' && role !== 'instructor') {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await getUserByComputingId(computing_id);
    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 409 }
      );
    }

    // Create user
    const userId = await createUser({
      computing_id,
      email,
      password,
      first_name,
      middle_name,
      last_name,
      role,
      student_type: role === 'student' ? student_type : null,
      phone,
    });

    // Log activity
    await query(
      'INSERT INTO activity_logs (user_id, action_type, entity_type, entity_id, description) VALUES (?, ?, ?, ?, ?)',
      [userId, 'register', 'user', userId, 'User registered']
    );

    return NextResponse.json(
      { message: 'User created successfully', user_id: userId },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

