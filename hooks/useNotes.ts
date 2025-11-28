'use client'
import { useState, useCallback } from 'react'
import { formatDate } from '@/lib/utils'

export type NoteSummary = {
    id: number
    title: string
    description: string
    lecture: string | null
    link?: string
    author: string
    date: string
    rating: number
    view_count?: number
}

export function useNotes(courseId: number | null) {
    const [notes, setNotes] = useState<NoteSummary[]>([])
    const [loading, setLoading] = useState(false)

    const loadNotes = useCallback(
        async (searchQuery = '') => {
            if (!courseId) {
                setNotes([])
                return
            }

            setLoading(true)
            try {
                let url = `/api/notes?course_id=${courseId}`
                if (searchQuery.trim()) {
                    url += `&search=${encodeURIComponent(searchQuery.trim())}`
                }

                const res = await fetch(url)
                if (res.ok) {
                    const data = await res.json()
                    const formatted = (data.notes || []).map((note: any) => ({
                        id: note.note_id,
                        title: note.title,
                        description: note.description,
                        lecture: note.lecture,
                        link: note.link,
                        author: `${note.author_first_name} ${note.author_last_name}`,
                        date: formatDate(note.created_at),
                        rating: parseFloat(note.average_rating) || 0,
                        view_count: parseInt(note.view_count) || 0,
                    }))
                    setNotes(formatted)
                }
            } catch (error) {
                console.error('Error loading notes:', error)
            } finally {
                setLoading(false)
            }
        },
        [courseId]
    )

    return { notes, setNotes, loading, loadNotes }
}
