import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { logActivity } from '@/lib/api-helpers';

export async function GET(req: NextRequest) {
    try {
        const searchParams = req.nextUrl.searchParams;
        const search = searchParams.get('search') || '';
        const semesterId = searchParams.get('semester_id');
        const instructorId = searchParams.get('instructor_id');

        let sql = `
      SELECT 
        c.course_id,
        c.name,
        c.code,
        c.section_id,
        c.description,
        c.semester_id,
        s.name as semester_name,
        c.instructor_id,
        u.first_name as instructor_first_name,
        u.last_name as instructor_last_name,
        COUNT(DISTINCT e.enrollment_id) as enrollment_count
      FROM courses c
      INNER JOIN semesters s ON c.semester_id = s.semester_id
      INNER JOIN users u ON c.instructor_id = u.user_id
      LEFT JOIN enrollments e ON c.course_id = e.course_id
      WHERE 1=1
    `;
        const sqlParams = [];

        // Optional: allow explicit filtering by instructor if caller passes instructor_id
        if (instructorId) {
            sql += ` AND c.instructor_id = ?`;
            sqlParams.push(instructorId);
        }

        if (search) {
            sql += ` AND (c.name LIKE ? OR c.code LIKE ? OR c.section_id LIKE ?)`;
            const searchTerm = `%${search}%`;
            sqlParams.push(searchTerm, searchTerm, searchTerm);
        }

        if (semesterId) {
            sql += ` AND c.semester_id = ?`;
            sqlParams.push(semesterId);
        }

        sql += ` GROUP BY c.course_id ORDER BY c.created_at DESC`;

        const courses = await query(sql, sqlParams);

        // Deduplicate by course_id (in case of any edge cases)
        const uniqueCourses = (courses as any[]).reduce((acc: any[], course: any) => {
            if (!acc.find((c) => c.course_id === course.course_id)) {
                acc.push(course)
            }
            return acc
        }, [])

        return NextResponse.json({ courses: uniqueCourses }, { status: 200 });
    } catch (error: any) {
        console.error(error);
        const message =
            typeof error === 'string'
                ? error
                : error?.message || 'Something went wrong';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const token = req.cookies.get('auth-token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const decoded = verifyToken(token);
        if (!decoded || decoded.role !== 'instructor') {
            return NextResponse.json({ error: 'Forbidden - Instructor access required' }, { status: 403 });
        }

        const { name, code, section_id, description, semester_id } = await req.json();

        if (!name || !code || !section_id || !description) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Get current semester if not provided
        let finalSemesterId = semester_id;
        if (!finalSemesterId) {
            const currentSemester: any = await query(
                'SELECT semester_id FROM semesters WHERE is_current = TRUE LIMIT 1'
            );
            if (Array.isArray(currentSemester) && currentSemester.length > 0) {
                finalSemesterId = currentSemester[0].semester_id;
            } else {
                return NextResponse.json(
                    { error: 'No current semester found' },
                    { status: 400 }
                );
            }
        }

        // Create course
        const result: any = await query(
            `INSERT INTO courses (name, code, section_id, description, instructor_id, semester_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
            [name, code, section_id, description, decoded.userId, finalSemesterId]
        );

        // Log activity
        await logActivity(decoded.userId, 'course_create', 'course', result.insertId, `Created course: ${name} (${code})`);

        return NextResponse.json(
            { message: 'Course created successfully', course_id: result.insertId },
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
        if (!decoded || decoded.role !== 'instructor') {
            return NextResponse.json({ error: 'Forbidden - Instructor access required' }, { status: 403 });
        }

        const courseId = req.nextUrl.searchParams.get('course_id');
        if (!courseId) {
            return NextResponse.json(
                { error: 'Course ID is required' },
                { status: 400 }
            );
        }

        // Make sure the course exists before deleting
        const course: any = await query(
            'SELECT name, code FROM courses WHERE course_id = ?',
            [courseId]
        );

        if (!Array.isArray(course) || course.length === 0) {
            // If the course is already gone, treat this as a successful,
            // idempotent delete so the UI does not show an error.
            return NextResponse.json(
                { message: 'Course already deleted' },
                { status: 200 }
            );
        }

        // Manually clean up related data now that the schema does not use ON DELETE CASCADE

        // Best-effort cleanup of related data. If any of these fail (for example if a table
        // does not exist in the live database), we log the error but still try to delete
        // the course so instructors are not blocked.
        try {
            await query(
                `DELETE FROM ratings 
                 WHERE note_id IN (SELECT note_id FROM notes WHERE course_id = ?)`,
                [courseId]
            );
        } catch (err) {
            console.error('Error deleting ratings for course', courseId, err);
        }

        try {
            await query(
                `DELETE FROM note_views 
                 WHERE note_id IN (SELECT note_id FROM notes WHERE course_id = ?)`,
                [courseId]
            );
        } catch (err) {
            console.error('Error deleting note_views for course', courseId, err);
        }

        try {
            await query(
                'DELETE FROM notes WHERE course_id = ?',
                [courseId]
            );
        } catch (err) {
            console.error('Error deleting notes for course', courseId, err);
        }

        try {
            await query(
                'DELETE FROM enrollments WHERE course_id = ?',
                [courseId]
            );
        } catch (err) {
            console.error('Error deleting enrollments for course', courseId, err);
        }

        try {
            await query(
                'DELETE FROM note_requests WHERE course_id = ?',
                [courseId]
            );
        } catch (err) {
            console.error('Error deleting note_requests for course', courseId, err);
        }

        try {
            await query(
                'DELETE FROM lectures WHERE course_id = ?',
                [courseId]
            );
        } catch (err) {
            console.error('Error deleting lectures for course', courseId, err);
        }

        // Finally delete the course itself
        await query(
            'DELETE FROM courses WHERE course_id = ?',
            [courseId]
        );

        // Log activity
        await logActivity(decoded.userId, 'course_delete', 'course', parseInt(courseId), `Deleted course: ${course[0].name} (${course[0].code})`);

        return NextResponse.json(
            { message: 'Course deleted successfully' },
            { status: 200 }
        );
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
    }
}

