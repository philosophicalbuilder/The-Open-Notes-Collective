"use client"

import { useRouter } from "next/navigation"
import { User, LogOut, Plus, Search, BookOpen, Star, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { useState, useEffect } from "react"
import { formatDate } from "@/lib/utils"
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
import { Textarea } from "@/components/ui/textarea"

type Course = {
  id: number
  name: string
  code: string
  sectionId: string
  description: string
  semester: string
}

type Student = {
  user_id: number
  computing_id: string
  first_name: string
  last_name: string
  email: string
  student_type: string | null
  notes_count: number
}

type NoteSummary = {
  note_id: number
  title: string
  description: string
  lecture: string | null
  author_first_name: string
  author_last_name: string
  created_at: string
  average_rating: number
  rating_count: number
}

type Lecture = {
  lecture_id: number
  course_id: number
  lecture_date: string
  topic: string
  created_at: string
  note_count: number
}

const availableCourses: Course[] = []

export default function InstructorDashboardPage() {
  const router = useRouter()
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [notes, setNotes] = useState<NoteSummary[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [isPublishCourseOpen, setIsPublishCourseOpen] = useState(false)
  const [courseName, setCourseName] = useState("")
  const [courseCode, setCourseCode] = useState("")
  const [sectionId, setSectionId] = useState("")
  const [courseDescription, setCourseDescription] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingStudents, setIsLoadingStudents] = useState(false)
  const [isLoadingNotes, setIsLoadingNotes] = useState(false)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [courseToDelete, setCourseToDelete] = useState<number | null>(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [noteToDelete, setNoteToDelete] = useState<number | null>(null)
  const [isDeleteNoteModalOpen, setIsDeleteNoteModalOpen] = useState(false)
  const [lectures, setLectures] = useState<Lecture[]>([])
  const [isCreateLectureOpen, setIsCreateLectureOpen] = useState(false)
  const [lectureDate, setLectureDate] = useState("")
  const [lectureTopic, setLectureTopic] = useState("")
  const [isLoadingLectures, setIsLoadingLectures] = useState(false)

  useEffect(() => {
    loadCourses()
    loadUserProfile()
  }, [])

  const loadUserProfile = async () => {
    try {
      const response = await fetch('/api/auth/session')
      if (response.ok) {
        const data = await response.json()
        setUserProfile(data.user)
      }
    } catch (error) {
      console.error('Error loading user profile:', error)
    }
  }

  useEffect(() => {
    if (selectedCourse) {
      loadStudents(selectedCourse.id)
      loadNotes(selectedCourse.id)
      loadLectures(selectedCourse.id)
    }
  }, [selectedCourse])

  const loadCourses = async () => {
    try {
      const response = await fetch('/api/courses')
      if (response.ok) {
        const data = await response.json()
        const instructorCourses = (data.courses || []).map((c: any) => ({
          id: c.course_id,
          name: c.name,
          code: c.code,
          sectionId: c.section_id,
          description: c.description,
          semester: c.semester_name || 'Fall 2025',
        }))
        setCourses(instructorCourses)
        if (instructorCourses.length > 0 && !selectedCourse) {
          setSelectedCourse(instructorCourses[0])
        }
      }
    } catch (error) {
      console.error('Error loading courses:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadStudents = async (courseId: number) => {
    setIsLoadingStudents(true)
    try {
      const response = await fetch(`/api/courses/${courseId}/students`)
      if (response.ok) {
        const data = await response.json()
        setStudents(data.students || [])
      }
    } catch (error) {
      console.error('Error loading students:', error)
    } finally {
      setIsLoadingStudents(false)
    }
  }

  const loadNotes = async (courseId: number) => {
    setIsLoadingNotes(true)
    try {
      const response = await fetch(`/api/notes?course_id=${courseId}`)
      if (response.ok) {
        const data = await response.json()
        setNotes(data.notes || [])
      }
    } catch (error) {
      console.error('Error loading notes:', error)
    } finally {
      setIsLoadingNotes(false)
    }
  }

  const loadLectures = async (courseId: number) => {
    setIsLoadingLectures(true)
    try {
      const response = await fetch(`/api/lectures?course_id=${courseId}`)
      if (response.ok) {
        const data = await response.json()
        setLectures(data.lectures || [])
      }
    } catch (error) {
      console.error('Error loading lectures:', error)
    } finally {
      setIsLoadingLectures(false)
    }
  }

  const handleCreateLecture = async () => {
    if (!selectedCourse || !lectureDate || !lectureTopic.trim()) return

    try {
      const response = await fetch('/api/lectures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          course_id: selectedCourse.id,
          lecture_date: lectureDate,
          topic: lectureTopic.trim(),
        }),
      })

      if (response.ok) {
        await loadLectures(selectedCourse.id)
        setLectureDate("")
        setLectureTopic("")
        setIsCreateLectureOpen(false)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to create lecture')
      }
    } catch (error) {
      console.error('Error creating lecture:', error)
      alert('Failed to create lecture')
    }
  }


  const handleLogout = () => {
    // Clear auth cookie
    document.cookie = 'auth-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
    router.push("/")
  }

  const handlePublishCourse = async () => {
    if (courseName.trim() && courseCode.trim() && sectionId.trim() && courseDescription.trim()) {
      try {
        const response = await fetch('/api/courses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: courseName.trim(),
            code: courseCode.trim(),
            section_id: sectionId.trim(),
            description: courseDescription.trim(),
          }),
        })

        if (response.ok) {
          // Reload courses
          await loadCourses()

          // Reset form
          setCourseName("")
          setCourseCode("")
          setSectionId("")
          setCourseDescription("")
          setIsPublishCourseOpen(false)
        } else {
          const error = await response.json()
          alert(error.error || 'Failed to publish course')
        }
      } catch (error) {
        console.error('Error publishing course:', error)
        alert('Failed to publish course')
      }
    }
  }

  const handleDeleteCourse = async (courseId: number, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent selecting the course when clicking delete
    setCourseToDelete(courseId)
    setIsDeleteModalOpen(true)
  }

  const confirmDeleteCourse = async () => {
    if (!courseToDelete) return

    try {
      const response = await fetch(`/api/courses?course_id=${courseToDelete}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        // If the deleted course was selected, clear selection
        if (selectedCourse?.id === courseToDelete) {
          setSelectedCourse(null)
        }
        // Reload courses
        await loadCourses()
        setIsDeleteModalOpen(false)
        setCourseToDelete(null)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to delete course')
      }
    } catch (error) {
      console.error('Error deleting course:', error)
      alert('Failed to delete course')
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
        await loadNotes(selectedCourse.id)
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

  const filteredCourses = courses.filter(
    (course) =>
      course.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.sectionId.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="flex min-h-screen bg-neutral-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 bg-white border-r border-neutral-200 flex flex-col">
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

          <nav className="px-4 pt-6 overflow-y-auto flex-1 min-h-0">
            <div className="space-y-1">
              <div className="px-3 py-2">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-foreground">Courses I Teach</h2>
                  <Dialog open={isPublishCourseOpen} onOpenChange={setIsPublishCourseOpen}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                      <DialogHeader>
                        <DialogTitle>Publish Course</DialogTitle>
                        <DialogDescription>
                          Create a new course for students to enroll in. All fields are required.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="course-name">Course Name</Label>
                          <Input
                            id="course-name"
                            placeholder="e.g., Database Systems"
                            value={courseName}
                            onChange={(e) => setCourseName(e.target.value)}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="course-code">Course Code</Label>
                          <Input
                            id="course-code"
                            placeholder="e.g., CS 3240"
                            value={courseCode}
                            onChange={(e) => setCourseCode(e.target.value)}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="section-id">Section ID</Label>
                          <Input
                            id="section-id"
                            placeholder="e.g., 00114"
                            value={sectionId}
                            onChange={(e) => setSectionId(e.target.value)}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="course-description">Description</Label>
                          <Textarea
                            id="course-description"
                            placeholder="Describe the course content, topics covered, prerequisites..."
                            value={courseDescription}
                            onChange={(e) => setCourseDescription(e.target.value)}
                            className="min-h-[100px] resize-none"
                          />
                        </div>

                        <Button
                          onClick={handlePublishCourse}
                          disabled={!courseName.trim() || !courseCode.trim() || !sectionId.trim() || !courseDescription.trim()}
                          className="w-full"
                        >
                          Publish Course
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                <div className="space-y-2">
                  {courses.length === 0 ? (
                    <p className="text-xs text-muted-foreground px-3 py-2">No courses published yet</p>
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
                          <div className="font-medium truncate">{course.name}</div>
                          <div className="text-xs opacity-70 truncate">[{course.code}]</div>
                        </button>
                        <button
                          onClick={(e) => handleDeleteCourse(course.id, e)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-neutral-200 rounded text-muted-foreground hover:text-foreground"
                          title="Delete course"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
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
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-1">Fall 2025</h1>
            <p className="text-sm text-muted-foreground">Current Semester</p>
          </div>

          {selectedCourse ? (
            <div className="space-y-6">
              <div className="bg-white border border-neutral-200 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-foreground mb-4">{selectedCourse.name}</h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Section ID</h3>
                    <p className="text-sm text-foreground">{selectedCourse.code}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Description</h3>
                    <p className="text-sm text-foreground">{selectedCourse.description}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Semester</h3>
                    <p className="text-sm text-foreground">{selectedCourse.semester}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-neutral-200 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-foreground mb-4">Enrolled Students</h2>
                {isLoadingStudents ? (
                  <p className="text-sm text-muted-foreground">Loading students...</p>
                ) : students.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No students enrolled yet</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-neutral-200">
                          <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Name</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Computing ID</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Email</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Student Type</th>
                          <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Notes Published</th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.map((student) => (
                          <tr key={student.user_id} className="border-b border-neutral-100 hover:bg-neutral-50">
                            <td className="py-3 px-4 text-sm text-foreground">
                              {student.first_name} {student.last_name}
                            </td>
                            <td className="py-3 px-4 text-sm text-foreground">{student.computing_id}</td>
                            <td className="py-3 px-4 text-sm text-foreground">{student.email}</td>
                            <td className="py-3 px-4 text-sm text-foreground">
                              {student.student_type || 'N/A'}
                            </td>
                            <td className="py-3 px-4 text-sm text-foreground text-right font-medium">
                              {student.notes_count}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="bg-white border border-neutral-200 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-foreground">Lectures</h2>
                  <Dialog open={isCreateLectureOpen} onOpenChange={setIsCreateLectureOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="gap-2">
                        <Plus className="h-4 w-4" />
                        Add Lecture
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                      <DialogHeader>
                        <DialogTitle>Create Lecture</DialogTitle>
                        <DialogDescription>
                          Add a lecture schedule for this course. Students will see these when viewing the course.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="lecture-date">Lecture Date</Label>
                          <Input
                            id="lecture-date"
                            type="date"
                            value={lectureDate}
                            onChange={(e) => setLectureDate(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lecture-topic">Topic</Label>
                          <Input
                            id="lecture-topic"
                            placeholder="e.g., Introduction to SQL"
                            value={lectureTopic}
                            onChange={(e) => setLectureTopic(e.target.value)}
                          />
                        </div>
                        <Button
                          onClick={handleCreateLecture}
                          disabled={!lectureDate || !lectureTopic.trim()}
                          className="w-full"
                        >
                          Create Lecture
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                {isLoadingLectures ? (
                  <p className="text-sm text-muted-foreground">Loading lectures...</p>
                ) : lectures.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No lectures scheduled yet</p>
                ) : (
                  <div className="space-y-3">
                    {lectures.map((lecture) => (
                      <div
                        key={lecture.lecture_id}
                        className="border border-neutral-200 rounded-lg p-4"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-sm font-medium text-foreground">
                                {new Date(lecture.lecture_date).toLocaleDateString('en-US', {
                                  weekday: 'short',
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </p>
                            </div>
                            <p className="text-sm text-muted-foreground">{lecture.topic}</p>
                            <p className="text-xs text-muted-foreground mt-2">
                              {lecture.note_count} {lecture.note_count === 1 ? 'note' : 'notes'} uploaded
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          ) : (
            <div className="bg-white border border-neutral-200 rounded-lg p-6">
              <div className="text-center space-y-4">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto" />
                <div>
                  <p className="text-muted-foreground mb-2">Welcome to your instructor dashboard</p>
                  <p className="text-sm text-muted-foreground">
                    Publish your first course to get started. Students will be able to find and enroll in your courses.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Right Sidebar - Notes Uploaded */}
      {selectedCourse && (
        <aside className="w-80 flex-shrink-0 bg-white border-l border-neutral-200 flex flex-col">
          <div className="p-6 border-b border-neutral-200">
            <h2 className="text-lg font-semibold text-foreground">Notes Uploaded</h2>
          </div>

          <div className="flex-1 p-6 overflow-y-auto">
            {isLoadingNotes ? (
              <p className="text-sm text-muted-foreground">Loading notes...</p>
            ) : notes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No notes uploaded yet</p>
            ) : (
              <div className="space-y-4">
                {notes.map((note) => (
                  <div
                    key={note.note_id}
                    className="group relative border border-neutral-200 rounded-lg p-4 hover:bg-neutral-50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground mb-1 text-sm">{note.title}</h3>
                        {note.lecture && (
                          <p className="text-xs font-medium text-blue-600 mb-2">{note.lecture}</p>
                        )}
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                          {note.description}
                        </p>
                      </div>
                      <button
                        onClick={(e) => handleDeleteNote(note.note_id, e)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-neutral-200 rounded text-muted-foreground hover:text-foreground ml-2"
                        title="Delete note"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex flex-col gap-1">
                        <span>
                          By {note.author_first_name} {note.author_last_name}
                        </span>
                        <span>
                          {formatDate(note.created_at)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <span className="font-medium text-foreground">
                          {note.average_rating.toFixed(1)}
                        </span>
                        <span className="text-muted-foreground">
                          ({note.rating_count} {note.rating_count === 1 ? 'rating' : 'ratings'})
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      )}

      {/* Profile Modal */}
      <Dialog open={isProfileModalOpen} onOpenChange={setIsProfileModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Instructor Profile</DialogTitle>
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
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">Role</h4>
                      <p className="text-sm text-foreground">Instructor</p>
                    </div>
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
                <div className="pt-4 border-t border-neutral-200">
                  <h3 className="text-sm font-semibold text-foreground mb-3">Statistics</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="text-center p-3 bg-neutral-50 rounded-lg">
                      <div className="text-2xl font-bold text-foreground">{courses.length}</div>
                      <div className="text-xs text-muted-foreground mt-1">Courses Published</div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Loading profile...</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Course Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete Course</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this course? This will remove it from all enrolled students and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteModalOpen(false)
                setCourseToDelete(null)
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteCourse}
            >
              Delete
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
    </div>
  )
}

