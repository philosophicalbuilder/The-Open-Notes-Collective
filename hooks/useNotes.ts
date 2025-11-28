import { useState } from 'react';

export function useNotes(courseId: number | null, searchQuery = '') {
    const [notes, setNotes] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const loadNotes = async () => {
        if (!courseId) return;
        setLoading(true);
        try {
            const url = `/api/notes?course_id=${courseId}${searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : ''}`;
            const res = await fetch(url);
            const data = await res.json();
            setNotes(data.notes || []);
        } catch (error) {
            console.error('Error loading notes:', error);
        } finally {
            setLoading(false);
        }
    };

    return { notes, loading, loadNotes };
}

