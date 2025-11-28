import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

// GET - Get user's rating for a specific note
export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const searchParams = req.nextUrl.searchParams;
    const noteId = searchParams.get('note_id');

    if (!noteId) {
      return NextResponse.json({ error: 'note_id is required' }, { status: 400 });
    }

    const results: any = await query(
      'SELECT rating FROM ratings WHERE note_id = ? AND user_id = ?',
      [noteId, decoded.userId]
    );

    if (results.length > 0) {
      return NextResponse.json({ rating: results[0].rating }, { status: 200 });
    }

    return NextResponse.json({ rating: null }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

// POST - Create or update a rating
export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const { note_id, rating } = await req.json();

    if (!note_id || rating === undefined) {
      return NextResponse.json(
        { error: 'note_id and rating are required' },
        { status: 400 }
      );
    }

    if (rating < 0 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 0 and 5' },
        { status: 400 }
      );
    }

    // Check if note exists
    const noteCheck: any = await query(
      'SELECT note_id FROM notes WHERE note_id = ?',
      [note_id]
    );

    if (!Array.isArray(noteCheck) || noteCheck.length === 0) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    // Check if user already rated this note
    const existingRating: any = await query(
      'SELECT rating_id FROM ratings WHERE note_id = ? AND user_id = ?',
      [note_id, decoded.userId]
    );

    if (existingRating.length > 0) {
      // Update existing rating
      await query(
        'UPDATE ratings SET rating = ?, updated_at = CURRENT_TIMESTAMP WHERE rating_id = ?',
        [rating, existingRating[0].rating_id]
      );
    } else {
      // Create new rating
      await query(
        'INSERT INTO ratings (note_id, user_id, rating) VALUES (?, ?, ?)',
        [note_id, decoded.userId, rating]
      );
    }

    // Get updated average rating
    const avgResult: any = await query(
      'SELECT AVG(rating) as average_rating, COUNT(*) as rating_count FROM ratings WHERE note_id = ?',
      [note_id]
    );

    return NextResponse.json(
      {
        message: 'Rating submitted successfully',
        average_rating: parseFloat(avgResult[0].average_rating) || 0,
        rating_count: avgResult[0].rating_count,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}



