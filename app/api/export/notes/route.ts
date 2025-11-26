import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const searchParams = req.nextUrl.searchParams;
    const courseId = searchParams.get('course_id');
    const format = searchParams.get('format') || 'json';

    let sql = `
      SELECT 
        n.note_id,
        n.title,
        n.description,
        n.lecture,
        n.link,
        n.created_at,
        u.first_name as author_first_name,
        u.last_name as author_last_name,
        c.name as course_name,
        c.code as course_code,
        COALESCE(AVG(r.rating), 0) as average_rating,
        COUNT(DISTINCT r.rating_id) as rating_count
      FROM notes n
      INNER JOIN users u ON n.author_id = u.user_id
      INNER JOIN courses c ON n.course_id = c.course_id
      LEFT JOIN ratings r ON n.note_id = r.note_id
      WHERE 1=1
    `;
    const params = [];

    if (courseId) {
      sql += ` AND n.course_id = ?`;
      params.push(courseId);
    }

    // If student, only show notes from courses they're enrolled in
    if (decoded.role === 'student') {
      sql += ` AND n.course_id IN (SELECT course_id FROM enrollments WHERE student_id = ?)`;
      params.push(decoded.userId);
    }

    sql += ` GROUP BY n.note_id ORDER BY n.created_at DESC`;

    const notes = await query(sql, params);

    if (format === 'csv') {
      // Convert to CSV
      if (!Array.isArray(notes) || notes.length === 0) {
        return new NextResponse('No data to export', { status: 404 });
      }

      const headers = Object.keys(notes[0] as any).join(',');
      const rows = (notes as any[]).map((note) =>
        Object.values(note)
          .map((val: any) => {
            const str = String(val || '');
            // Escape quotes and wrap in quotes if contains comma
            return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
          })
          .join(',')
      );

      const csv = [headers, ...rows].join('\n');

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="notes-export-${Date.now()}.csv"`,
        },
      });
    } else {
      // Return as JSON
      return NextResponse.json(
        {
          export_date: new Date().toISOString(),
          format: 'json',
          count: Array.isArray(notes) ? notes.length : 0,
          notes: notes,
        },
        {
          headers: {
            'Content-Disposition': `attachment; filename="notes-export-${Date.now()}.json"`,
          },
        }
      );
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

