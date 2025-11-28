import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { apiHandler, requireAuth, apiError, apiResponse } from '@/lib/api-helpers';

// Handles course enrollment for students.
// POST: Enrolls a student in a course (students only)
export const POST = apiHandler(async (req: NextRequest) => {
  const user = requireAuth(req, 'student'); // Only students can enroll
  const { course_id } = await req.json();
  if (!course_id) return apiError('Course ID is required', 400);

  // Step 1: Verify course exists before attempting enrollment
  const course: any = await query('SELECT * FROM courses WHERE course_id = ?', [course_id]);
  if (!course.length) return apiError('Course not found', 404);

  // Step 2: Check if already enrolled to prevent duplicate enrollments
  const existing: any = await query('SELECT * FROM enrollments WHERE student_id = ? AND course_id = ?', [user.userId, course_id]);
  if (existing.length) return apiError('Already enrolled in this course', 409); // 409 = Conflict

  // Step 3: Create enrollment record
  const result: any = await query('INSERT INTO enrollments (student_id, course_id) VALUES (?, ?)', [user.userId, course_id]);
  return apiResponse({ message: 'Enrolled successfully', enrollment_id: result.insertId }, 201);
});

// GET: Retrieves enrollments for a user (students can see their own, instructors can see any)
export const GET = apiHandler(async (req: NextRequest) => {
  const user = requireAuth(req);
  // Allow querying other user's enrollments if you're an instructor, otherwise use own ID
  const userId = req.nextUrl.searchParams.get('user_id') || user.userId.toString();

  // Security check: prevent students from viewing other students' enrollments
  if (userId !== user.userId.toString() && user.role !== 'instructor') {
    return apiError('Forbidden', 403);
  }

  // Join enrollments with courses to get full course details
  // Ordered by enrollment date (newest first)
  const enrollments = await query(
    `SELECT e.enrollment_id, e.enrolled_at, c.course_id, c.name as course_name, 
     c.code as course_code, c.section_id, c.description as course_description
     FROM enrollments e INNER JOIN courses c ON e.course_id = c.course_id
     WHERE e.student_id = ? ORDER BY e.enrolled_at DESC`,
    [userId]
  );

  return apiResponse({ enrollments });
});

// DELETE: Removes a student's enrollment from a course
export const DELETE = apiHandler(async (req: NextRequest) => {
  const user = requireAuth(req);
  const courseId = req.nextUrl.searchParams.get('course_id');
  if (!courseId) return apiError('Course ID is required', 400);

  // Delete enrollment (no need to check if exists - DELETE is idempotent)
  await query('DELETE FROM enrollments WHERE student_id = ? AND course_id = ?', [user.userId, courseId]);
  return apiResponse({ message: 'Unenrolled successfully' });
});

