import { NextRequest, NextResponse } from 'next/server';
import { createUser, getUserByComputingId } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { computing_id, email, password, first_name, middle_name, last_name, role, student_type, phone } = await req.json();

    if (!computing_id || !email || !password || !first_name || !last_name || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (role !== 'student' && role !== 'instructor') {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    const existingUser = await getUserByComputingId(computing_id);
    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 409 });
    }

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

    return NextResponse.json({ message: 'User created successfully', user_id: userId }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

