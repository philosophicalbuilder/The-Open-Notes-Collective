"use client"

import { useRouter } from "next/navigation"
import { User, LogOut, Send, Plus, Search, Star, CheckCircle2, Clock, Upload, Reply, ChevronDown, ChevronUp, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { useState, useEffect } from "react"
import { format } from "@/lib/utils"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useNotes, type NoteSummary } from "@/hooks/useNotes"

// Available courses will be fetched from API

type Course = {
  id: number
  name: string
  code: string
}

type Message = {
  id: number
  text: string
  timestamp: Date
  status: "pending" | "fulfilled"
  parent_id?: number | null
  author?: string
  computing_id?: string
  student_id?: number
  replies?: Message[]
}

export default function DashboardPage() {
  const router = useRouter()
  const [courses, setCourses] = useState<Course[]>([])
  const [availableCourses, setAvailableCourses] = useState<any[]>([])
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [request, setRequest] = useState("")
  const [messages, setMessages] = useState<Record<number, Message[]>>({})
  const [replyingTo, setReplyingTo] = useState<number | null>(null)
  const [replyText, setReplyText] = useState("")
  const [expandedThreads, setExpandedThreads] = useState<Set<number>>(new Set())
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [notesSearchQuery, setNotesSearchQuery] = useState("")
  const [notesSortBy, setNotesSortBy] = useState("created_at")
  const [notesSortOrder, setNotesSortOrder] = useState<"ASC" | "DESC">("DESC")
  const [showOnlyMyNotes, setShowOnlyMyNotes] = useState(false)
  const [showOnlyMyRequests, setShowOnlyMyRequests] = useState(false)
  const { notes, setNotes, loadNotes } = useNotes(selectedCourse?.id ?? null)
  const [selectedNote, setSelectedNote] = useState<NoteSummary | null>(null)
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [isSubmitNotesOpen, setIsSubmitNotesOpen] = useState(false)
  const [noteTitle, setNoteTitle] = useState("")
  const [noteDescription, setNoteDescription] = useState("")
  const [noteLecture, setNoteLecture] = useState("")
  const [noteLink, setNoteLink] = useState("")
  const [noteFile, setNoteFile] = useState<File | null>(null)
  const [uploadMethod, setUploadMethod] = useState<"link" | "file">("link")
  const [isUploading, setIsUploading] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [userRating, setUserRating] = useState<number | null>(null)
  const [isSubmittingRating, setIsSubmittingRating] = useState(false)
  const [courseToRemove, setCourseToRemove] = useState<number | null>(null)
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [isGuest, setIsGuest] = useState(false)
  const [noteToDelete, setNoteToDelete] = useState<number | null>(null)
  const [isDeleteNoteModalOpen, setIsDeleteNoteModalOpen] = useState(false)
  const [requestToDelete, setRequestToDelete] = useState<number | null>(null)
  const [isDeleteRequestModalOpen, setIsDeleteRequestModalOpen] = useState(false)
  const [userId, setUserId] = useState<number | null>(null)

  // Check for guest mode
  useEffect(() => {
    const guestMode = localStorage.getItem('guest_mode') === 'true'
    setIsGuest(guestMode)
  }, [])

  // load courses when page loads
  useEffect(() => {
    if (isGuest) {
      loadAvailableCourses()
    } else {
      loadEnrolledCourses()
      loadAvailableCourses()
      loadUserProfile()
    }
  }, [isGuest])

  const loadUserProfile = async () => {
    if (isGuest) return
    try {
      const response = await fetch('/api/auth/session')
      if (response.ok) {
        const data = await response.json()
        setUserProfile(data.user)
        setUserId(data.user?.user_id || null)
      }
    } catch (error) {
      console.error('Error loading user profile:', error)
    }
  }

  // load notes when you pick a course
  useEffect(() => {
    if (!selectedCourse) return
    loadNotes(notesSearchQuery, notesSortBy, notesSortOrder, showOnlyMyNotes)
    loadNoteRequests(selectedCourse.id, showOnlyMyRequests)
  }, [selectedCourse, loadNotes, notesSortBy, notesSortOrder, showOnlyMyNotes, showOnlyMyRequests])

  useEffect(() => {
    if (!selectedCourse) return
    const timeoutId = setTimeout(() => {
      loadNotes(notesSearchQuery, notesSortBy, notesSortOrder, showOnlyMyNotes)
    }, 300)
    return () => clearTimeout(timeoutId)
  }, [notesSearchQuery, selectedCourse, loadNotes, notesSortBy, notesSortOrder, showOnlyMyNotes])

  const loadEnrolledCourses = async () => {
    try {
      if (isGuest) {
        // For guests, use all available courses
        const response = await fetch('/api/courses')
        if (response.ok) {
          const data = await response.json()
          const uniqueCourses = (data.courses || []).reduce((acc: any[], course: any) => {
            if (!acc.find((c) => c.course_id === course.course_id)) {
              acc.push({
                id: course.course_id,
                name: course.name,
                code: course.code,
              })
            }
            return acc
          }, [])
          setCourses(uniqueCourses)
          if (uniqueCourses.length > 0 && !selectedCourse) {
            setSelectedCourse(uniqueCourses[0])
          }
        }
      } else {
        const response = await fetch('/api/enrollments')
        if (response.ok) {
          const data = await response.json()
          const enrolledCourses = data.enrollments.map((e: any) => ({
            id: e.course_id,
            name: e.course_name,
            code: e.course_code,
          }))
          setCourses(enrolledCourses)
          if (enrolledCourses.length > 0 && !selectedCourse) {
            setSelectedCourse(enrolledCourses[0])
          }
        }
      }
    } catch (error) {
      console.error('Error loading courses:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadAvailableCourses = async () => {
    try {
      const response = await fetch('/api/courses')
      if (response.ok) {
        const data = await response.json()
        // Deduplicate courses by course_id
        const uniqueCourses = (data.courses || []).reduce((acc: any[], course: any) => {
          if (!acc.find((c) => c.course_id === course.course_id)) {
            acc.push(course)
          }
          return acc
        }, [])
        setAvailableCourses(uniqueCourses)
      }
    } catch (error) {
      console.error('Error loading available courses:', error)
    }
  }

  const loadNoteRequests = async (courseId: number, mine: boolean = false) => {
    try {
      let url = `/api/note-requests?course_id=${courseId}`
      if (mine) {
        url += `&mine=true`
      }
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        const allRequests = (data.requests || []).map((req: any) => ({
          id: req.request_id,
          text: req.request_text,
          timestamp: new Date(req.created_at),
          status: req.status,
          parent_id: req.parent_request_id,
          author: `${req.first_name} ${req.last_name}`,
          computing_id: req.computing_id,
          student_id: req.student_id,
          replies: [],
        }))

        // Build threaded structure
        const topLevel: Message[] = []
        const replyMap = new Map<number, Message>()

        // First pass: create all messages
        allRequests.forEach((msg: Message) => {
          replyMap.set(msg.id, msg)
        })

        // Second pass: build tree structure
        allRequests.forEach((msg: Message) => {
          if (msg.parent_id) {
            const parent = replyMap.get(msg.parent_id)
            if (parent) {
              if (!parent.replies) parent.replies = []
              parent.replies.push(msg)
            }
          } else {
            topLevel.push(msg)
          }
        })

        // Sort top level by timestamp (newest first), replies by timestamp (oldest first)
        topLevel.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        topLevel.forEach((msg) => {
          if (msg.replies) {
            msg.replies.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
          }
        })

        setMessages((prev) => ({
          ...prev,
          [courseId]: topLevel,
        }))
      }
    } catch (error) {
      console.error('Error loading note requests:', error)
    }
  }

  const handleLogout = () => {
    // delete cookie and go back to home
    document.cookie = 'auth-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
    router.push("/")
  }

  const handleAddCourse = async (courseToAdd: any) => {
    try {
      const response = await fetch('/api/enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ course_id: courseToAdd.course_id }),
      })

      if (response.ok) {
        // reload the courses list
        await loadEnrolledCourses()
        setIsDialogOpen(false)
        setSearchQuery("")
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to enroll in course')
      }
    } catch (error) {
      console.error('Error enrolling in course:', error)
      alert('Failed to enroll in course')
    }
  }

  const handleRemoveCourse = async (courseId: number, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent selecting the course when clicking remove
    setCourseToRemove(courseId)
    setIsRemoveModalOpen(true)
  }

  const confirmRemoveCourse = async () => {
    if (!courseToRemove) return

    try {
      const response = await fetch(`/api/enrollments?course_id=${courseToRemove}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        // If the removed course was selected, clear selection
        if (selectedCourse?.id === courseToRemove) {
          setSelectedCourse(null)
        }
        // Reload the courses list
        await loadEnrolledCourses()
        setIsRemoveModalOpen(false)
        setCourseToRemove(null)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to remove course')
      }
    } catch (error) {
      console.error('Error removing course:', error)
      alert('Failed to remove course')
    }
  }

  const handleSubmitRequest = async () => {
    if (request.trim() && selectedCourse) {
      try {
        const response = await fetch('/api/note-requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            course_id: selectedCourse.id,
            request_text: request.trim(),
            parent_request_id: replyingTo || null,
          }),
        })

        if (response.ok) {
          // Reload note requests
          await loadNoteRequests(selectedCourse.id, showOnlyMyRequests)
          setRequest("")
          setReplyText("")
          // Keep thread expanded after replying
          if (replyingTo) {
            const newExpanded = new Set(expandedThreads)
            newExpanded.add(replyingTo)
            setExpandedThreads(newExpanded)
          }
          setReplyingTo(null)
        } else {
          const error = await response.json()
          alert(error.error || 'Failed to submit request')
        }
      } catch (error) {
        console.error('Error submitting request:', error)
        alert('Failed to submit request')
      }
    }
  }

  const handleSubmitReply = async (parentId: number) => {
    if (replyText.trim() && selectedCourse) {
      try {
        const response = await fetch('/api/note-requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            course_id: selectedCourse.id,
            request_text: replyText.trim(),
            parent_request_id: parentId,
          }),
        })

        if (response.ok) {
          // Reload note requests
          await loadNoteRequests(selectedCourse.id, showOnlyMyRequests)
          setReplyText("")
          setReplyingTo(null)
        } else {
          const error = await response.json()
          alert(error.error || 'Failed to submit reply')
        }
      } catch (error) {
        console.error('Error submitting reply:', error)
        alert('Failed to submit reply')
      }
    }
  }

  const toggleRequestStatus = async (messageId: number) => {
    if (!selectedCourse) return

    const currentMessage = messages[selectedCourse.id]?.find((m) => m.id === messageId)
    if (!currentMessage) return

    const newStatus = currentMessage.status === "pending" ? "fulfilled" : "pending"

    try {
      const response = await fetch(`/api/note-requests?id=${messageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        // Reload note requests
        await loadNoteRequests(selectedCourse.id, showOnlyMyRequests)
      } else {
        alert('Failed to update request status')
      }
    } catch (error) {
      console.error('Error updating request status:', error)
      alert('Failed to update request status')
    }
  }

  const handleDeleteNote = async (noteId: number, e: React.MouseEvent) => {
    e.stopPropagation()
    setNoteToDelete(noteId)
    setIsDeleteNoteModalOpen(true)
  }

  const confirmDeleteNote = async () => {
    if (!noteToDelete || !selectedCourse) return

    try {
      const response = await fetch(`/api/notes?note_id=${noteToDelete}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        // Reload notes
        await loadNotes(notesSearchQuery, notesSortBy, notesSortOrder, showOnlyMyNotes)
        setIsDeleteNoteModalOpen(false)
        setNoteToDelete(null)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to delete note')
      }
    } catch (error) {
      console.error('Error deleting note:', error)
      alert('Failed to delete note')
    }
  }

  const handleDeleteRequest = async (requestId: number, e: React.MouseEvent) => {
    e.stopPropagation()
    setRequestToDelete(requestId)
    setIsDeleteRequestModalOpen(true)
  }

  const confirmDeleteRequest = async () => {
    if (!requestToDelete || !selectedCourse) return

    try {
      const response = await fetch(`/api/note-requests?id=${requestToDelete}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        // Reload note requests
        await loadNoteRequests(selectedCourse.id, showOnlyMyRequests)
        setIsDeleteRequestModalOpen(false)
        setRequestToDelete(null)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to delete request')
      }
    } catch (error) {
      console.error('Error deleting request:', error)
      alert('Failed to delete request')
    }
  }

  const handleSubmitNote = async () => {
    if (!noteTitle.trim() || !noteDescription.trim() || !noteLecture || !selectedCourse) {
      alert('Please fill in all required fields')
      return
    }

    // Validate that either link or file is provided
    if (uploadMethod === "link" && !noteLink.trim()) {
      alert('Please provide a link or upload a file')
      return
    }

    if (uploadMethod === "file" && !noteFile) {
      alert('Please select a file to upload')
      return
    }

    try {
      setIsUploading(true)
      let finalLink = noteLink.trim()

      // If uploading a file, upload it first
      if (uploadMethod === "file" && noteFile) {
        const formData = new FormData()
        formData.append('file', noteFile)

        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })

        if (!uploadResponse.ok) {
          const error = await uploadResponse.json()
          alert(error.error || 'Failed to upload file')
          setIsUploading(false)
          return
        }

        const uploadData = await uploadResponse.json()
        finalLink = uploadData.url
      }

      // Submit the note
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: noteTitle.trim(),
          description: noteDescription.trim(),
          lecture: noteLecture,
          link: uploadMethod === "link" ? finalLink : undefined,
          file_url: uploadMethod === "file" ? finalLink : undefined,
          course_id: selectedCourse.id,
        }),
      })

      if (response.ok) {
        // Reload notes for this course
        await loadNotes(notesSearchQuery, notesSortBy, notesSortOrder, showOnlyMyNotes)

        // Reset form
        setNoteTitle("")
        setNoteDescription("")
        setNoteLecture("")
        setNoteLink("")
        setNoteFile(null)
        setUploadMethod("link")
        setIsSubmitNotesOpen(false)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to submit note')
      }
    } catch (error) {
      console.error('Error submitting note:', error)
      alert('Failed to submit note')
    } finally {
      setIsUploading(false)
    }
  }

  const loadUserRating = async (noteId: number) => {
    try {
      const response = await fetch(`/api/ratings?note_id=${noteId}`)
      if (response.ok) {
        const data = await response.json()
        setUserRating(data.rating)
      }
    } catch (error) {
      console.error('Error loading user rating:', error)
      setUserRating(null)
    }
  }

  const submitRating = async (noteId: number, rating: number) => {
    if (!selectedNote) return

    try {
      setIsSubmittingRating(true)
      const response = await fetch('/api/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          note_id: noteId,
          rating: rating,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setUserRating(rating)
        // Update the selected note's rating
        setSelectedNote({
          ...selectedNote,
          rating: data.average_rating,
        })
        // Update the note in the list
        setNotes((prev) =>
          prev.map((note) =>
            note.id === noteId ? { ...note, rating: data.average_rating } : note
          )
        )
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to submit rating')
      }
    } catch (error) {
      console.error('Error submitting rating:', error)
      alert('Failed to submit rating')
    } finally {
      setIsSubmittingRating(false)
    }
  }

  const filteredAvailableCourses = availableCourses.filter((course: any) => {
    // Filter by search query only - show all courses even if enrolled
    const matchesSearch =
      course.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.section_id?.toLowerCase().includes(searchQuery.toLowerCase())

    return matchesSearch
  })

  const currentMessages = selectedCourse ? messages[selectedCourse.id] || [] : []
  const currentSubmissions = selectedCourse ? notes : []

  // Notes are already filtered by the API, so we can use them directly
  // But we'll keep client-side filtering as a fallback for author search
  const filteredSubmissions = currentSubmissions.filter((submission) => {
    if (!notesSearchQuery.trim()) return true
    const query = notesSearchQuery.toLowerCase()
    // API handles title and description, but we can also filter by author client-side
    return (
      submission.title.toLowerCase().includes(query) ||
      submission.author.toLowerCase().includes(query) ||
      submission.description.toLowerCase().includes(query) ||
      submission.lecture?.toLowerCase().includes(query)
    )
  })

  return (
    <div className="flex min-h-screen bg-neutral-50">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-neutral-200 flex flex-col">
        <div className="flex-1">
          <div className="p-4 pb-4 border-b border-neutral-200 flex justify-center">
            <Image
              src="/open-notes-collective-logo.png"
              alt="The Open Notes Collective"
              width={120}
              height={120}
              className="w-28 h-auto"
            />
          </div>

          <nav className="px-4 pt-6">
            <div className="space-y-1">
              <div className="px-3 py-2">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-foreground">{isGuest ? "All Courses" : "My Courses"}</h2>
                  {!isGuest && (
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                          <DialogTitle>Add Course</DialogTitle>
                          <DialogDescription>
                            Search and add courses to your list. Courses can only be added by instructors.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="Search courses..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="pl-9"
                            />
                          </div>
                          <div className="space-y-2 max-h-[400px] overflow-y-auto">
                            {filteredAvailableCourses.length === 0 ? (
                              <p className="text-sm text-muted-foreground text-center py-4">
                                {searchQuery ? 'No courses found' : 'No courses available'}
                              </p>
                            ) : (
                              filteredAvailableCourses.map((course: any) => {
                                const isAdded = courses.find((c) => c.id === course.course_id)
                                return (
                                  <button
                                    key={course.course_id}
                                    onClick={() => !isAdded && handleAddCourse(course)}
                                    disabled={!!isAdded}
                                    className={`w-full text-left p-3 rounded-lg border transition-colors ${isAdded
                                      ? "border-neutral-200 bg-neutral-50 cursor-not-allowed opacity-60"
                                      : "border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50"
                                      }`}
                                  >
                                    <div className="font-medium text-sm">{course.name}</div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                      [{course.code}] Section {course.section_id} - {course.semester_name || 'Fall 2025'}
                                    </div>
                                    {isAdded && <div className="text-xs text-muted-foreground mt-1">Already enrolled</div>}
                                  </button>
                                )
                              })
                            )}
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
                <div className="space-y-2">
                  {courses.length === 0 ? (
                    <p className="text-xs text-muted-foreground px-3 py-2">No courses yet</p>
                  ) : (
                    courses.map((course) => (
                      <div
                        key={course.id}
                        className={`group relative w-full px-3 py-2 rounded-md text-sm transition-colors ${selectedCourse?.id === course.id
                          ? "bg-neutral-100 text-foreground"
                          : "text-muted-foreground hover:bg-neutral-50"
                          }`}
                      >
                        <button
                          onClick={() => setSelectedCourse(course)}
                          className="w-full text-left"
                        >
                          <div className="font-medium">{course.name}</div>
                          <div className="text-xs opacity-70">[{course.code}]</div>
                        </button>
                        {!isGuest && (
                          <button
                            onClick={(e) => handleRemoveCourse(course.id, e)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-neutral-200 rounded text-muted-foreground hover:text-foreground"
                            title="Remove course"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </nav>
        </div>

        <div className="p-4 border-t border-neutral-200 space-y-2">
          {!isGuest && (
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 text-sm"
              onClick={() => setIsProfileModalOpen(true)}
            >
              <User className="h-4 w-4" />
              Profile
            </Button>
          )}
          {isGuest ? (
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 text-sm text-muted-foreground hover:text-foreground"
              onClick={() => {
                localStorage.removeItem('guest_mode')
                router.push('/')
              }}
            >
              <LogOut className="h-4 w-4" />
              Sign In
            </Button>
          ) : (
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 text-sm text-muted-foreground hover:text-foreground"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 relative">
        <div className="max-w-4xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-1">Fall 2025</h1>
            <p className="text-sm text-muted-foreground">Current Semester</p>
          </div>

          {/* Guest Mode Banner */}
          {isGuest && (
            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <User className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-900">You're browsing as a guest</p>
                  <p className="text-xs text-blue-700">Sign in to submit notes, rate content, and enroll in courses</p>
                </div>
              </div>
              <Button
                onClick={() => {
                  localStorage.removeItem('guest_mode')
                  router.push('/')
                }}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Sign In
              </Button>
            </div>
          )}

          {selectedCourse ? (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-foreground">Notes for {selectedCourse.name}</h2>

              <div className="flex items-center gap-3 mb-4 flex-wrap">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search notes by title, description, author, or lecture..."
                    value={notesSearchQuery}
                    onChange={(e) => setNotesSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select
                  value={notesSortBy}
                  onValueChange={(value) => {
                    setNotesSortBy(value)
                    if (value === 'rating') {
                      setNotesSortOrder('DESC')
                    }
                  }}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Sort by..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="created_at">Recent</SelectItem>
                    <SelectItem value="rating">Highest Rated</SelectItem>
                  </SelectContent>
                </Select>
                {!isGuest && (
                  <Button
                    type="button"
                    variant={showOnlyMyNotes ? "default" : "outline"}
                    onClick={() => setShowOnlyMyNotes((prev) => !prev)}
                    className="whitespace-nowrap"
                  >
                    {showOnlyMyNotes ? "Showing my notes" : "Posted by me"}
                  </Button>
                )}
                {!isGuest && (
                  <Dialog open={isSubmitNotesOpen} onOpenChange={setIsSubmitNotesOpen}>
                    <DialogTrigger asChild>
                      <Button className="gap-2">
                        <Upload className="h-4 w-4" />
                        Submit Notes
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                      <DialogHeader>
                        <DialogTitle>Submit Notes for {selectedCourse.name}</DialogTitle>
                        <DialogDescription>Share your notes with classmates. All fields are required.</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="note-title">Title</Label>
                          <Input
                            id="note-title"
                            placeholder="e.g., SQL Joins and Aggregations"
                            value={noteTitle}
                            onChange={(e) => setNoteTitle(e.target.value)}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="note-lecture">Lecture</Label>
                          <Select value={noteLecture} onValueChange={setNoteLecture}>
                            <SelectTrigger id="note-lecture">
                              <SelectValue placeholder="Select lecture" />
                            </SelectTrigger>
                            <SelectContent>
                              {[...Array(15)].map((_, i) => (
                                <SelectItem key={i + 1} value={`Lecture ${i + 1}`}>
                                  Lecture {i + 1}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="note-description">Description</Label>
                          <Textarea
                            id="note-description"
                            placeholder="Describe what topics are covered in these notes..."
                            value={noteDescription}
                            onChange={(e) => setNoteDescription(e.target.value)}
                            className="min-h-[100px] resize-none"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Upload Method</Label>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant={uploadMethod === "link" ? "default" : "outline"}
                              onClick={() => {
                                setUploadMethod("link")
                                setNoteFile(null)
                              }}
                              className="flex-1"
                            >
                              Link
                            </Button>
                            <Button
                              type="button"
                              variant={uploadMethod === "file" ? "default" : "outline"}
                              onClick={() => {
                                setUploadMethod("file")
                                setNoteLink("")
                              }}
                              className="flex-1"
                            >
                              Upload File
                            </Button>
                          </div>
                        </div>

                        {uploadMethod === "link" ? (
                          <div className="space-y-2">
                            <Label htmlFor="note-link">Link</Label>
                            <Input
                              id="note-link"
                              type="url"
                              placeholder="https://drive.google.com/file/..."
                              value={noteLink}
                              onChange={(e) => setNoteLink(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">
                              Paste a link to your notes (Google Drive, Dropbox, OneDrive, etc.)
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <Label htmlFor="note-file">File</Label>
                            <Input
                              id="note-file"
                              type="file"
                              accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.png,.jpg,.jpeg"
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) {
                                  if (file.size > 50 * 1024 * 1024) {
                                    alert('File size must be less than 50MB')
                                    e.target.value = ''
                                    return
                                  }
                                  setNoteFile(file)
                                }
                              }}
                              className="cursor-pointer"
                            />
                            {noteFile && (
                              <div className="text-sm text-muted-foreground p-2 bg-neutral-50 rounded border">
                                Selected: {noteFile.name} ({(noteFile.size / 1024 / 1024).toFixed(2)} MB)
                              </div>
                            )}
                            <p className="text-xs text-muted-foreground">
                              Upload PDF, Word, PowerPoint, Text, or Image files (max 50MB)
                            </p>
                          </div>
                        )}

                        <Button
                          onClick={handleSubmitNote}
                          disabled={
                            isUploading ||
                            !noteTitle.trim() ||
                            !noteDescription.trim() ||
                            !noteLecture ||
                            (uploadMethod === "link" && !noteLink.trim()) ||
                            (uploadMethod === "file" && !noteFile)
                          }
                          className="w-full"
                        >
                          {isUploading ? "Uploading..." : "Submit Notes"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>

              {currentSubmissions.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredSubmissions.length > 0 ? (
                    filteredSubmissions.map((submission) => (
                      <div
                        key={submission.id}
                        className="bg-white border border-neutral-200 rounded-lg p-4 hover:shadow-md transition-shadow relative group"
                      >
                        <div
                          onClick={async () => {
                            setSelectedNote(submission)
                            setIsNoteModalOpen(true)
                            // Load user's rating for this note
                            await loadUserRating(submission.id)
                          }}
                          className="cursor-pointer"
                        >
                          <h3 className="font-semibold text-foreground mb-2">{submission.title}</h3>
                          <div className="text-xs font-medium text-blue-600 mb-2">{submission.lecture}</div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                            <span>{submission.author}</span>
                            <span>&middot;</span>
                            <span>{submission.date}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="flex items-center gap-1">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-4 w-4 ${i < Math.floor(submission.rating)
                                    ? "fill-yellow-400 text-yellow-400"
                                    : i < submission.rating
                                      ? "fill-yellow-400 text-yellow-400"
                                      : "text-neutral-300"
                                    }`}
                                />
                              ))}
                            </div>
                            <span className="text-sm font-medium text-foreground ml-1">{submission.rating.toFixed(1)}</span>
                          </div>
                        </div>
                        {!isGuest && submission.author_id === userId && (
                          <button
                            onClick={(e) => handleDeleteNote(submission.id, e)}
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-100 rounded text-red-600 hover:text-red-700"
                            title="Delete note"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="col-span-2 text-center py-8 text-muted-foreground">
                      {notesSearchQuery ? (
                        <>No notes found matching "{notesSearchQuery}"</>
                      ) : (
                        <>No notes available yet</>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white border border-neutral-200 rounded-lg p-6">
                  <p className="text-muted-foreground">
                    {notesSearchQuery ? (
                      <>No notes found matching "{notesSearchQuery}"</>
                    ) : (
                      <>No notes available yet for {selectedCourse.name}. Be the first to submit notes!</>
                    )}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white border border-neutral-200 rounded-lg p-6">
              <p className="text-muted-foreground">
                Welcome to Open Notes Collective. Select a course to get started.
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Right Sidebar */}
      {selectedCourse && (
        <aside className="w-80 bg-white border-l border-neutral-200 flex flex-col">
          <div className="p-6 border-b border-neutral-200">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold text-foreground">Live Notes Request for {selectedCourse.name}</h2>
            </div>
            {!isGuest && (
              <Button
                type="button"
                variant={showOnlyMyRequests ? "default" : "outline"}
                size="sm"
                onClick={() => setShowOnlyMyRequests((prev) => !prev)}
                className="w-full mt-2"
              >
                {showOnlyMyRequests ? "Showing my requests" : "Posted by me"}
              </Button>
            )}
          </div>

          <div className="flex-1 p-6 overflow-y-auto">
            {currentMessages.length === 0 ? (
              <p className="text-sm text-muted-foreground">No requests yet. Submit your first request below.</p>
            ) : (
              <div className="space-y-4">
                {currentMessages.map((message) => (
                  <div key={message.id} className="bg-neutral-50 rounded-lg p-3 border border-neutral-200 relative group">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-1">
                        {!isGuest && (
                          <button
                            onClick={() => toggleRequestStatus(message.id)}
                            className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded transition-colors ${message.status === "fulfilled"
                              ? "bg-green-100 text-green-700 hover:bg-green-200"
                              : "bg-amber-100 text-amber-700 hover:bg-amber-200"
                              }`}
                          >
                            {message.status === "fulfilled" ? (
                              <>
                                <CheckCircle2 className="h-3 w-3" />
                                Fulfilled
                              </>
                            ) : (
                              <>
                                <Clock className="h-3 w-3" />
                                Pending
                              </>
                            )}
                          </button>
                        )}
                        {message.author && (
                          <span className="text-xs text-muted-foreground">{message.author}</span>
                        )}
                      </div>
                      {!isGuest && message.student_id === userId && (
                        <button
                          onClick={(e) => handleDeleteRequest(message.id, e)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-100 rounded text-red-600 hover:text-red-700"
                          title="Delete request"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-foreground">{message.text}</p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-muted-foreground">
                        {format(message.timestamp, 'h:mm a')}
                      </p>
                      <div className="flex items-center gap-3">
                        {message.replies && message.replies.length > 0 && (
                          <button
                            onClick={() => {
                              const newExpanded = new Set(expandedThreads)
                              if (newExpanded.has(message.id)) {
                                newExpanded.delete(message.id)
                              } else {
                                newExpanded.add(message.id)
                              }
                              setExpandedThreads(newExpanded)
                            }}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {expandedThreads.has(message.id) ? (
                              <>
                                <ChevronUp className="h-3 w-3" />
                                Hide {message.replies.length} {message.replies.length === 1 ? 'reply' : 'replies'}
                              </>
                            ) : (
                              <>
                                <ChevronDown className="h-3 w-3" />
                                View {message.replies.length} {message.replies.length === 1 ? 'reply' : 'replies'}
                              </>
                            )}
                          </button>
                        )}
                        {!isGuest && replyingTo !== message.id && (
                          <button
                            onClick={() => {
                              setReplyingTo(message.id)
                              // Auto-expand thread when replying
                              if (!expandedThreads.has(message.id)) {
                                const newExpanded = new Set(expandedThreads)
                                newExpanded.add(message.id)
                                setExpandedThreads(newExpanded)
                              }
                            }}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Reply className="h-3 w-3" />
                            Reply
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Replies section - only show if expanded */}
                    {(expandedThreads.has(message.id) || replyingTo === message.id) && (
                      <div className="mt-3 pt-3 border-t border-neutral-200 space-y-2">
                        {/* Existing replies */}
                        {message.replies && message.replies.length > 0 && (
                          <>
                            {message.replies.map((reply) => (
                              <div key={reply.id} className="bg-white rounded p-2 border border-neutral-200 ml-2 relative group">
                                <div className="flex items-center gap-2 mb-1">
                                  {reply.author && (
                                    <span className="text-xs font-medium text-foreground">{reply.author}</span>
                                  )}
                                  <span className="text-xs text-muted-foreground">
                                    {reply.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                  </span>
                                </div>
                                <p className="text-sm text-foreground">{reply.text}</p>
                                {!isGuest && reply.student_id === userId && (
                                  <button
                                    onClick={(e) => handleDeleteRequest(reply.id, e)}
                                    className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-100 rounded text-red-600 hover:text-red-700"
                                    title="Delete reply"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </>
                        )}

                        {/* Reply input - appears at the bottom of replies */}
                        {!isGuest && replyingTo === message.id && (
                          <div className="bg-white rounded p-2 border border-neutral-200 ml-2">
                            <Textarea
                              placeholder="Type your reply..."
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              className="min-h-[60px] resize-none mb-2"
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey && e.ctrlKey) {
                                  e.preventDefault()
                                  if (replyText.trim()) handleSubmitReply(message.id)
                                }
                              }}
                            />
                            <div className="flex gap-2">
                              <Button
                                onClick={() => handleSubmitReply(message.id)}
                                size="sm"
                                disabled={!replyText.trim()}
                                className="h-7 text-xs"
                              >
                                <Send className="h-3 w-3 mr-1" />
                                Reply
                              </Button>
                              <Button
                                onClick={() => {
                                  setReplyingTo(null)
                                  setReplyText("")
                                  // Keep thread expanded if there are replies
                                  if (!message.replies || message.replies.length === 0) {
                                    const newExpanded = new Set(expandedThreads)
                                    newExpanded.delete(message.id)
                                    setExpandedThreads(newExpanded)
                                  }
                                }}
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs"
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 border-t border-neutral-200">
            {!isGuest && replyingTo === null ? (
              <div className="relative">
                <Textarea
                  placeholder="Type your live notes request..."
                  value={request}
                  onChange={(e) => setRequest(e.target.value)}
                  className="min-h-[80px] resize-none pr-12"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && e.ctrlKey) {
                      e.preventDefault()
                      if (request.trim()) handleSubmitRequest()
                    }
                  }}
                />
                <Button
                  onClick={handleSubmitRequest}
                  size="icon"
                  disabled={!request.trim()}
                  className="absolute top-1/2 -translate-y-1/2 right-2 h-8 w-8"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground text-center py-2">
                Replying to a message above. Click "Cancel" to start a new request.
              </div>
            )}
            {isGuest && (
              <div className="text-xs text-muted-foreground text-center py-4 border border-neutral-200 rounded-lg bg-neutral-50">
                Sign in to create note requests and reply to messages
              </div>
            )}
          </div>
        </aside>
      )}

      {/* Note Detail Modal */}
      <Dialog open={isNoteModalOpen} onOpenChange={(open) => {
        setIsNoteModalOpen(open)
        if (!open) {
          setUserRating(null)
        }
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{selectedNote?.title}</DialogTitle>
            {selectedNote && <div className="text-sm font-medium text-blue-600 pt-1">{selectedNote.lecture}</div>}
          </DialogHeader>
          {selectedNote && (
            <div className="space-y-4 py-2">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Description</h4>
                <p className="text-sm text-foreground">{selectedNote.description}</p>
              </div>

              <div className="flex items-center gap-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Uploaded By</h4>
                  <p className="text-sm text-foreground">{selectedNote.author}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Date</h4>
                  <p className="text-sm text-foreground">{selectedNote.date}</p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Link pasted by poster</h4>
                <a
                  href={selectedNote.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-700 hover:underline break-all"
                >
                  {selectedNote.link}
                </a>
              </div>

              <div className="space-y-2 pt-2">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => {
                      const starValue = i + 1
                      const isFilled = i < Math.floor(selectedNote.rating) || (i < selectedNote.rating && selectedNote.rating % 1 >= 0.5)
                      const isUserRating = userRating !== null && starValue <= userRating

                      return (
                        <Star
                          key={i}
                          onClick={() => {
                            if (!isGuest && !isSubmittingRating && selectedNote) {
                              submitRating(selectedNote.id, starValue)
                            }
                          }}
                          className={`h-5 w-5 transition-colors ${isGuest
                            ? "text-yellow-400"
                            : "cursor-pointer"
                            } ${isUserRating
                              ? "fill-yellow-500 text-yellow-500"
                              : isFilled
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-neutral-300"
                            } ${isSubmittingRating ? "opacity-50 cursor-not-allowed" : !isGuest ? "hover:text-yellow-400" : ""}`}
                        />
                      )
                    })}
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    {selectedNote.rating.toFixed(1)} / 5.0
                  </span>
                  {!isGuest && userRating !== null && (
                    <span className="text-xs text-muted-foreground">
                      (Your rating: {userRating}/5)
                    </span>
                  )}
                </div>
                {!isGuest && (
                  <p className="text-xs text-muted-foreground">
                    Click a star to rate this note
                  </p>
                )}
                {isGuest && (
                  <p className="text-xs text-muted-foreground">
                    Sign in to rate this note
                  </p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Profile Modal */}
      <Dialog open={isProfileModalOpen} onOpenChange={setIsProfileModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Student Profile</DialogTitle>
            <DialogDescription>Your account information and statistics</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {userProfile ? (
              <>
                {/* Personal Information */}
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Name</h4>
                    <p className="text-sm text-foreground">
                      {userProfile.first_name} {userProfile.middle_name ? `${userProfile.middle_name} ` : ''}{userProfile.last_name}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">Computing ID</h4>
                      <p className="text-sm text-foreground">{userProfile.computing_id}</p>
                    </div>
                    {userProfile.role === 'student' && (
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-1">Student Type</h4>
                        <p className="text-sm text-foreground">
                          {userProfile.student_type === 'sdac' ? 'SDAC Student' : userProfile.student_type === 'non-sdac' ? 'Non-SDAC Student' : 'N/A'}
                        </p>
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Email</h4>
                    <p className="text-sm text-foreground">{userProfile.email}</p>
                  </div>

                  {userProfile.phone && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">Phone</h4>
                      <p className="text-sm text-foreground">{userProfile.phone}</p>
                    </div>
                  )}
                </div>

                {/* Statistics */}
                {userProfile.role === 'student' && userProfile.stats && (
                  <div className="pt-4 border-t border-neutral-200">
                    <h3 className="text-sm font-semibold text-foreground mb-3">Statistics</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-3 bg-neutral-50 rounded-lg">
                        <div className="text-2xl font-bold text-foreground">{userProfile.stats.enrolled_courses || 0}</div>
                        <div className="text-xs text-muted-foreground mt-1">Enrolled Courses</div>
                      </div>
                      <div className="text-center p-3 bg-neutral-50 rounded-lg">
                        <div className="text-2xl font-bold text-foreground">{userProfile.stats.notes_count || 0}</div>
                        <div className="text-xs text-muted-foreground mt-1">Uploads</div>
                      </div>
                      <div className="text-center p-3 bg-neutral-50 rounded-lg">
                        <div className="text-2xl font-bold text-foreground">{userProfile.stats.average_rating || '0.0'}</div>
                        <div className="text-xs text-muted-foreground mt-1">Avg Rating</div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Loading profile...</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Remove Course Confirmation Modal */}
      <Dialog open={isRemoveModalOpen} onOpenChange={setIsRemoveModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Remove Course</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this course from your list?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsRemoveModalOpen(false)
                setCourseToRemove(null)
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmRemoveCourse}
            >
              Remove
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Note Confirmation Modal */}
      <Dialog open={isDeleteNoteModalOpen} onOpenChange={setIsDeleteNoteModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete Note</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this note? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteNoteModalOpen(false)
                setNoteToDelete(null)
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteNote}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Request Confirmation Modal */}
      <Dialog open={isDeleteRequestModalOpen} onOpenChange={setIsDeleteRequestModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete Request</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this request? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteRequestModalOpen(false)
                setRequestToDelete(null)
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteRequest}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
