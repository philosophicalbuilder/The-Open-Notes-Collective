import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

// GET /api/courses - List all courses (with optional search/filter)
export async function GET(request: NextRequest) {
    try {
        const token = request.cookies.get('auth-token')?.value;
        const decoded = token ? verifyToken(token) : null;

        const searchParams = request.nextUrl.searchParams;
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
        const params = [];

        // If instructor is viewing, show only their courses
        if (decoded?.role === 'instructor' && !instructorId) {
            sql += ` AND c.instructor_id = ?`;
            params.push(decoded.userId);
        } else if (instructorId) {
            sql += ` AND c.instructor_id = ?`;
            params.push(instructorId);
        }

        if (search) {
            sql += ` AND (c.name LIKE ? OR c.code LIKE ? OR c.section_id LIKE ?)`;
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        if (semesterId) {
            sql += ` AND c.semester_id = ?`;
            params.push(semesterId);
        }

        sql += ` GROUP BY c.course_id ORDER BY c.created_at DESC`;

        const courses = await query(sql, params);

        return NextResponse.json({ courses }, { status: 200 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
    }
}

// POST /api/courses - Create a new course (instructor only)
export async function POST(request: NextRequest) {
    try {
        const token = request.cookies.get('auth-token')?.value;
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const decoded = verifyToken(token);
        if (!decoded || decoded.role !== 'instructor') {
            return NextResponse.json({ error: 'Forbidden - Instructor access required' }, { status: 403 });
        }

        const body = await request.json();
        const { name, code, section_id, description, semester_id } = body;

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

        return NextResponse.json(
            { message: 'Course created successfully', course_id: result.insertId },
            { status: 201 }
        );
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
    }
}

