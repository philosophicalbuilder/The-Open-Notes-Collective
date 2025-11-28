import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ courseId: string }> }
) {
  try {
    const token = req.cookies.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'instructor') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const params = await context.params;
    const courseId = params.courseId;

    // get students enrolled in course with their note counts
    const students = await query(`
      SELECT 
        u.user_id,
        u.computing_id,
        u.first_name,
        u.last_name,
        u.email,
        u.student_type,
        COUNT(DISTINCT n.note_id) as notes_count
      FROM enrollments e
      INNER JOIN users u ON e.student_id = u.user_id
      LEFT JOIN notes n ON u.user_id = n.author_id AND n.course_id = e.course_id
      WHERE e.course_id = ?
      GROUP BY u.user_id, u.computing_id, u.first_name, u.last_name, u.email, u.student_type
      ORDER BY u.last_name, u.first_name
    `, [courseId]);

    return NextResponse.json({ students }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

