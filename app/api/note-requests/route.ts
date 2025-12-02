import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { isGuest } from '@/lib/api-helpers';

export async function GET(req: NextRequest) {
  try {
    const courseId = req.nextUrl.searchParams.get('course_id');

    if (!courseId) {
      return NextResponse.json(
        { error: 'Course ID is required' },
        { status: 400 }
      );
    }

    // Allow guests to view note requests (read-only)
    const token = req.cookies.get('auth-token')?.value;
    const decoded = token ? verifyToken(token) : null;

    const guest = isGuest(req);

    // Only verify enrollment if user is authenticated and is a student
    if (decoded && decoded.role === 'student') {
      const enrollment = await query(
        'SELECT * FROM enrollments WHERE student_id = ? AND course_id = ?',
        [decoded.userId, courseId],
        false // Use app_user for authenticated users
      );
      if (!Array.isArray(enrollment) || enrollment.length === 0) {
        // Still allow viewing requests even if not enrolled (for guests)
      }
    }
    const requests = await query(
      `SELECT 
        r.request_id,
        r.course_id,
        r.student_id,
        r.parent_request_id,
        r.request_text,
        r.status,
        r.created_at,
        r.updated_at,
        u.first_name,
        u.last_name,
        u.computing_id
      FROM note_requests r
      INNER JOIN users u ON r.student_id = u.user_id
      WHERE r.course_id = ?
      ORDER BY r.created_at ASC`,
      [courseId],
      guest
    );

    return NextResponse.json({ requests }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'student') {
      return NextResponse.json({ error: 'Forbidden - Student access required' }, { status: 403 });
    }

    const { course_id, request_text, parent_request_id } = await req.json();

    if (!course_id || !request_text?.trim()) {
      return NextResponse.json(
        { error: 'Course ID and request text are required' },
        { status: 400 }
      );
    }

    // If this is a reply, verify the parent request exists and is in the same course
    if (parent_request_id) {
      const parentRequest: any = await query(
        'SELECT course_id FROM note_requests WHERE request_id = ?',
        [parent_request_id]
      );

      if (!Array.isArray(parentRequest) || parentRequest.length === 0) {
        return NextResponse.json(
          { error: 'Parent request not found' },
          { status: 404 }
        );
      }

      if (parentRequest[0].course_id !== parseInt(course_id)) {
        return NextResponse.json(
          { error: 'Parent request must be in the same course' },
          { status: 400 }
        );
      }
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

    // Create note request (or reply)
    const result: any = await query(
      `INSERT INTO note_requests (course_id, student_id, request_text, status, parent_request_id)
       VALUES (?, ?, ?, 'pending', ?)`,
      [course_id, decoded.userId, request_text.trim(), parent_request_id || null]
    );

    return NextResponse.json(
      { message: 'Note request created successfully', request_id: result.insertId },
      { status: 201 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const token = req.cookies.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const requestId = req.nextUrl.searchParams.get('id');
    const { status } = await req.json();

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
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

