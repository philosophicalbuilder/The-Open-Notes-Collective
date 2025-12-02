import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { isGuest } from '@/lib/api-helpers';

export async function GET(req: NextRequest) {
  try {
    const courseId = req.nextUrl.searchParams.get('course_id');
    const mine = req.nextUrl.searchParams.get('mine') === 'true';

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

    // Get user ID if filtering by "mine"
    let userId: number | null = null;
    if (mine && !guest && decoded) {
      userId = decoded.userId;
    }

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

    let sql = `
      SELECT 
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
    `;
    const sqlParams: any[] = [];
    sqlParams.push(courseId);

    if (mine && userId) {
      sql += ` AND r.student_id = ?`;
      sqlParams.push(userId);
    }

    sql += ` ORDER BY r.created_at ASC`;

    const requests = await query(sql, sqlParams, guest);

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

export async function DELETE(req: NextRequest) {
  try {
    const token = req.cookies.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const requestId = req.nextUrl.searchParams.get('id');
    if (!requestId) {
      return NextResponse.json(
        { error: 'Request ID is required' },
        { status: 400 }
      );
    }

    // Get the note request and verify ownership
    const request: any = await query(
      'SELECT student_id, parent_request_id FROM note_requests WHERE request_id = ?',
      [requestId]
    );

    if (!Array.isArray(request) || request.length === 0) {
      return NextResponse.json(
        { error: 'Request not found' },
        { status: 404 }
      );
    }

    // Only allow users to delete their own requests
    if (request[0].student_id !== decoded.userId) {
      return NextResponse.json(
        { error: 'You can only delete your own requests' },
        { status: 403 }
      );
    }

    // Check if this request has replies (children)
    const replies: any = await query(
      'SELECT request_id FROM note_requests WHERE parent_request_id = ?',
      [requestId]
    );

    if (Array.isArray(replies) && replies.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete a request that has replies. Please delete the replies first.' },
        { status: 400 }
      );
    }

    // Delete the request (cascade will handle child requests if any)
    await query(
      'DELETE FROM note_requests WHERE request_id = ?',
      [requestId]
    );

    return NextResponse.json(
      { message: 'Request deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

