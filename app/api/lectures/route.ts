import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { apiHandler, requireAuth, apiError, apiResponse } from '@/lib/api-helpers';

// GET: Retrieves lectures for a course
export const GET = apiHandler(async (req: NextRequest) => {
    requireAuth(req);
    const courseId = req.nextUrl.searchParams.get('course_id');

    if (!courseId) {
        return apiError('Course ID is required', 400);
    }

    const lectures = await query(
        `SELECT 
      l.lecture_id,
      l.course_id,
      l.lecture_date,
      l.topic,
      l.created_at,
      COUNT(DISTINCT n.note_id) as note_count
    FROM lectures l
    LEFT JOIN notes n ON l.lecture_id = n.lecture_id
    WHERE l.course_id = ?
    GROUP BY l.lecture_id
    ORDER BY l.lecture_date ASC`,
        [courseId]
    );

    return apiResponse({ lectures });
});

// POST: Creates a new lecture (instructors only)
export const POST = apiHandler(async (req: NextRequest) => {
    const user = requireAuth(req, 'instructor');
    const { course_id, lecture_date, topic } = await req.json();

    if (!course_id || !lecture_date || !topic) {
        return apiError('Course ID, lecture date, and topic are required', 400);
    }

    // Verify instructor owns the course
    const course: any = await query(
        'SELECT course_id, instructor_id FROM courses WHERE course_id = ?',
        [course_id]
    );

    if (!course.length) {
        return apiError('Course not found', 404);
    }

    if (course[0].instructor_id !== user.userId) {
        return apiError('You can only create lectures for your own courses', 403);
    }

    // Check if lecture already exists for this course and date
    const existing: any = await query(
        'SELECT lecture_id FROM lectures WHERE course_id = ? AND lecture_date = ?',
        [course_id, lecture_date]
    );

    if (existing.length > 0) {
        return apiError('A lecture already exists for this course on this date', 409);
    }

    // Create lecture
    const result: any = await query(
        'INSERT INTO lectures (course_id, lecture_date, topic) VALUES (?, ?, ?)',
        [course_id, lecture_date, topic]
    );

    return apiResponse(
        { message: 'Lecture created successfully', lecture_id: result.insertId },
        201
    );
});

