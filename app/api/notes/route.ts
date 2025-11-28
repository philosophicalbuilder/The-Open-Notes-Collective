import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { logActivity } from '@/lib/api-helpers';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const courseId = searchParams.get('course_id');
    const search = searchParams.get('search') || '';
    const sortBy = searchParams.get('sort') || 'created_at';
    const sortOrder = searchParams.get('order') || 'DESC';

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
        COUNT(DISTINCT r.rating_id) as rating_count,
        COUNT(DISTINCT v.view_id) as view_count
      FROM notes n
      INNER JOIN users u ON n.author_id = u.user_id
      LEFT JOIN ratings r ON n.note_id = r.note_id
      LEFT JOIN note_views v ON n.note_id = v.note_id
      WHERE 1=1
    `;
    const sqlParams = [];

    if (courseId) {
      sql += ` AND n.course_id = ?`;
      sqlParams.push(courseId);
    }

    if (search) {
      sql += ` AND (n.title LIKE ? OR n.description LIKE ?)`;
      const searchTerm = `%${search}%`;
      sqlParams.push(searchTerm, searchTerm);
    }

    sql += ` GROUP BY n.note_id`;

    const validSort = ['created_at', 'rating', 'title', 'average_rating', 'popularity', 'views'].includes(sortBy) ? sortBy : 'created_at';
    const validOrder = ['ASC', 'DESC'].includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';

    if (validSort === 'rating' || validSort === 'average_rating') {
      sql += ` ORDER BY average_rating ${validOrder}, rating_count DESC`;
    } else if (validSort === 'popularity' || validSort === 'views') {
      sql += ` ORDER BY view_count ${validOrder}, average_rating DESC`;
    } else if (validSort === 'title') {
      sql += ` ORDER BY n.title ${validOrder}`;
    } else {
      sql += ` ORDER BY n.created_at ${validOrder}`;
    }

    const notes = await query(sql, sqlParams);

    return NextResponse.json({ notes }, { status: 200 });
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

    const { title, description, lecture, link, course_id, file_url } = await req.json();

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
    const result: any = await query(
      `INSERT INTO notes (title, description, lecture, link, course_id, author_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [title, description, lecture || null, finalLink, course_id, decoded.userId]
    );

    // Log activity
    await logActivity(decoded.userId, 'note_upload', 'note', result.insertId, `Uploaded note: ${title}`);

    return NextResponse.json(
      { message: 'Note submitted successfully', note_id: result.insertId },
      { status: 201 }
    );
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

    const noteId = req.nextUrl.searchParams.get('note_id');
    if (!noteId) {
      return NextResponse.json(
        { error: 'Note ID is required' },
        { status: 400 }
      );
    }

    // Get the note and verify the instructor owns the course
    const note: any = await query(
      `SELECT n.note_id, n.course_id, c.instructor_id 
       FROM notes n
       INNER JOIN courses c ON n.course_id = c.course_id
       WHERE n.note_id = ?`,
      [noteId]
    );

    if (!Array.isArray(note) || note.length === 0) {
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 }
      );
    }

    // Only instructors can delete notes, and only from their own courses
    if (decoded.role !== 'instructor') {
      return NextResponse.json(
        { error: 'Forbidden - Instructor access required' },
        { status: 403 }
      );
    }

    if (note[0].instructor_id !== decoded.userId) {
      return NextResponse.json(
        { error: 'You can only delete notes from your own courses' },
        { status: 403 }
      );
    }

    // Delete note (ratings will be cascade deleted due to foreign key)
    await query(
      'DELETE FROM notes WHERE note_id = ?',
      [noteId]
    );

    // Log activity
    await logActivity(decoded.userId, 'note_delete', 'note', parseInt(noteId), 'Deleted note');

    return NextResponse.json(
      { message: 'Note deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

