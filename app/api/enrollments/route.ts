import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

// POST /api/enrollments - Enroll in a course
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
    const { course_id } = body;

    if (!course_id) {
      return NextResponse.json(
        { error: 'Course ID is required' },
        { status: 400 }
      );
    }

    // Check if course exists
    const course = await query(
      'SELECT * FROM courses WHERE course_id = ?',
      [course_id]
    );

    if (!Array.isArray(course) || course.length === 0) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      );
    }

    // Check if already enrolled
    const existingEnrollment = await query(
      'SELECT * FROM enrollments WHERE student_id = ? AND course_id = ?',
      [decoded.userId, course_id]
    );

    if (Array.isArray(existingEnrollment) && existingEnrollment.length > 0) {
      return NextResponse.json(
        { error: 'Already enrolled in this course' },
        { status: 409 }
      );
    }

    // Create enrollment
    const result = await query<{ insertId: number }>(
      `INSERT INTO enrollments (student_id, course_id) VALUES (?, ?)`,
      [decoded.userId, course_id]
    );

    // Log activity
    await query(
      'INSERT INTO activity_logs (user_id, action_type, entity_type, entity_id, description) VALUES (?, ?, ?, ?, ?)',
      [decoded.userId, 'create', 'enrollment', result.insertId, `Enrolled in course: ${course_id}`]
    );

    return NextResponse.json(
      { message: 'Enrolled successfully', enrollment_id: result.insertId },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating enrollment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/enrollments - Get user's enrollments
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
    const userId = searchParams.get('user_id') || decoded.userId.toString();

    // Only allow users to see their own enrollments (unless admin)
    if (userId !== decoded.userId.toString() && decoded.role !== 'instructor') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const enrollments = await query(
      `SELECT 
        e.enrollment_id,
        e.enrolled_at,
        c.course_id,
        c.name as course_name,
        c.code as course_code,
        c.section_id,
        c.description as course_description
      FROM enrollments e
      INNER JOIN courses c ON e.course_id = c.course_id
      WHERE e.student_id = ?
      ORDER BY e.enrolled_at DESC`,
      [userId]
    );

    return NextResponse.json({ enrollments }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching enrollments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/enrollments - Unenroll from a course
export async function DELETE(request: NextRequest) {
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

    // Delete enrollment
    const result = await query(
      'DELETE FROM enrollments WHERE student_id = ? AND course_id = ?',
      [decoded.userId, courseId]
    );

    // Log activity
    await query(
      'INSERT INTO activity_logs (user_id, action_type, entity_type, entity_id, description) VALUES (?, ?, ?, ?, ?)',
      [decoded.userId, 'delete', 'enrollment', null, `Unenrolled from course: ${courseId}`]
    );

    return NextResponse.json(
      { message: 'Unenrolled successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error deleting enrollment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

