import { NextRequest } from 'next/server';
import { getUserById } from '@/lib/auth';
import { query } from '@/lib/db';
import { getAuthUser, apiResponse } from '@/lib/api-helpers';

// Returns current user session data including statistics.
// Used by frontend to check if user is logged in and get profile info.
export async function GET(req: NextRequest) {
  const user = getAuthUser(req);
  // Return null if not authenticated (not an error, just no session)
  if (!user) return apiResponse({ user: null });

  const userData = await getUserById(user.userId);
  // Handle case where token is valid but user was deleted
  if (!userData) return apiResponse({ user: null });

  // Only fetch statistics for students (instructors have different stats)
  if (user.role === 'student') {
    // Run all three queries in parallel for better performance
    // Using Promise.all instead of sequential queries
    const [notes, ratings, enrollments] = await Promise.all([
      query<any[]>('SELECT COUNT(*) as count FROM notes WHERE author_id = ?', [user.userId]),
      // Join with ratings table to calculate average rating for user's notes
      query<any[]>('SELECT AVG(r.rating) as avg_rating FROM notes n INNER JOIN ratings r ON n.note_id = r.note_id WHERE n.author_id = ?', [user.userId]),
      query<any[]>('SELECT COUNT(*) as count FROM enrollments WHERE student_id = ?', [user.userId]),
    ]);

    // Use optional chaining and default values to handle null results
    userData.uploads_count = notes[0]?.count || 0;
    // Parse float and format to 1 decimal place (e.g., "4.5")
    userData.average_rating = parseFloat(ratings[0]?.avg_rating || '0').toFixed(1);
    userData.enrolled_courses = enrollments[0]?.count || 0;
  }

  return apiResponse({ user: userData });
}
