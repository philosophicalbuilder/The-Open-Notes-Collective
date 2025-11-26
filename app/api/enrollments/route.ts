import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'student') {
      return NextResponse.json({ error: 'Forbidden - Student access required' }, { status: 403 });
    }

    const { course_id } = await req.json();

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
    const result: any = await query(
      `INSERT INTO enrollments (student_id, course_id) VALUES (?, ?)`,
      [decoded.userId, course_id]
    );

    return NextResponse.json(
      { message: 'Enrolled successfully', enrollment_id: result.insertId },
      { status: 201 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const userId = req.nextUrl.searchParams.get('user_id') || decoded.userId.toString();

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
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const token = req.cookies.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const courseId = req.nextUrl.searchParams.get('course_id');

    if (!courseId) {
      return NextResponse.json(
        { error: 'Course ID is required' },
        { status: 400 }
      );
    }

    // Delete enrollment
    await query(
      'DELETE FROM enrollments WHERE student_id = ? AND course_id = ?',
      [decoded.userId, courseId]
    );

    return NextResponse.json(
      { message: 'Unenrolled successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

