import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth, apiError, apiResponse } from '@/lib/api-helpers';

// Tracks when a user views a note
export async function POST(
    req: NextRequest,
    context: { params: Promise<{ noteId: string }> }
) {
    try {
        const user = requireAuth(req);
        const params = await context.params;
        const noteId = parseInt(params.noteId);

        if (!noteId || isNaN(noteId)) {
            return apiError('Invalid note ID', 400);
        }

        // Check if note exists
        const note: any = await query('SELECT note_id FROM notes WHERE note_id = ?', [noteId]);
        if (!note.length) {
            return apiError('Note not found', 404);
        }

        // Insert view record (allow duplicates - user can view same note multiple times)
        await query(
            'INSERT INTO note_views (note_id, user_id) VALUES (?, ?)',
            [noteId, user.userId]
        );

        return apiResponse({ message: 'View recorded' });
    } catch (error: any) {
        console.error('API Error:', error);
        if (error.status && error.error) {
            return apiError(error.error, error.status);
        }
        return apiError('Something went wrong', 500);
    }
}
