import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { apiHandler, requireAuth, apiError, apiResponse } from '@/lib/api-helpers';

// GET: Retrieves a user's rating for a specific note (if they've rated it)
export const GET = apiHandler(async (req: NextRequest) => {
  const user = requireAuth(req);
  const noteId = req.nextUrl.searchParams.get('note_id');
  if (!noteId) return apiError('note_id is required', 400);

  // Returns null if user hasn't rated this note yet
  const results: any = await query('SELECT rating FROM ratings WHERE note_id = ? AND user_id = ?', [noteId, user.userId]);
  return apiResponse({ rating: results[0]?.rating || null }); // Use optional chaining for safety
});

// POST: Creates or updates a rating for a note (students only)
// Implements upsert pattern: update if exists, insert if new
export const POST = apiHandler(async (req: NextRequest) => {
  const user = requireAuth(req, 'student'); // Only students can rate notes
  const { note_id, rating } = await req.json();

  // Validate rating is in valid range (0-5 stars)
  if (!note_id || rating === undefined || rating < 0 || rating > 5) {
    return apiError('Invalid note_id or rating', 400);
  }

  // Step 1: Verify note exists before allowing rating
  const noteCheck: any = await query('SELECT note_id FROM notes WHERE note_id = ?', [note_id]);
  if (!noteCheck.length) return apiError('Note not found', 404);

  // Step 2: Check if user has already rated this note
  const existing: any = await query('SELECT rating_id FROM ratings WHERE note_id = ? AND user_id = ?', [note_id, user.userId]);
  
  // Step 3: Update existing rating or insert new one
  if (existing.length) {
    // Update existing rating
    await query('UPDATE ratings SET rating = ? WHERE rating_id = ?', [rating, existing[0].rating_id]);
  } else {
    // Create new rating
    await query('INSERT INTO ratings (note_id, user_id, rating) VALUES (?, ?, ?)', [note_id, user.userId, rating]);
  }

  // Step 4: Recalculate average rating for the note
  // Using AVG() and COUNT() aggregate functions
  const avg: any = await query('SELECT AVG(rating) as average_rating, COUNT(*) as rating_count FROM ratings WHERE note_id = ?', [note_id]);
  
  return apiResponse({
    message: 'Rating submitted successfully',
    average_rating: parseFloat(avg[0].average_rating) || 0, // Handle null case (no ratings yet)
    rating_count: avg[0].rating_count,
  });
});



