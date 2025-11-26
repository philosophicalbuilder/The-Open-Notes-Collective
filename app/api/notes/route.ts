import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

// GET /api/notes - List notes with search/filter
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const courseId = searchParams.get('course_id');
    const search = searchParams.get('search') || '';
    const sortBy = searchParams.get('sort') || 'created_at'; // created_at, rating, title
    const sortOrder = searchParams.get('order') || 'DESC'; // ASC, DESC

    let sql = `
      SELECT 
        n.note_id,
        n.title,
        n.description,
        n.lecture,
        n.link,
        n.course_id,
        n.author_id,
        n.created_at,
        u.first_name as author_first_name,
        u.last_name as author_last_name,
        COALESCE(AVG(r.rating), 0) as average_rating,
        COUNT(DISTINCT r.rating_id) as rating_count
      FROM notes n
      INNER JOIN users u ON n.author_id = u.user_id
      LEFT JOIN ratings r ON n.note_id = r.note_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (courseId) {
      sql += ` AND n.course_id = ?`;
      params.push(courseId);
    }

    if (search) {
      sql += ` AND (n.title LIKE ? OR n.description LIKE ?)`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }

    sql += ` GROUP BY n.note_id`;

    // Validate sort column
    const validSortColumns = ['created_at', 'rating', 'title', 'average_rating'];
    const validSortOrder = ['ASC', 'DESC'];
    const finalSortBy = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
    const finalSortOrder = validSortOrder.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';

    if (finalSortBy === 'rating' || finalSortBy === 'average_rating') {
      sql += ` ORDER BY average_rating ${finalSortOrder}, rating_count DESC`;
    } else if (finalSortBy === 'title') {
      sql += ` ORDER BY n.title ${finalSortOrder}`;
    } else {
      sql += ` ORDER BY n.created_at ${finalSortOrder}`;
    }

    const notes = await query(sql, params);

    return NextResponse.json({ notes }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching notes:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/notes - Submit a new note
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
    const { title, description, lecture, link, course_id, file_url } = body;

    // Either link or file_url must be provided
    const finalLink = file_url || link;

    if (!title || !description || !finalLink || !course_id) {
      return NextResponse.json(
        { error: 'Missing required fields: title, description, link/file, and course_id are required' },
        { status: 400 }
      );
    }

    // Verify course exists and user is enrolled
    const enrollment = await query(
      'SELECT * FROM enrollments WHERE student_id = ? AND course_id = ?',
      [decoded.userId, course_id]
    );

    if (!Array.isArray(enrollment) || enrollment.length === 0) {
      return NextResponse.json(
        { error: 'You must be enrolled in this course to submit notes' },
        { status: 403 }
      );
    }

    // Create note
    const result = await query<{ insertId: number }>(
      `INSERT INTO notes (title, description, lecture, link, course_id, author_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [title, description, lecture || null, finalLink, course_id, decoded.userId]
    );

    // Log activity
    await query(
      'INSERT INTO activity_logs (user_id, action_type, entity_type, entity_id, description) VALUES (?, ?, ?, ?, ?)',
      [decoded.userId, 'create', 'note', result.insertId, `Submitted note: ${title}`]
    );

    return NextResponse.json(
      { message: 'Note submitted successfully', note_id: result.insertId },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating note:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

