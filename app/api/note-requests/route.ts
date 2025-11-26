import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

// GET /api/note-requests - Get note requests for a course
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const courseId = searchParams.get('course_id');

    if (!courseId) {
      return NextResponse.json(
        { error: 'Course ID is required' },
        { status: 400 }
      );
    }

    // Verify user is enrolled in course (for students) or is instructor
    if (decoded.role === 'student') {
      const enrollment = await query(
        'SELECT * FROM enrollments WHERE student_id = ? AND course_id = ?',
        [decoded.userId, courseId]
      );
      if (!Array.isArray(enrollment) || enrollment.length === 0) {
        return NextResponse.json(
          { error: 'You must be enrolled in this course' },
          { status: 403 }
        );
      }
    }

    const requests = await query(
      `SELECT 
        request_id,
        course_id,
        student_id,
        request_text,
        status,
        created_at,
        updated_at
      FROM note_requests
      WHERE course_id = ?
      ORDER BY created_at DESC`,
      [courseId]
    );

    return NextResponse.json({ requests }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching note requests:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/note-requests - Create a new note request
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'student') {
      return NextResponse.json({ error: 'Forbidden - Student access required' }, { status: 403 });
    }

    const body = await request.json();
    const { course_id, request_text } = body;

    if (!course_id || !request_text?.trim()) {
      return NextResponse.json(
        { error: 'Course ID and request text are required' },
        { status: 400 }
      );
    }

    // Verify student is enrolled
    const enrollment = await query(
      'SELECT * FROM enrollments WHERE student_id = ? AND course_id = ?',
      [decoded.userId, course_id]
    );

    if (!Array.isArray(enrollment) || enrollment.length === 0) {
      return NextResponse.json(
        { error: 'You must be enrolled in this course to submit requests' },
        { status: 403 }
      );
    }

    // Create note request
    const result = await query<{ insertId: number }>(
      `INSERT INTO note_requests (course_id, student_id, request_text, status)
       VALUES (?, ?, ?, 'pending')`,
      [course_id, decoded.userId, request_text.trim()]
    );

    // Log activity
    await query(
      'INSERT INTO activity_logs (user_id, action_type, entity_type, entity_id, description) VALUES (?, ?, ?, ?, ?)',
      [decoded.userId, 'create', 'note_request', result.insertId, `Created note request for course ${course_id}`]
    );

    return NextResponse.json(
      { message: 'Note request created successfully', request_id: result.insertId },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating note request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/note-requests/[id] - Update note request status
export async function PUT(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const requestId = searchParams.get('id');
    const body = await request.json();
    const { status } = body;

    if (!requestId || !status) {
      return NextResponse.json(
        { error: 'Request ID and status are required' },
        { status: 400 }
      );
    }

    if (status !== 'pending' && status !== 'fulfilled') {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }

    // Update request status
    await query(
      'UPDATE note_requests SET status = ? WHERE request_id = ?',
      [status, requestId]
    );

    return NextResponse.json(
      { message: 'Request status updated successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error updating note request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

