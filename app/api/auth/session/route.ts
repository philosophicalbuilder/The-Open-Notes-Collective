import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getUserById } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('auth-token')?.value;
    if (!token) return NextResponse.json({ user: null }, { status: 200 });

    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ user: null }, { status: 200 });

    const user = await getUserById(decoded.userId);
    if (!user) return NextResponse.json({ user: null }, { status: 200 });

    // Get additional statistics for students
    let stats = null;
    if (decoded.role === 'student') {
      const [notesCountResult, avgRatingResult, enrollmentsCountResult] = await Promise.all([
        query<any[]>(
          'SELECT COUNT(*) as count FROM notes WHERE author_id = ?',
          [decoded.userId]
        ),
        query<any[]>(
          `SELECT AVG(r.rating) as avg_rating 
           FROM notes n
           INNER JOIN ratings r ON n.note_id = r.note_id
           WHERE n.author_id = ?`,
          [decoded.userId]
        ),
        query<any[]>(
          'SELECT COUNT(*) as count FROM enrollments WHERE student_id = ?',
          [decoded.userId]
        ),
      ]);

      const notesCount = Array.isArray(notesCountResult) ? notesCountResult[0]?.count || 0 : 0;
      const avgRating = Array.isArray(avgRatingResult) ? parseFloat(avgRatingResult[0]?.avg_rating || '0') : 0;
      const enrollmentsCount = Array.isArray(enrollmentsCountResult) ? enrollmentsCountResult[0]?.count || 0 : 0;

      stats = {
        notes_count: notesCount,
        average_rating: avgRating.toFixed(1),
        enrolled_courses: enrollmentsCount,
      };
    }

    return NextResponse.json({ user: { ...user, stats } }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ user: null }, { status: 200 });
  }
}
