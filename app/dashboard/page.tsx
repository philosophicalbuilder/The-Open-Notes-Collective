"use client"

import { useRouter } from "next/navigation"
import { User, LogOut, Send, Plus, Search, Star, CheckCircle2, Clock, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { useState, useEffect } from "react"
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

// Available courses will be fetched from API

type NoteSubmission = {
  id: number
  title: string
  author: string
  date: string
  rating: number
  description: string
  link: string
  lecture: string
}

const initialNoteSubmissions: Record<number, NoteSubmission[]> = {
  1: [
    {
      id: 1,
      title: "SQL Joins and Aggregations",
      author: "Sarah Chen",
      date: "Nov 20, 2025",
      rating: 4.5,
      description:
        "Comprehensive notes covering INNER JOIN, LEFT JOIN, RIGHT JOIN, and common aggregate functions like COUNT, SUM, AVG. Includes practical examples and common pitfalls to avoid.",
      link: "https://drive.google.com/file/d/example1",
      lecture: "Lecture 3",
    },
    {
      id: 2,
      title: "Database Normalization Guide",
      author: "Michael Johnson",
      date: "Nov 19, 2025",
      rating: 4.8,
      description:
        "Step-by-step guide through 1NF, 2NF, 3NF, and BCNF with real-world examples. Explains functional dependencies and how to identify normalization opportunities.",
      link: "https://www.dropbox.com/s/example2",
      lecture: "Lecture 5",
    },
    {
      id: 3,
      title: "Transaction Management Notes",
      author: "Emily Rodriguez",
      date: "Nov 18, 2025",
      rating: 4.2,
      description:
        "Detailed explanation of transaction properties, isolation levels, and deadlock prevention strategies. Includes diagrams and pseudocode examples.",
      link: "https://drive.google.com/file/d/example3",
      lecture: "Lecture 8",
    },
    {
      id: 4,
      title: "Indexing and Query Optimization",
      author: "James Park",
      date: "Nov 17, 2025",
      rating: 4.6,
      description:
        "Notes on B-tree and hash indexes, query execution plans, and optimization techniques. Contains before/after examples showing performance improvements.",
      link: "https://onedrive.live.com/example4",
      lecture: "Lecture 6",
    },
    {
      id: 5,
      title: "NoSQL vs SQL Comparison",
      author: "Lisa Wang",
      date: "Nov 15, 2025",
      rating: 4.4,
      description:
        "Side-by-side comparison of SQL and NoSQL databases, covering use cases, data modeling approaches, and scalability considerations.",
      link: "https://drive.google.com/file/d/example5",
      lecture: "Lecture 10",
    },
    {
      id: 6,
      title: "ACID Properties Deep Dive",
      author: "David Kim",
      date: "Nov 14, 2025",
      rating: 4.7,
      description:
        "In-depth exploration of Atomicity, Consistency, Isolation, and Durability. Includes real-world scenarios and how databases implement these properties.",
      link: "https://www.dropbox.com/s/example6",
      lecture: "Lecture 7",
    },
  ],
}

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
}

export default function DashboardPage() {
  const router = useRouter()
  const [courses, setCourses] = useState<Course[]>([])
  const [availableCourses, setAvailableCourses] = useState<any[]>([])
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [request, setRequest] = useState("")
  const [messages, setMessages] = useState<Record<number, Message[]>>({})
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [notesSearchQuery, setNotesSearchQuery] = useState("")
  const [noteSubmissions, setNoteSubmissions] = useState<Record<number, NoteSubmission[]>>({})
  const [selectedNote, setSelectedNote] = useState<NoteSubmission | null>(null)
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

  const studentProfile = {
    computing_id: "abc2def",
    email: "student@virginia.edu",
    first_name: "Alex",
    middle_name: "Jordan",
    last_name: "Smith",
    student_type: "SDAC Student",
    phone: "+1 (434) 555-0123",
    enrolled_courses: courses.length,
    uploads_count: 12,
    average_rating: 4.6,
  }

  // Load enrolled courses on mount
  useEffect(() => {
    loadEnrolledCourses()
    loadAvailableCourses()
  }, [])

  // Load notes when course is selected
  useEffect(() => {
    if (selectedCourse) {
      loadNotes(selectedCourse.id)
      loadNoteRequests(selectedCourse.id)
    }
  }, [selectedCourse])

  // Debounced search - reload notes when search query changes
  useEffect(() => {
    if (selectedCourse) {
      const timeoutId = setTimeout(() => {
        loadNotes(selectedCourse.id, notesSearchQuery)
      }, 300) // 300ms debounce

      return () => clearTimeout(timeoutId)
    }
  }, [notesSearchQuery, selectedCourse])

  const loadEnrolledCourses = async () => {
    try {
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
        setAvailableCourses(data.courses || [])
      }
    } catch (error) {
      console.error('Error loading available courses:', error)
    }
  }

  const loadNotes = async (courseId: number, searchQuery?: string) => {
    try {
      let url = `/api/notes?course_id=${courseId}`
      if (searchQuery && searchQuery.trim()) {
        url += `&search=${encodeURIComponent(searchQuery.trim())}`
      }
      
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        const formattedNotes = (data.notes || []).map((note: any) => ({
          id: note.note_id,
          title: note.title,
          description: note.description,
          lecture: note.lecture,
          link: note.link,
          author: `${note.author_first_name} ${note.author_last_name}`,
          date: new Date(note.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
          rating: parseFloat(note.average_rating) || 0,
        }))
        setNoteSubmissions((prev) => ({
          ...prev,
          [courseId]: formattedNotes,
        }))
      }
    } catch (error) {
      console.error('Error loading notes:', error)
    }
  }

  const loadNoteRequests = async (courseId: number) => {
    try {
      const response = await fetch(`/api/note-requests?course_id=${courseId}`)
      if (response.ok) {
        const data = await response.json()
        const formattedRequests = (data.requests || []).map((req: any) => ({
          id: req.request_id,
          text: req.request_text,
          timestamp: new Date(req.created_at),
          status: req.status,
        }))
        setMessages((prev) => ({
          ...prev,
          [courseId]: formattedRequests,
        }))
      }
    } catch (error) {
      console.error('Error loading note requests:', error)
    }
  }

  const handleLogout = () => {
    // Clear auth cookie
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
        // Reload enrolled courses
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

  const handleSubmitRequest = async () => {
    if (request.trim() && selectedCourse) {
      try {
        const response = await fetch('/api/note-requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            course_id: selectedCourse.id,
            request_text: request.trim(),
          }),
        })

        if (response.ok) {
          // Reload note requests
          await loadNoteRequests(selectedCourse.id)
          setRequest("")
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
        await loadNoteRequests(selectedCourse.id)
      } else {
        alert('Failed to update request status')
      }
    } catch (error) {
      console.error('Error updating request status:', error)
      alert('Failed to update request status')
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
        await loadNotes(selectedCourse.id)

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

  const filteredAvailableCourses = availableCourses.filter((course: any) => {
    // Filter out courses already enrolled
    const isEnrolled = courses.some((c) => c.id === course.course_id)
    if (isEnrolled) return false

    // Filter by search query
    const matchesSearch =
      course.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.section_id?.toLowerCase().includes(searchQuery.toLowerCase())

    return matchesSearch
  })

  const currentMessages = selectedCourse ? messages[selectedCourse.id] || [] : []
  const currentSubmissions = selectedCourse ? noteSubmissions[selectedCourse.id] || [] : []

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
                  <h2 className="text-sm font-semibold text-foreground">My Courses</h2>
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
                                    [{course.code}] - {course.semester_name || 'Fall 2025'}
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
                </div>
                <div className="space-y-2">
                  {courses.length === 0 ? (
                    <p className="text-xs text-muted-foreground px-3 py-2">No courses yet</p>
                  ) : (
                    courses.map((course) => (
                      <button
                        key={course.id}
                        onClick={() => setSelectedCourse(course)}
                        className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${selectedCourse?.id === course.id
                          ? "bg-neutral-100 text-foreground font-medium"
                          : "text-muted-foreground hover:bg-neutral-50 hover:text-foreground"
                          }`}
                      >
                        <div className="font-medium">{course.name}</div>
                        <div className="text-xs opacity-70">[{course.code}]</div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          </nav>
        </div>

        <div className="p-4 border-t border-neutral-200 space-y-2">
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-sm"
            onClick={() => setIsProfileModalOpen(true)}
          >
            <User className="h-4 w-4" />
            Profile
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-sm text-muted-foreground hover:text-foreground"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 relative">
        <div className="max-w-4xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-1">Fall 2025</h1>
            <p className="text-sm text-muted-foreground">Current Semester</p>
          </div>

          {selectedCourse ? (
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-foreground">Notes for {selectedCourse.name}</h2>
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
                </div>
              </div>

              {currentSubmissions.length > 0 ? (
                <>
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1 max-w-md">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search notes..."
                        value={notesSearchQuery}
                        onChange={(e) => setNotesSearchQuery(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredSubmissions.length > 0 ? (
                      filteredSubmissions.map((submission) => (
                        <div
                          key={submission.id}
                          onClick={() => {
                            setSelectedNote(submission)
                            setIsNoteModalOpen(true)
                          }}
                          className="bg-white border border-neutral-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                        >
                          <h3 className="font-semibold text-foreground mb-2">{submission.title}</h3>
                          <div className="text-xs font-medium text-blue-600 mb-2">{submission.lecture}</div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                            <span>{submission.author}</span>
                            <span>•</span>
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
                      ))
                    ) : (
                      <div className="col-span-2 text-center py-8 text-muted-foreground">
                        No notes found matching "{notesSearchQuery}"
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="bg-white border border-neutral-200 rounded-lg p-6">
                  <p className="text-muted-foreground">
                    No notes available yet for {selectedCourse.name}. Be the first to submit notes!
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
            <h2 className="text-lg font-semibold text-foreground">Live Notes Request for {selectedCourse.name}</h2>
          </div>

          <div className="flex-1 p-6 overflow-y-auto">
            {currentMessages.length === 0 ? (
              <p className="text-sm text-muted-foreground">No requests yet. Submit your first request below.</p>
            ) : (
              <div className="space-y-4">
                {currentMessages.map((message) => (
                  <div key={message.id} className="bg-neutral-50 rounded-lg p-3 border border-neutral-200">
                    <div className="flex items-start justify-between gap-2 mb-2">
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
                    </div>
                    <p className="text-sm text-foreground">{message.text}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 border-t border-neutral-200">
            <div className="relative">
              <Textarea
                placeholder="Type your live notes request..."
                value={request}
                onChange={(e) => setRequest(e.target.value)}
                className="min-h-[80px] resize-none pr-12"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
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
          </div>
        </aside>
      )}

      {/* Note Detail Modal */}
      <Dialog open={isNoteModalOpen} onOpenChange={setIsNoteModalOpen}>
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

              <div className="flex items-center gap-2 pt-2">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-5 w-5 ${i < Math.floor(selectedNote.rating)
                        ? "fill-yellow-400 text-yellow-400"
                        : i < selectedNote.rating
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-neutral-300"
                        }`}
                    />
                  ))}
                </div>
                <span className="text-sm font-medium text-foreground">{selectedNote.rating.toFixed(1)} / 5.0</span>
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
            {/* Personal Information */}
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Name</h4>
                <p className="text-sm text-foreground">
                  {studentProfile.first_name} {studentProfile.middle_name} {studentProfile.last_name}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Computing ID</h4>
                  <p className="text-sm text-foreground">{studentProfile.computing_id}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Student Type</h4>
                  <p className="text-sm text-foreground">{studentProfile.student_type}</p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Email</h4>
                <p className="text-sm text-foreground">{studentProfile.email}</p>
              </div>

              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Phone</h4>
                <p className="text-sm text-foreground">{studentProfile.phone}</p>
              </div>
            </div>

            {/* Statistics */}
            <div className="pt-4 border-t border-neutral-200">
              <h3 className="text-sm font-semibold text-foreground mb-3">Statistics</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-neutral-50 rounded-lg">
                  <div className="text-2xl font-bold text-foreground">{studentProfile.enrolled_courses}</div>
                  <div className="text-xs text-muted-foreground mt-1">Enrolled Courses</div>
                </div>
                <div className="text-center p-3 bg-neutral-50 rounded-lg">
                  <div className="text-2xl font-bold text-foreground">{studentProfile.uploads_count}</div>
                  <div className="text-xs text-muted-foreground mt-1">Uploads</div>
                </div>
                <div className="text-center p-3 bg-neutral-50 rounded-lg">
                  <div className="text-2xl font-bold text-foreground">{studentProfile.average_rating}</div>
                  <div className="text-xs text-muted-foreground mt-1">Avg Rating</div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
